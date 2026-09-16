import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─── Backend proxy configuration ──────────────────────────────────────────────
// Modern browsers block third-party cookies. By proxying /api/* through the same
// origin, cookies become first-party and auth works reliably.
const BACKEND_URL = process.env.NEXT_BACKEND_URL || 'https://techgreen-store.onrender.com'

// API routes that belong to the storefront (NOT proxied to backend)
const LOCAL_API_PREFIXES = ['/api/cron/', '/api/revalidate', '/api/contact']

// ─── Locale & auth configuration ──────────────────────────────────────────────
const locales = ['fr', 'ar']
const defaultLocale = 'fr'

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/account',
  '/checkout',
  '/orders',
  '/order-success'
]

const AUTH_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password'
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. PROXY /api/* TO BACKEND ────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    // Skip local Next.js API routes
    if (LOCAL_API_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
      return NextResponse.next()
    }

    // Build the backend URL and forward the request
    const backendUrl = new URL(pathname, BACKEND_URL)
    backendUrl.search = request.nextUrl.search

    const headers = new Headers(request.headers)
    // Remove Vercel/Next.js internal headers
    headers.delete('x-forwarded-for')
    headers.delete('x-forwarded-host')
    headers.delete('x-forwarded-proto')
    headers.delete('host')

    // Rewrite to backend — server-side, no CORS issues, cookies are first-party
    return NextResponse.rewrite(backendUrl, { request: { headers } })
  }

  // ── 2. HANDLE LOCALE REDIRECT ─────────────────────────────────────────────
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (!pathnameHasLocale) {
    const locale = getLocale(request)
    request.nextUrl.pathname = `/${locale}${pathname}`
    return NextResponse.redirect(request.nextUrl)
  }

  // ── 3. HANDLE AUTH REDIRECTS ───────────────────────────────────────────────
  const locale = pathname.split('/')[1]
  const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/'
  const hasAccessToken = request.cookies.has('accessToken')
  const hasRefreshToken = request.cookies.has('refreshToken')
  const hasAnyAuthToken = hasAccessToken || hasRefreshToken

  const isProtectedRoute = PROTECTED_ROUTES.some(route =>
    pathWithoutLocale.startsWith(route)
  )

  // If protected route and NO cookies at all, redirect to login
  if (isProtectedRoute && !hasAnyAuthToken) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
  }

  const isAuthRoute = AUTH_ROUTES.some(route =>
    pathWithoutLocale.startsWith(route)
  )

  // If auth route and user has a valid access token, redirect to account
  if (isAuthRoute && hasAccessToken) {
    return NextResponse.redirect(new URL(`/${locale}/account`, request.url))
  }

  return NextResponse.next()
}

function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale && locales.includes(cookieLocale)) return cookieLocale

  const acceptLanguage = request.headers.get('accept-language')
  if (acceptLanguage) {
    const languages = acceptLanguage.split(',').map(lang => {
      const [code] = lang.split(';')
      return code.trim().split('-')[0]
    })
    for (const lang of languages) {
      if (locales.includes(lang)) return lang
    }
  }
  return defaultLocale
}

export const config = {
  matcher: [
    // Match API routes for backend proxy
    '/api/:path*',
    // Match all non-static pages for locale/auth handling
    '/((?!_next/static|_next/image|favicon.ico|icon.jpg|logo.jpg|hero.webp|.*\\..*|_next).*)',
  ],
}