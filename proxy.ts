import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COUNTRY_COOKIE, MARKETS } from './config/market'

const locales = ['fr', 'ar']
const defaultLocale = 'fr'

/**
 * Headers set by hosting/CDN providers that carry the visitor's country.
 * Read in order; the first present one wins. No external lookup is performed,
 * so this adds no network call and leaks nothing to a third party.
 */
const COUNTRY_HEADERS = [
  'x-vercel-ip-country',   // Vercel
  'cf-ipcountry',          // Cloudflare
  'x-country-code',        // generic / Render
  'x-geo-country',         // generic
]

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

  // ── API ROUTES: excluded from matcher (see config below) ────────────────────
  // API proxying is handled by app/api/[...path]/route.ts (catch-all proxy).
  // The middleware MUST NOT run for /api/* routes because:
  //   1. Even NextResponse.next() can interfere with Set-Cookie header delivery
  //      in Next.js 16 — the middleware framework layer may re-serialize headers.
  //   2. Running middleware for API routes adds unnecessary latency.
  // The matcher config below excludes /api/* entirely.

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
    // EXCLUDE API routes — the catch-all route handler (app/api/[...path]/route.ts)
    // proxies to the backend and forwards Set-Cookie headers individually.
    // Running middleware for API routes caused cookies to never be stored in the
    // browser, which made "Mon compte" / "Mes commandes" always redirect to login.
    '/((?!_next/static|_next/image|api/|favicon.ico|icon.jpg|logo.jpg|hero.webp|.*\\..*|_next).*)',
  ],
}