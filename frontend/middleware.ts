import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware to proxy /api/* requests to the backend when called cross-origin.
 *
 * Problem: Modern browsers block third-party cookies (SameSite=None is not enough).
 * The storefront (vercel.app) sets auth cookies that need to be sent to the backend (onrender.com).
 * But cross-origin cookies are blocked by Chrome/Firefox/Safari.
 *
 * Solution: Proxy API requests through the same origin. The browser sends cookies
 * as first-party, then the middleware forwards the request to the backend.
 *
 * IMPORTANT: This middleware skips requests that already come from the backend
 * (e.g. server-side rendering) and skips our own Next.js API routes (/api/cron/*).
 */
const BACKEND_URL = process.env.NEXT_BACKEND_URL || 'https://techgreen-store.onrender.com'

// API routes that belong to the storefront (NOT proxied)
const LOCAL_API_PREFIXES = ['/api/cron/', '/api/revalidate', '/api/contact']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only proxy /api/* requests
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Skip our own Next.js API routes
  if (LOCAL_API_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // Skip if already a backend request (e.g. server-side fetch from middleware context)
  // Check for internal header set by server-side code
  if (request.headers.get('x-internal-request') === 'true') {
    return NextResponse.next()
  }

  // Build the backend URL
  const backendUrl = new URL(pathname, BACKEND_URL)
  // Preserve query string
  backendUrl.search = request.nextUrl.search

  // Forward the request to the backend
  const headers = new Headers(request.headers)
  // Remove Vercel/Next.js internal headers that might confuse the backend
  headers.delete('x-forwarded-for')
  headers.delete('x-forwarded-host')
  headers.delete('x-forwarded-proto')
  headers.delete('host')

  // Rewrite the request to the backend (server-side, no CORS issues)
  return NextResponse.rewrite(backendUrl, { request: { headers } })
}

export const config = {
  matcher: '/api/:path*',
}
