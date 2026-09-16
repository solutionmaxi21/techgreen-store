/**
 * Catch-all API proxy route.
 *
 * This route catches ALL /api/* requests that don't have a more specific
 * route handler (e.g. /api/contact, /api/cron/keep-alive).
 * It forwards them to the backend server, making auth cookies first-party
 * (same domain) and bypassing the third-party cookie blocking issue.
 *
 * Next.js App Router priority: specific routes always win over catch-alls.
 *   /api/contact      → app/api/contact/route.ts  (specific)
 *   /api/cron/keep-alive → app/api/cron/keep-alive/route.ts  (specific)
 *   /api/auth/me       → THIS catch-all → proxied to backend
 *   /api/products      → THIS catch-all → proxied to backend
 */

import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_BACKEND_URL || 'https://techgreen-store.onrender.com'

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathname = `/api/${path.join('/')}`

  // Build the backend URL
  const backendUrl = new URL(pathname, BACKEND_URL)
  backendUrl.search = request.nextUrl.search

  // Build headers to forward
  const headers = new Headers(request.headers)

  // Remove Vercel/Next.js internal headers that might confuse the backend
  headers.delete('x-forwarded-for')
  headers.delete('x-forwarded-host')
  headers.delete('x-forwarded-proto')
  headers.delete('host')

  // Get the request body (if any)
  let body: BodyInit | undefined
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.arrayBuffer()
  }

  // Forward the request to the backend
  const response = await fetch(backendUrl.toString(), {
    method: request.method,
    headers,
    body,
    redirect: 'manual',
  })

  // Read the response body
  const responseBody = await response.arrayBuffer()

  // CRITICAL: Forward Set-Cookie headers individually.
  // The standard Headers API combines multiple Set-Cookie values with commas,
  // which breaks cookie parsing. getSetCookie() returns them as separate strings.
  const setCookies = response.headers.getSetCookie?.() ?? []
  const nextResponse = new NextResponse(responseBody, {
    status: response.status,
    statusText: response.statusText,
  })

  // Copy all headers EXCEPT Set-Cookie (we handle that separately)
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') {
      // Skip problematic headers
      if (key.toLowerCase() === 'transfer-encoding' || key.toLowerCase() === 'connection') return
      nextResponse.headers.set(key, value)
    }
  })

  // Add each Set-Cookie header individually so the browser can parse them
  for (const cookie of setCookies) {
    nextResponse.headers.append('Set-Cookie', cookie)
  }

  return nextResponse
}

// Export the proxy for all HTTP methods
export const GET = proxyRequest
export const POST = proxyRequest
export const PUT = proxyRequest
export const DELETE = proxyRequest
export const PATCH = proxyRequest
export const HEAD = proxyRequest
export const OPTIONS = proxyRequest
