export function getApiBaseUrl(): string {
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'
  const internalApiUrl = process.env.NEXT_INTERNAL_API_URL || 'http://backend:3001/api'

  if (typeof window === 'undefined') {
    return internalApiUrl
  }

  // Local no-Docker fallback: if env points to localhost but app is opened from a LAN/public host,
  // use the current browser hostname and backend default port.
  try {
    const configured = new URL(publicApiUrl)
    const currentHost = window.location.hostname
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
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
}
