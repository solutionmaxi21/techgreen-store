import { NextRequest, NextResponse } from 'next/server'

// Keep-alive endpoint for Render backend
// Prevents the free tier service from sleeping due to inactivity.
// Triggered by Vercel cron (vercel.json) every 10 minutes.
export async function GET(request: NextRequest) {
  const BACKEND_URL = process.env.NEXT_BACKEND_URL || 'https://techgreen-store.onrender.com'

  try {
    const startTime = Date.now()
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    })
    const latency = Date.now() - startTime

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
