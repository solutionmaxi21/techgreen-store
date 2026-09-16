export function getApiBaseUrl(): string {
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'
  const internalApiUrl = process.env.NEXT_INTERNAL_API_URL || 'http://backend:3001/api'

  // Server-side: use the direct backend URL (bypasses proxy)
  if (typeof window === 'undefined') {
    return internalApiUrl
  }

  // Client-side: if the public URL is a full cross-origin URL,
  // use a relative '/api' path instead so Next.js rewrites proxy it
  // through the same origin. This makes auth cookies first-party,
  // fixing the third-party cookie blocking in modern browsers.
  try {
    const configured = new URL(publicApiUrl)
    const currentHost = window.location.hostname

    // Cross-origin: switch to same-origin proxy path
    if (configured.hostname !== currentHost && configured.hostname !== 'localhost') {
      return '/api'
    }

    // Local no-Docker fallback: if env points to localhost but app is opened from a LAN/public host
    const isConfiguredLocalhost = configured.hostname === 'localhost' || configured.hostname === '127.0.0.1'
    const isBrowserLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost === '::1'

    if (isConfiguredLocalhost && !isBrowserLocalhost) {
      return `${window.location.protocol}//${currentHost}:3001/api`
    }
  } catch {
    // Keep configured value if parsing fails
  }

  return publicApiUrl
}

export function getPublicApiBaseUrl(): string {
  // Always return the backend URL — used for image/upload paths that must come from backend
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
}
