import { Ratelimit, type Duration } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Rate limiting utilities using Upstash Redis
 * Prevents API abuse and controls costs
 */

// Initialize Redis client (only if credentials are provided)
let redis: Redis | null = null
let ratelimiters: Map<string, Ratelimit> = new Map()

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

/**
 * Get or create a rate limiter with specific limits
 */
function getRateLimiter(key: string, requests: number, window: Duration): Ratelimit | null {
  if (!redis) {
    console.warn('Redis not configured - rate limiting disabled')
    return null
  }

  if (!ratelimiters.has(key)) {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
      analytics: true,
      prefix: `ratelimit:${key}`,
    })
    ratelimiters.set(key, limiter)
  }

  return ratelimiters.get(key)!
}

/**
 * Rate limit configuration presets
 */
export const RateLimitPresets = {
  // AI endpoints: 10 requests per minute per IP
  AI_ENDPOINT: { requests: 10, window: '1 m' as const },

  // Webhook endpoints: 30 requests per minute per phone number
  WEBHOOK: { requests: 30, window: '1 m' as const },

  // Export endpoints: 5 requests per minute per user
  EXPORT: { requests: 5, window: '1 m' as const },

  // General API: 60 requests per minute per IP
  API: { requests: 60, window: '1 m' as const },

  // Auth: 5 login attempts per 15 minutes
  AUTH: { requests: 5, window: '15 m' as const },
}

/**
 * Apply rate limit check
 * Returns { success: true } if allowed, { success: false, ... } if rate limited
 */
export async function checkRateLimit(
  identifier: string,
  preset: keyof typeof RateLimitPresets
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  const config = RateLimitPresets[preset]
  const limiter = getRateLimiter(preset, config.requests, config.window)

  if (!limiter) {
    // If Redis is not configured, allow all requests (dev mode)
    return { success: true }
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    return {
      success,
      limit,
      remaining,
      reset,
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // On error, fail open (allow request) to prevent blocking legitimate traffic
    return { success: true }
  }
}

/**
 * Get identifier from request (IP address or user ID)
 */
export function getIdentifier(req: Request, fallback?: string): string {
  // Try to get IP from various headers (Vercel, Cloudflare, etc.)
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfConnectingIp = req.headers.get('cf-connecting-ip')

  const ip = cfConnectingIp || realIp || forwarded?.split(',')[0] || fallback || 'unknown'

  return ip.trim()
}

/**
 * Middleware helper for rate limiting
 * Returns a NextResponse with 429 status if rate limited
 */
export async function rateLimitMiddleware(
  req: Request,
  preset: keyof typeof RateLimitPresets,
  identifier?: string
): Promise<Response | null> {
  const id = identifier || getIdentifier(req)
  const result = await checkRateLimit(id, preset)

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        limit: result.limit,
        remaining: 0,
        reset: result.reset,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(result.limit || 0),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.reset || 0),
          'Retry-After': String(Math.ceil((result.reset || Date.now()) / 1000)),
        },
      }
    )
  }

  return null
}

/**
 * Add rate limit headers to successful response
 */
export function addRateLimitHeaders(
  response: Response,
  limit?: number,
  remaining?: number,
  reset?: number
): Response {
  if (limit !== undefined) {
    const headers = new Headers(response.headers)
    headers.set('X-RateLimit-Limit', String(limit))
    headers.set('X-RateLimit-Remaining', String(remaining || 0))
    headers.set('X-RateLimit-Reset', String(reset || 0))

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }

  return response
}
