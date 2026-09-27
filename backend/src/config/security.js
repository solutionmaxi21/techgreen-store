import helmet from 'helmet';
import cors from 'cors';

/**
 * Helmet security configuration
 * Sets various HTTP headers for security
 */
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http://localhost:3001", "http://localhost:5174"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  // HTTP Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },
  // Allow cross-origin for images (needed for product images)
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

/**
 * CORS configuration
 * Restricts which origins can access the API
 */
// Origins that are ALWAYS allowed — even when ALLOWED_ORIGINS env var overrides the defaults.
// These are first-party clients (Electron desktop apps) that must never be blocked.
const ALWAYS_ALLOWED_ORIGINS = [
  'techgreen-app://admin',   // Electron admin panel
  'techgreen-app://localhost', // Electron admin panel (alt)
];

const getAllowedOrigins = () => {
  const origins = process.env.ALLOWED_ORIGINS;
  if (!origins) {
    // Default allowed origins — production Vercel deployments + development
    return [
      'https://techgreen-store.vercel.app',
      'https://admin-panel-one-lilac.vercel.app',
      'https://techgreen.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite default port (admin)
      'http://localhost:5174',
      'http://localhost:4173', // Vite preview
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173',
      ...ALWAYS_ALLOWED_ORIGINS,
    ];
  }
  // Merge env var origins with always-allowed origins (Electron never blocked)
  const envOrigins = origins.split(',').map(origin => origin.trim());
  return [...new Set([...envOrigins, ...ALWAYS_ALLOWED_ORIGINS])];
};

const isLoopbackOrigin = (origin) => {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
};

const isProduction = process.env.NODE_ENV === 'production';

export const corsConfig = cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (mobile apps, curl, postman, non-browser clients)
    if (!origin) {
      return callback(null, true);
    }

    // BULLETPROOF: Always allow the Electron admin panel (any techgreen-app:// origin)
    if (origin.startsWith('techgreen-app://')) {
      console.log('[CORS] Allowed Electron origin:', origin);
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow loopback origins in development (Expo web/dev servers use dynamic ports)
    if (!isProduction && isLoopbackOrigin(origin)) {
      return callback(null, true);
    }

    // Log blocked origins for monitoring
    console.warn('[CORS] Blocked origin:', origin);

    // Return false instead of throwing — Express cors middleware
    // handles this by omitting CORS headers (browser blocks the response)
    callback(null, false);
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  // FIX: Added 'X-Client-Type' to the list below
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Type', 'X-Client-Platform', 'X-XSRF-TOKEN'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'], // Pagination headers
  maxAge: 86400, // Cache preflight requests for 24 hours
});

/**
 * Additional security headers middleware
 */
export const additionalSecurityHeaders = (req, res, next) => {
  // Prevent browsers from MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Enable XSS filter (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Prevent caching of API responses
  res.setHeader('Cache-Control', 'no-store');

  next();
};

export default {
  helmetConfig,
  corsConfig,
  additionalSecurityHeaders,
};
