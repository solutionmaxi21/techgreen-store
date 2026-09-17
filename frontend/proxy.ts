import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

  // ── API ROUTES: Pass through to route handlers ─────────────────────────────
  // API proxying is handled by app/api/[...path]/route.ts (catch-all proxy)
  // which uses getSetCookie() to forward Set-Cookie headers INDIVIDUALLY.
  //
  // WHY NOT NextResponse.rewrite()?
  // The JavaScript Headers API combines multiple Set-Cookie values with commas
  // into a single string. Browsers cannot parse this combined value, so NO
  // cookies are stored. This caused auth to fail: login returned success (JSON
  // body was forwarded correctly) but accessToken/refreshToken cookies were
  // never stored → proxy.ts middleware saw no cookies → redirected to /login.
  //
  // The catch-all route handler reads cookies via response.headers.getSetCookie()
  // and appends each one separately with headers.append('Set-Cookie', cookie).
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
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