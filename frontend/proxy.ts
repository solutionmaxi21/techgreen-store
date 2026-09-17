import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const locales = ['fr', 'ar']
const defaultLocale = 'fr'

// ─── Backend proxy for /api/* routes ──────────────────────────────────────────
// Modern browsers block third-party cookies. Proxying through same-origin
// makes cookies first-party, fixing auth on Chrome/Firefox/Safari.
const BACKEND_URL = process.env.NEXT_BACKEND_URL || 'https://techgreen-store.onrender.com'

// Local Next.js API routes (not proxied)
const LOCAL_API_PREFIXES = ['/api/cron/', '/api/revalidate', '/api/contact']

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

  // ── PROXY /api/* TO BACKEND ───────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    // Skip local Next.js API routes
    if (LOCAL_API_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
      return NextResponse.next()
    }

    // Rewrite to backend — handled at infrastructure level, no body issues
    const backendUrl = new URL(pathname, BACKEND_URL)
    backendUrl.search = request.nextUrl.search
    return NextResponse.rewrite(backendUrl)
  }

  // ── 1. HANDLE LOCALE REDIRECT ─────────────────────────────────────────────
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (!pathnameHasLocale) {
    const locale = getLocale(request)
    request.nextUrl.pathname = `/${locale}${pathname}`
    return NextResponse.redirect(request.nextUrl)
  }

  // ── 2. HANDLE AUTH REDIRECTS ───────────────────────────────────────────────
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
    // API routes — proxied to backend
    '/api/:path*',
    // All other routes — locale/auth handling
    '/((?!_next/static|_next/image|favicon.ico|icon.jpg|logo.jpg|hero.webp|.*\\..*|_next).*)',
  ],
}