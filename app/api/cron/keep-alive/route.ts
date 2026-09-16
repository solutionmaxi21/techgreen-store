import { NextRequest, NextResponse } from 'next/server'

// Keep-alive endpoint for Render backend
// Prevents the free tier service from sleeping due to inactivity.
// Setup: Add to vercel.json as a cron job (schedule: "*/10 * * * *")
export async function GET(request: NextRequest) {
  // Verify this is a cron request (Vercel sends x-vercel-cron header)
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isAuthorized =
    isVercelCron ||
    request.nextUrl.searchParams.get('secret') === process.env.CRON_SECRET

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://techgreen-store.onrender.com'
  const healthUrl = `${backendUrl}/api/health`

  try {
    const startTime = Date.now()
    const response = await fetch(healthUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(30000), // 30s timeout for cold starts
    })
    const latency = Date.now() - startTime

    const data = await response.json().catch(() => ({}))

    return NextResponse.json({
      success: true,
      backend: {
        status: response.status,
        latency: `${latency}ms`,
        healthy: response.ok,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    // Backend might be starting up — this is expected during cold start
    return NextResponse.json({
      success: false,
      backend: {
        status: 'unreachable',
        message: error instanceof Error ? error.message : 'Connection failed',
      },
      timestamp: new Date().toISOString(),
    })
  }
}
