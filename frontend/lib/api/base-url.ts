export function getApiBaseUrl(): string {
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'
  const internalApiUrl = process.env.NEXT_INTERNAL_API_URL || 'http://backend:3001/api'

  // Server-side: use the direct backend URL (bypasses proxy)
  if (typeof window === 'undefined') {
    return internalApiUrl
  }

  // ── Client-side: ALWAYS use same-origin '/api' proxy for non-localhost ──────
  // This is critical for cookie-based auth. When the browser is NOT on localhost,
  // all API requests MUST go through the same origin (/api/...) so that:
  //   1. Set-Cookie headers from the backend are first-party (not blocked)
  //   2. Cookies are sent automatically with same-origin requests
  //   3. No CORS or third-party cookie issues
  //
  // Without this, requests go directly to the backend URL (e.g. Render),
  // making cookies third-party. Modern browsers block third-party cookies,
  // so accessToken/refreshToken are never stored → auth always fails.
  const hostname = window.location.hostname
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'

  if (!isLocalhost) {
    // Production (Vercel, custom domain, etc.): always use same-origin proxy
    return '/api'
  }

  // ── Localhost development: use configured URL or LAN fallback ──────────────
  try {
    const configured = new URL(publicApiUrl)
    const isConfiguredLocalhost = configured.hostname === 'localhost' || configured.hostname === '127.0.0.1'

    if (isConfiguredLocalhost) {
      // Both env and browser are localhost: use the configured URL directly
      return publicApiUrl
    }

    // Env points to a remote server but browser is on localhost (LAN access)
    // Use the browser's host with port 3001 (backend Docker port)
    return `${window.location.protocol}//${hostname}:3001/api`
  } catch {
    // URL parsing failed: return the raw value
    return publicApiUrl
  }
}

export function getPublicApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
}
