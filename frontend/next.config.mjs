import withPWA from '@ducanh2912/next-pwa'

const isVercel = !!process.env.VERCEL

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Acknowledge PWA uses webpack config (Turbopack migration in progress)
  // On Vercel, standalone is not needed (Vercel has its own output format)
  output: isVercel ? undefined : 'standalone',
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ API PROXY: Route /api/* requests through Next.js to avoid cross-origin cookie issues
  // This makes cookies first-party (same domain), fixing auth on modern browsers.
  // afterFiles phase: Next.js checks filesystem routes first (e.g. /api/cron/*),
  // then falls through to these rewrites for non-matching /api/* paths.
  async rewrites() {
    // Backend URL for proxying — use dedicated env var to avoid circular reference
    const backendBase = process.env.NEXT_BACKEND_URL || 'https://techgreen-store.onrender.com'
    // Only proxy when the backend is a full URL (cross-origin)
    if (!backendBase.startsWith('http')) return []
    return {
      afterFiles: [
        {
          source: '/api/:path*',
          destination: `${backendBase}/api/:path*`,
        },
      ],
    }
  },

  // ✅ SECURITY: Remove X-Powered-By header
  poweredByHeader: false,

  // ✅ SECURITY: Add security headers
  async headers() {
    unoptimized: false,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp', 'image/avif'],
    qualities: [75, 85, 90, 95],
    minimumCacheTTL: 3600,
    dangerouslyAllowLocalIP: !isVercel,
    remotePatterns: [
      // ── Production: Railway backend uploads ────────────────────────────
      {
        protocol: 'https',
        hostname: '*.up.railway.app',
        pathname: '/uploads/**',
      },
      // ── Development: local Docker / direct backend ─────────────────────
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        // Images served through nginx on port 80
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3001',
        pathname: '/uploads/**',
      },
      // ── External supplier / reference images ───────────────────────────
      { protocol: 'https', hostname: 'media.ldlc.com' },
      { protocol: 'https', hostname: 'www.fournipro.ma' },
      { protocol: 'https', hostname: 'images.freeimages.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'egyptlaptop.com' },
    ],
  },
  reactStrictMode: true,

  // ✅ SECURITY: Remove X-Powered-By header
  poweredByHeader: false,

  // ✅ SECURITY: Add security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://accounts.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https: http: blob:",
              `connect-src 'self' https://* ${isVercel ? '' : 'http://localhost http://localhost:* http://127.0.0.1:*'}`,
              "frame-src 'self' https://www.google.com",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // HSTS: Enable when serving over HTTPS with a real domain
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }] : []),
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  }
}

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  scope: '/',
  sw: 'public/sw.js',
  fallbacks: {
    document: '/offline.html'
  },
  runtimeCaching: [
    // ─── 1. DYNAMIC PAGES & API — Never cache ───────────────────────────────
    // Cart, checkout, account, collections etc. must always be fresh
    {
      urlPattern: ({ url }) => {
        const pathname = url.pathname;
        return (
          pathname === '/' ||
          pathname === '/fr' ||
          pathname === '/ar' ||
          pathname.includes('/collections') ||
          pathname.includes('/store') ||
          pathname.includes('/cart') ||
          pathname.includes('/checkout') ||
          pathname.includes('/account') ||
          pathname.includes('/login') ||
          pathname.includes('/register') ||
          pathname.includes('/api/')
        );
      },
      handler: 'NetworkOnly',
    },

    // ─── 2. NEXT.JS HASHED STATIC ASSETS — Safe to cache forever ────────────
    // These files have a content hash in the URL (e.g. /_next/static/abc123/page.js)
    // so a new deploy always produces a new URL — stale cache is never served
    {
      urlPattern: /\/_next\/static\/.+$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static-assets',
        expiration: {
          maxEntries: 128,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year — safe due to hash in URL
        }
      }
    },

    // ─── 3. NEXT.JS IMAGE OPTIMIZATION — NetworkFirst (product images change) ─
    // /_next/image URLs have no hash, so we must always try network first
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'next-image',
        networkTimeoutSeconds: 4,
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 60 * 60 // 1 hour — short TTL so updated images appear quickly
        }
      }
    },

    // ─── 4. NEXT.JS DATA (getServerSideProps / RSC JSON) ────────────────────
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'next-data',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60 // 1 hour
        }
      }
    },

    // ─── 5. GOOGLE FONTS — Long-lived cache (external, never changes) ────────
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 8,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        }
      }
    },
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'StaleWhileRevalidate', // Stylesheet rarely changes, OK to use SWR
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 1 week
        }
      }
    },

    // ─── 6. LOCAL FONT FILES — Stable, cache aggressively ───────────────────
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 8,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    },

    // ─── 7. PRODUCT / UPLOAD IMAGES — NetworkFirst (content changes without URL change) ─
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp|avif)$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'static-image-assets',
        networkTimeoutSeconds: 4,
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours fallback for offline
        }
      }
    },

    // ─── 8. API ROUTES — Never cache (redundant safety net) ─────────────────
    {
      urlPattern: /\/api\//i,
      handler: 'NetworkOnly',
    },

    // ─── 9. AUDIO / VIDEO — CacheFirst with range support ───────────────────
    {
      urlPattern: /\.(?:mp3|wav|ogg)$/i,
      handler: 'CacheFirst',
      options: {
        rangeRequests: true,
        cacheName: 'static-audio-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60
        }
      }
    },
    {
      urlPattern: /\.(?:mp4)$/i,
      handler: 'CacheFirst',
      options: {
        rangeRequests: true,
        cacheName: 'static-video-assets',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60
        }
      }
    },

    // ─── 10. HTML PAGES — NetworkFirst for offline fallback ─────────────────
    {
      urlPattern: /^https?:.*\.html$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'html-cache',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60
        }
      }
    },

    // ─── 11. CATCH-ALL — NetworkFirst so fresh content wins ─────────────────
    {
      urlPattern: /.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'others',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60 // 1 hour
        }
      }
    }
  ]
})(nextConfig)
