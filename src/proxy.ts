import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // CSRF protection for mutating requests to API routes
  if (pathname.startsWith('/api/') && MUTATING_METHODS.has(request.method)) {
    // Skip CSRF check for server-to-server calls authenticated with CRON_SECRET
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`

    if (!isCronCall) {
      const origin = request.headers.get('origin')
      const host = request.headers.get('host')

      if (!origin || !host) {
        return Response.json(
          { error: 'Forbidden: missing origin or host header' },
          { status: 403 }
        )
      }

      // Parse the origin to extract the hostname (and port if present)
      let originHost: string
      try {
        const url = new URL(origin)
        originHost = url.host // includes port if non-default
      } catch {
        return Response.json(
          { error: 'Forbidden: invalid origin header' },
          { status: 403 }
        )
      }

      if (originHost !== host) {
        return Response.json(
          { error: 'Forbidden: origin mismatch' },
          { status: 403 }
        )
      }
    }
  }

  // Continue with security headers on all responses
  const response = NextResponse.next()

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
