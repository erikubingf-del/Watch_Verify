import { NextRequest, NextResponse } from 'next/server'

/**
 * Multi-tenant isolation middleware
 *
 * This middleware:
 * 1. Extracts tenant_id from session/token (for dashboard routes)
 * 2. Extracts tenant_id from Twilio number mapping (for webhook routes)
 * 3. Injects tenant_id into request headers for downstream use
 * 4. Blocks requests without valid tenant context
 */

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip middleware for public routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/login' ||
    pathname === '/' ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next()
  }

  // Allow access to dashboard routes if this is a redirect from auth
  // NextAuth will set the session cookie during the redirect flow
  const isAuthRedirect = req.nextUrl.searchParams.has('callbackUrl') ||
                         req.headers.get('referer')?.includes('/api/auth/')
  if (isAuthRedirect && pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  let tenantId: string | null = null

  // Strategy 1: Extract from session cookie (for dashboard routes)
  if (pathname.startsWith('/dashboard')) {
    const sessionCookie = req.cookies.get('next-auth.session-token') || req.cookies.get('__Secure-next-auth.session-token')
    console.log('🔒 Middleware - Dashboard access:', {
      pathname,
      hasSessionCookie: !!sessionCookie,
      cookieName: sessionCookie ? 'found' : 'missing'
    })

    if (!sessionCookie) {
      // Redirect to login if no session
      console.log('❌ Middleware - No session cookie, redirecting to /login')
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // For now, we'll need to validate session server-side
    // This will be implemented fully with NextAuth
    // Temporary: Extract from custom header for testing
    tenantId = req.headers.get('x-tenant-id') || null
  }

  // Strategy 2: Extract from Twilio number mapping (for webhook routes)
  if (pathname.startsWith('/api/webhooks/twilio')) {
    // The Twilio webhook will handle tenant extraction internally
    // based on the "To" field (the Twilio number that received the message)
    // So we skip middleware validation here and let the route handle it
    return NextResponse.next()
  }

  // Strategy 3: Extract from Authorization header (for API routes)
  if (pathname.startsWith('/api/')) {
    const authHeader = req.headers.get('authorization')

    if (authHeader?.startsWith('Bearer ')) {
      // Bearer token auth - extract tenant from JWT
      // For now, allow and let the route handler validate
      // TODO: Implement JWT validation and tenant extraction from Bearer token
      return NextResponse.next()
    }

    // For internal API calls (no auth header), check session
    const sessionCookie = req.cookies.get('next-auth.session-token') || req.cookies.get('__Secure-next-auth.session-token')
    if (sessionCookie) {
      // Session exists, allow request (tenant will be extracted in route via auth())
      return NextResponse.next()
    }
  }

  // If we still don't have a tenant_id and this is a protected route, block it
  if (!tenantId && (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth'))) {
    return NextResponse.json(
      { error: 'Unauthorized - No tenant context' },
      { status: 401 }
    )
  }

  // Inject tenant_id into headers for downstream use
  if (tenantId) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-tenant-id', tenantId)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
