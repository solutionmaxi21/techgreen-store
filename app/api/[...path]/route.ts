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

  const backendUrl = new URL(pathname, BACKEND_URL)
  backendUrl.search = request.nextUrl.search

  // Build headers — forward everything from the client
  const headers = new Headers(request.headers)
  headers.delete('x-forwarded-for')
  headers.delete('x-forwarded-host')
  headers.delete('x-forwarded-proto')
  headers.delete('host')
  // Tell backend NOT to compress — Node.js fetch() auto-decompresses the body
  // via arrayBuffer(), but the Content-Encoding header would still be forwarded
  // to the client, causing ERR_CONTENT_DECODING_FAILED (browser tries to
  // decompress an already-decompressed body).
  headers.delete('accept-encoding')
  headers.set('accept-encoding', 'identity')

  let body: BodyInit | undefined
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.arrayBuffer()
  }

  // Forward to backend
  const response = await fetch(backendUrl.toString(), {
    method: request.method,
    headers,
    body,
    redirect: 'manual',
  })

  // Collect Set-Cookie BEFORE consuming the body
  const setCookieHeader = response.headers.getSetCookie?.()

  // Forward all response headers to the client
  const responseHeaders = new Headers()

  // Copy response headers, handling Set-Cookie specially
  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (lower === 'transfer-encoding' || lower === 'connection') return
    // Skip Set-Cookie — we handle it below to preserve individual cookies
    if (lower === 'set-cookie') return
    // Skip content-encoding: Node.js fetch() auto-decompresses the body via
    // arrayBuffer(). Forwarding this header causes ERR_CONTENT_DECODING_FAILED
    // because the browser tries to decompress an already-decompressed body.
    if (lower === 'content-encoding') return
    // Skip content-length: body size may change after decompression
    if (lower === 'content-length') return
    responseHeaders.set(key, value)
  })

  // Read the body AFTER headers
  const responseBody = await response.arrayBuffer()

  // Create the response
  const nextResponse = new NextResponse(responseBody, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })

  // Add each Set-Cookie individually to avoid comma-joining
  if (setCookieHeader && setCookieHeader.length > 0) {
    for (const cookie of setCookieHeader) {
      nextResponse.headers.append('Set-Cookie', cookie)
    }
  } else {
    // Fallback: Headers.get('set-cookie') joins multiple cookies with ', '.
    // Split back at cookie boundaries: a comma followed by 'name=' pattern.
    // Previous regex (?<=^|;\s*),(?=\s*\w+=) FAILED because the comma between
    // cookies is preceded by 'None' (from SameSite=None), not by ';'.
    // Fixed regex: split on ', ' where next token is word+= (new cookie name).
    const cookies = response.headers.get('set-cookie')
    if (cookies) {
      const parts = cookies.split(/,\s*(?=\w+=)/)
      for (const part of parts) {
        nextResponse.headers.append('Set-Cookie', part.trim())
      }
    }
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
