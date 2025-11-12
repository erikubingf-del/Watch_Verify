/**
 * Environment configuration with runtime validation
 * Ensures all required environment variables are present
 */

const requiredEnvVars = [
  'AIRTABLE_BASE_ID',
  'AIRTABLE_API_KEY',
  'OPENAI_API_KEY',
  'NEXTAUTH_SECRET',
] as const

const optionalEnvVars = [
  'OPENAI_CHAT_MODEL',
  'OPENAI_EMBEDDING_MODEL',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'MAKE_WEBHOOK_ALERT',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NEXTAUTH_URL',
  'NODE_ENV',
] as const

type EnvVar = typeof requiredEnvVars[number] | typeof optionalEnvVars[number]

/**
 * Validates that all required environment variables are present
 * Call this at app startup to fail fast if config is missing
 */
export function validateEnv() {
  const missing: string[] = []

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}\n\nPlease check your .env.local file.`
    )
  }
}

/**
 * Get environment variable with type safety
 */
export function getEnv(key: EnvVar, fallback?: string): string {
  const value = process.env[key]
  if (!value && !fallback) {
    if (requiredEnvVars.includes(key as any)) {
      throw new Error(`Required environment variable ${key} is not set`)
    }
    return ''
  }
  return value || fallback || ''
}

/**
 * Check if app is running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Check if app is running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Get base URL for the application
 */
export function getBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}

// Validate environment on module load (only in production)
if (isProduction()) {
  try {
    validateEnv()
  } catch (error) {
    console.error('Environment validation failed:', error)
  }
}
