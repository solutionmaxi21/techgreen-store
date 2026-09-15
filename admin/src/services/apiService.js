// ============================================
// API Service - Secure Cookie Integration
// Connects admin panel to backend API
// ENHANCED: Request queue, cross-tab sync
// ============================================

import { API_BASE_URL } from '../config/backend';
import i18n from '../i18n/config';

const API_BASE = API_BASE_URL;

// Detect Electron environment once at module load
const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

export class ApiError extends Error {
  constructor(message, {
    status = 0,
    code = 'API_ERROR',
    kind = 'http',
    details = null,
    endpoint = null,
    cause = null,
  } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.kind = kind;
    this.details = details;
    this.endpoint = endpoint;
  }
}

// ============================================
// NETWORK RESILIENCE
// ============================================
// A dropped Wi-Fi link or a few seconds of ISP noise makes fetch() reject with
// a TypeError. Without retries the very first such failure surfaced as a hard
// "backend unavailable" error, even though the next poll a few seconds later
// succeeded. These helpers retry *safe* requests before giving up.
//
// SAFETY: a network TypeError means "no response arrived" — NOT "the server
// never processed it". The request may have been executed with the response
// lost on the way back. Retrying a POST/PUT/DELETE could therefore duplicate an
// order, a product, or a shipment. Only GET/HEAD are ever retried.

const NETWORK_RETRY = {
  maxAttempts: 3, // 1 initial attempt + 2 retries
  baseDelayMs: 400,
  maxDelayMs: 2000,
  jitterRatio: 0.3,
};

// Requests must never be replayed automatically: token rotation races and
// login/logout side effects are not idempotent.
const NON_RETRIABLE_ENDPOINTS = ['/auth/refresh', '/auth/login', '/auth/logout'];

// After this many consecutive network failures we stop retrying and fail fast.
// During a real outage retrying every request would only burn the backend's
// rate limit (RATE_LIMIT_MAX) and delay the error the user needs to see.
const CIRCUIT_BREAKER_THRESHOLD = 4;

let consecutiveNetworkFailures = 0;
let connectivityOffline = false;
const connectivityListeners = new Set();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isNetworkFailure = (error) => error instanceof TypeError
  && /fetch|network/i.test(error?.message || '');

const isAbortError = (error) => error?.name === 'AbortError';

const backoffDelay = (attempt) => {
  const exponential = Math.min(
    NETWORK_RETRY.baseDelayMs * (2 ** (attempt - 1)),
    NETWORK_RETRY.maxDelayMs
  );
  // Jitter prevents every queued poll from retrying on the same tick once
  // connectivity returns, which would spike straight into the rate limiter.
  const jitter = exponential * NETWORK_RETRY.jitterRatio * Math.random();
  return Math.round(exponential + jitter);
};

const isBrowserOffline = () => typeof navigator !== 'undefined'
  && navigator.onLine === false;

const emitConnectivityChange = () => {
  const state = getConnectivityState();
  connectivityListeners.forEach((listener) => {
    try {
      listener(state);
    } catch (_) { /* a broken listener must not break the request pipeline */ }
  });
};

const recordNetworkSuccess = () => {
  if (consecutiveNetworkFailures === 0 && !connectivityOffline) return;
  consecutiveNetworkFailures = 0;
  connectivityOffline = false;
  emitConnectivityChange();
};

const recordNetworkFailure = () => {
  consecutiveNetworkFailures += 1;
  if (!connectivityOffline && consecutiveNetworkFailures >= 2) {
    connectivityOffline = true;
  }
  emitConnectivityChange();
};

const isCircuitOpen = () => consecutiveNetworkFailures >= CIRCUIT_BREAKER_THRESHOLD;

/**
 * Current connectivity state, for an offline indicator in the UI.
 * `offline` only flips true after repeated failures, so a single blip does not
 * flash a warning at the user.
 */
export const getConnectivityState = () => ({
  online: !connectivityOffline,
  offline: connectivityOffline,
  consecutiveFailures: consecutiveNetworkFailures,
  degraded: isCircuitOpen(),
});

/**
 * Subscribe to connectivity changes. Returns an unsubscribe function.
 *   useEffect(() => subscribeToConnectivity(setState), []);
 */
export const subscribeToConnectivity = (listener) => {
  if (typeof listener !== 'function') return () => {};
  connectivityListeners.add(listener);
  return () => connectivityListeners.delete(listener);
};

// When the OS reports the link is back, close the circuit immediately so the
// next request retries normally instead of failing fast on a stale counter.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('online', () => {
    consecutiveNetworkFailures = 0;
    if (connectivityOffline) {
      connectivityOffline = false;
      emitConnectivityChange();
    }
  });
  window.addEventListener('offline', () => {
    if (!connectivityOffline) {
      connectivityOffline = true;
      emitConnectivityChange();
    }
  });
}

const isRetriableRequest = (method, endpoint) => {
  if (method !== 'GET' && method !== 'HEAD') return false;
  return !NON_RETRIABLE_ENDPOINTS.some((path) => endpoint.startsWith(path));
};

/**
 * fetch() wrapper that retries transient network failures for safe requests.
 * Never retries: non-GET methods, auth endpoints, aborted requests, or HTTP
 * error responses (a 500 is a real answer from the server, not a lost packet).
 */
const fetchWithRetry = async (url, config, { retriable, diagnosticEndpoint, silent }) => {
  const maxAttempts = retriable && !isCircuitOpen() ? NETWORK_RETRY.maxAttempts : 1;
  let attempt = 0;
  let lastError;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const response = await fetch(url, config);
      recordNetworkSuccess();
      return response;
    } catch (error) {
      // An aborted request was cancelled deliberately — replaying it would
      // resurrect work the caller already abandoned.
      if (isAbortError(error) || config.signal?.aborted) throw error;
      if (!isNetworkFailure(error)) throw error;

      lastError = error;
      if (attempt >= maxAttempts) break;
      // The OS already knows there is no link; waiting to retry is pointless.
      if (isBrowserOffline()) break;

      const delay = backoffDelay(attempt);
      if (!silent) {
        console.warn(
          `[Network] ${diagnosticEndpoint} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`
        );
      }
      await sleep(delay);
    }
  }

  recordNetworkFailure();
  throw lastError;
};

const createIdempotencyKey = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (!globalThis.crypto?.getRandomValues) {
    throw new ApiError('Secure randomness is unavailable', {
      kind: 'client',
      code: 'SECURE_RANDOM_UNAVAILABLE',
    });
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(
    bytes,
    (byte) => byte.toString(16).padStart(2, '0')
  ).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
};

const sanitizeApiEndpoint = (value) => String(value || '').replace(
  /(\/(?:admin-access|admin\/access)\/(?:invitations|password-resets)\/)[^/?#]+/gi,
  '$1[REDACTED]'
);

const collectionAt = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  return null;
};

const decodeCollectionEnvelope = (...keys) => (payload) => {
  if (!collectionAt(payload, keys)) {
    throw new TypeError(`Expected a collection at one of: ${keys.join(', ') || 'data'}`);
  }
  return payload;
};

const decodeObjectWithKeys = (...keys) => (payload) => {
  if (
    !payload
    || typeof payload !== 'object'
    || Array.isArray(payload)
    || keys.some((key) => !Object.hasOwn(payload, key))
  ) {
    throw new TypeError(`Expected an object containing: ${keys.join(', ')}`);
  }
  return payload;
};

// ============================================
// ROBUST TOKEN REFRESH SYSTEM
// ============================================

// Track ongoing refresh state
let isRefreshing = false;
let refreshPromise = null;
let lastSuccessfulAuth = 0;
let lastRefreshAttempt = 0;
let lastRefreshResult = null;
let isLoggingOut = false; // Prevent refresh attempts during logout
const MIN_REFRESH_INTERVAL = 2000; // 2 seconds between refresh attempts

// Queue of pending requests waiting for refresh
let pendingRequests = [];

/**
 * Attempt to refresh the admin access token
 * Implements request queuing to handle concurrent 401s
 */
const attemptTokenRefresh = async () => {
  // Block refresh attempts during logout to prevent re-setting cookies
  if (isLoggingOut) {
    return { success: false, message: 'Logging out' };
  }

  // If refresh is in progress, queue this request
  if (isRefreshing && refreshPromise) {
    console.log('[Auth] Refresh in progress - queuing request...');
    return new Promise((resolve) => {
      pendingRequests.push({ resolve });
    });
  }

  // Prevent refresh spam
  const now = Date.now();
  if (now - lastRefreshAttempt < MIN_REFRESH_INTERVAL) {
    console.log('[Auth] Skipping refresh - too soon after last attempt');
    if (lastRefreshResult && lastRefreshResult.success) {
      return lastRefreshResult;
    }
    return { success: false, message: i18n.t('network.tooManyRefreshes'), isTransient: true };
  }

  // Start new refresh
  isRefreshing = true;
  lastRefreshAttempt = Date.now();

  refreshPromise = (async () => {
    try {
      console.log('[Auth] Attempting token refresh...');

      // Build refresh request - Electron sends refresh token in body (cookies don't work cross-origin from file://)
      const refreshHeaders = {
        'Content-Type': 'application/json',
        'X-Client-Type': 'admin',
      };
      const refreshBody = {};

      if (isElectron) {
        refreshHeaders['X-Client-Platform'] = 'electron';
        try {
          const storedRefreshToken = await window.electronAPI.getRefreshToken();
          if (storedRefreshToken) {
            refreshBody.refreshToken = storedRefreshToken;
          }
        } catch (e) {
          console.log('[Auth] Could not retrieve refresh token from keytar:', e.message);
        }
      }

      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: refreshHeaders,
        body: Object.keys(refreshBody).length > 0 ? JSON.stringify(refreshBody) : undefined,
      });

      if (refreshRes.ok) {
        console.log('[Auth] Token refresh successful');
        lastSuccessfulAuth = Date.now();

        // Update Electron's secure token storage with the new tokens
        try {
          const refreshData = await refreshRes.json();
          if (isElectron && window.electronAPI?.storeToken) {
            if (refreshData.accessToken) {
              await window.electronAPI.storeToken(refreshData.accessToken);
              console.log('[Auth] Updated Electron keytar with new access token');
            }
            if (refreshData.refreshToken && window.electronAPI?.storeRefreshToken) {
              await window.electronAPI.storeRefreshToken(refreshData.refreshToken);
              console.log('[Auth] Updated Electron keytar with new refresh token');
            }
          }
        } catch (e) {
          // Non-critical for browser (cookies work); critical for Electron but logged
          console.log('[Auth] Could not update Electron token store:', e.message);
        }

        return { success: true };
      } else {
        const status = refreshRes.status;
        const errorData = await refreshRes.json().catch(() => ({}));
        console.error('[Auth] Refresh failed:', status, errorData);

        const message = errorData.error?.message || errorData.message || 'Refresh failed';

        // 429 or 5xx are transient - don't treat as auth failure
        const isTransient = status === 429 || status >= 500;

        return {
          success: false,
          message: isTransient
            ? (status === 429 ? i18n.t('network.tooManyRequests') : i18n.t('network.serverUnavailable'))
            : message,
          isTransient,
          status,
        };
      }
    } catch (err) {
      const isNetworkError = err instanceof TypeError &&
        (err.message.includes('fetch') || err.message.includes('network'));
      console.error('[Auth] Refresh error:', err);
      return { success: false, isNetworkError, message: err.message };
    } finally {
      // Note: isRefreshing is cleared in the outer scope after queue is drained
    }
  })();

  const result = await refreshPromise;
  lastRefreshResult = result;

  // Resolve all queued requests
  const queued = [...pendingRequests];
  pendingRequests = [];
  queued.forEach(({ resolve }) => resolve(result));

  // Clear refresh state only after everything is settled
  isRefreshing = false;
  refreshPromise = null;
  return result;
};

/**
 * Broadcast auth events to other tabs
 */
export const broadcastAdminAuthEvent = (type) => {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('admin-auth-sync');
      channel.postMessage({ type, timestamp: Date.now() });
      channel.close();
    }
  } catch (err) {
    console.log('[Auth] BroadcastChannel error:', err);
  }
};

/**
 * Update last successful auth timestamp (called after successful login)
 */
export const updateLastSuccessfulAuth = () => {
  lastSuccessfulAuth = Date.now();
};

// Helper function to make authenticated requests with automatic token refresh
export const apiRequest = async (endpoint, options = {}, isRetry = false) => {
  const diagnosticEndpoint = sanitizeApiEndpoint(endpoint);
  const {
    decode,
    disableAuthRetry,
    idempotencyRequired = false,
    idempotencyKey: providedIdempotencyKey,
    responseType = 'json',
    // Background polls (notifications, dashboard refresh) should fail quietly
    // and try again on their next tick instead of alarming the user.
    background = false,
    ...requestOptions
  } = options;
  // CSRF: Read the XSRF-TOKEN cookie and send it as a header on mutating requests
  const csrfHeaders = {};
  const method = (requestOptions.method || 'GET').toUpperCase();
  const idempotencyKey = providedIdempotencyKey
    || (idempotencyRequired ? createIdempotencyKey() : null);
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    try {
      const csrfToken = typeof document !== 'undefined'
        ? document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1]
        : undefined;
      if (csrfToken) {
        csrfHeaders['X-XSRF-TOKEN'] = csrfToken;
      }
    } catch (_) { /* ignore */ }
  }

  const config = {
    ...requestOptions,
    // CRITICAL: Always send cookies with requests
    credentials: 'include',
    headers: {
      ...(
        typeof FormData !== 'undefined' && requestOptions.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }
      ),
      'X-Client-Type': 'admin',
      // Tell backend this is Electron so it returns tokens in response body
      ...(isElectron ? { 'X-Client-Platform': 'electron' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      ...csrfHeaders,
      ...requestOptions.headers,
    },
  };

  // CRITICAL 3: Browser uses HttpOnly cookies (secure, automatic)
  // Electron can use secure token storage via IPC
  // DO NOT use localStorage - XSS vulnerability
  let storedToken = null
  try {
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.getToken) {
      // Only for Electron: fetch token from secure storage
      storedToken = await window.electronAPI.getToken()
    }
  } catch (e) {
    storedToken = null
  }

  if (storedToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${storedToken}`;
  }

  const quiet = background || Boolean(requestOptions.silent);

  try {
    const response = await fetchWithRetry(`${API_BASE}${endpoint}`, config, {
      retriable: isRetriableRequest(method, endpoint),
      diagnosticEndpoint,
      silent: quiet,
    });

    // Track successful auth on protected endpoints only
    if (response.ok) {
      const protectedPrefixes = ['/auth/me', '/admin', '/users', '/orders', '/products', '/dashboard', '/inventory', '/categories', '/notifications'];
      if (protectedPrefixes.some(prefix => endpoint.startsWith(prefix))) {
        lastSuccessfulAuth = Date.now();
      }
    }

    // Check for errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // If 401 Unauthorized (and not already retrying)
      // This means Access Token expired, try to use Refresh Token Cookie
      if (response.status === 401 && !disableAuthRetry && !isRetry && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
        console.log('[Auth] Access token expired, attempting refresh...');

        const refreshResult = await attemptTokenRefresh();

        if (refreshResult.success) {
          console.log('[Auth] Refresh successful, retrying original request');
          return apiRequest(endpoint, {
            ...requestOptions,
            decode,
            disableAuthRetry,
            idempotencyRequired,
            idempotencyKey,
            responseType,
            background,
          }, true);
        }

        // If refresh failed due to network error, don't redirect
        if (refreshResult.isNetworkError) {
          throw new ApiError(i18n.t('network.connectionFailed'), {
            kind: 'network',
            code: 'NETWORK_ERROR',
            endpoint: diagnosticEndpoint,
          });
        }

        // If refresh failed due to transient error (429/5xx), don't redirect to login
        if (refreshResult.isTransient) {
          throw new ApiError(
            refreshResult.message || i18n.t('network.serviceUnavailable'),
            {
              status: refreshResult.status || 503,
              kind: 'server',
              code: 'AUTH_REFRESH_UNAVAILABLE',
              endpoint: diagnosticEndpoint,
            }
          );
        }

        // Session is truly expired (401/403 from refresh) - redirect to login
        console.log('[Auth] Session expired, redirecting to login');
        broadcastAdminAuthEvent('LOGOUT');

        if (typeof window !== 'undefined' && !window.location.hash.includes('#/login')) {
          window.location.hash = '#/login';
        }

        throw new ApiError(i18n.t('network.sessionExpired'), {
          status: 401,
          kind: 'authentication',
          code: 'SESSION_EXPIRED',
          endpoint: diagnosticEndpoint,
        });
      }

      // === FIX for [object Object] Error ===
      // Extract the message string safely
      const baseMessage = errorData.error?.message
        || errorData.message
        || (typeof errorData.error === 'string' ? errorData.error : i18n.t('network.unknownError'));

      const details = errorData?.error?.details;
      const detailsMessage = Array.isArray(details)
        ? details.map(d => d?.message || d?.field || String(d)).filter(Boolean).join('\n')
        : (typeof details === 'string' ? details : null);

      const errorMessage = detailsMessage && detailsMessage !== baseMessage
        ? `${baseMessage}: ${detailsMessage}`
        : baseMessage;

      const code = errorData.error?.code || errorData.code || `HTTP_${response.status}`;
      const kind = response.status === 401
        ? 'authentication'
        : response.status === 403
          ? 'authorization'
          : response.status === 400 || response.status === 422
            ? 'validation'
            : response.status >= 500
              ? 'server'
              : 'http';
      throw new ApiError(errorMessage, {
        status: response.status,
        code,
        kind,
        details,
        endpoint: diagnosticEndpoint,
      });
    }

    if (response.status === 204) {
      return { success: true };
    }
    if (responseType === 'blob') {
      return response.blob();
    }

    let data;
    try {
      data = await response.json();
    } catch (cause) {
      throw new ApiError(i18n.t('network.unknownError'), {
        status: response.status,
        code: 'MALFORMED_SUCCESS_RESPONSE',
        kind: 'malformed_response',
        endpoint: diagnosticEndpoint,
        cause,
      });
    }
    if (typeof decode === 'function') {
      try {
        return decode(data);
      } catch (cause) {
        throw new ApiError('The server returned an invalid success payload', {
          status: response.status,
          code: 'INVALID_SUCCESS_PAYLOAD',
          kind: 'malformed_response',
          endpoint: diagnosticEndpoint,
          cause,
        });
      }
    }
    return data;
  } catch (error) {
    const normalizedError = error instanceof ApiError
      ? error
      : error instanceof TypeError && /fetch|network/i.test(error.message)
        ? new ApiError(i18n.t('network.backendUnavailable'), {
            kind: 'network',
            code: 'BACKEND_UNAVAILABLE',
            endpoint: diagnosticEndpoint,
            cause: error,
          })
        : new ApiError(error?.message || i18n.t('network.unknownError'), {
            kind: 'client',
            code: 'CLIENT_REQUEST_ERROR',
            endpoint: diagnosticEndpoint,
            cause: error,
          });
    // Lets the toast/error layer drop failures from background polling while
    // still surfacing anything the user actually triggered.
    normalizedError.background = background;

    if (!quiet) {
      console.error(`API Error [${diagnosticEndpoint}]:`, normalizedError);
    } else if (normalizedError.kind === 'network') {
      // Debug level: during an outage a 15s poll would otherwise spam warnings.
      console.debug(`[Network] Background request failed: ${diagnosticEndpoint}`);
    }
    throw normalizedError;
  }
};

// ============================================
// AUTH API
// ============================================
export const authApi = {
  login: async (email, password) => {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, isAdmin: true }),
    });

    // Store tokens securely in Electron via IPC
    // Browser uses HttpOnly cookies (handled by browser automatically)
    if (isElectron && window.electronAPI) {
      try {
        if (result.accessToken && window.electronAPI.storeToken) {
          await window.electronAPI.storeToken(result.accessToken);
          console.log('[Auth] Access token stored securely via Electron IPC');
        }
        if (result.refreshToken && window.electronAPI.storeRefreshToken) {
          await window.electronAPI.storeRefreshToken(result.refreshToken);
          console.log('[Auth] Refresh token stored securely via Electron IPC');
        }
      } catch (e) {
        console.error('[Auth] Failed to store tokens after login:', e);
      }
    }

    // Update auth timestamp and broadcast login event
    updateLastSuccessfulAuth();
    broadcastAdminAuthEvent('LOGIN');

    return result;
  },

  logout: async () => {
    // Block any concurrent refresh attempts from re-setting cookies
    isLoggingOut = true;

    try {
      // Clear secure tokens in Electron
      if (isElectron && window.electronAPI) {
        try {
          if (window.electronAPI.clearToken) await window.electronAPI.clearToken();
          if (window.electronAPI.clearRefreshToken) await window.electronAPI.clearRefreshToken();
          console.log('[Auth] Tokens cleared from Electron storage');
        } catch (e) {
          console.error('[Auth] Failed to clear electron tokens:', e);
        }
      }

      // Broadcast logout to other admin tabs
      broadcastAdminAuthEvent('LOGOUT');

      // Build logout body - Electron sends refresh token in body for server-side revocation
      let logoutBody = undefined;
      if (isElectron && window.electronAPI?.getRefreshToken) {
        try {
          const storedRefreshToken = await window.electronAPI.getRefreshToken();
          if (storedRefreshToken) {
            logoutBody = JSON.stringify({ refreshToken: storedRefreshToken });
          }
        } catch (e) { /* ignore */ }
      }

      // Use direct fetch (NOT apiRequest) to avoid the 401 interceptor
      // which could trigger a token refresh and re-set cookies
      const response = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': 'admin',
        },
        body: logoutBody,
      });

      const data = await response.json().catch(() => ({}));
      console.log('[Auth] Logout response:', response.status, data);
      return data;
    } finally {
      isLoggingOut = false;
    }
  },

  checkSession: async () => {
    // Hits /me endpoint which checks the cookie
    // Pass silent: true to avoid "Not authenticated" error logs on first load
    const result = await apiRequest('/auth/me', { silent: true });
    // Update auth timestamp on successful session check
    if (result.success) {
      updateLastSuccessfulAuth();
    }
    return result;
  }
};

const buildAdminAccessQuery = (values = {}) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const adminAccessApi = {
  requestPasswordReset: (email) => apiRequest('/admin-access/password-resets', {
    method: 'POST',
    body: JSON.stringify({ email }),
    disableAuthRetry: true,
  }),
  validatePasswordReset: (token) => apiRequest(
    `/admin-access/password-resets/${encodeURIComponent(token)}`,
    { disableAuthRetry: true }
  ),
  completePasswordReset: (token, newPassword) => apiRequest(
    `/admin-access/password-resets/${encodeURIComponent(token)}/complete`,
    {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
      disableAuthRetry: true,
    }
  ),
  validateInvitation: (token) => apiRequest(
    `/admin-access/invitations/${encodeURIComponent(token)}`,
    { disableAuthRetry: true }
  ),
  acceptInvitation: (token, password) => apiRequest(
    `/admin-access/invitations/${encodeURIComponent(token)}/accept`,
    { method: 'POST', body: JSON.stringify({ password }), disableAuthRetry: true }
  ),
  getPermissions: () => apiRequest('/admin/access/permissions', {
    decode: decodeCollectionEnvelope('permissions'),
  }),
  getRoles: (filters = {}) => apiRequest(
    `/admin/access/roles${buildAdminAccessQuery(filters)}`,
    { decode: decodeCollectionEnvelope('roles') }
  ),
  getRole: (roleId) => apiRequest(`/admin/access/roles/${roleId}`),
  createRole: (data) => apiRequest('/admin/access/roles', {
    method: 'POST',
    idempotencyRequired: true,
    body: JSON.stringify(data),
  }),
  updateRole: (roleId, data) => apiRequest(`/admin/access/roles/${roleId}`, {
    method: 'PATCH',
    idempotencyRequired: true,
    body: JSON.stringify(data),
  }),
  deleteRole: (roleId) => apiRequest(`/admin/access/roles/${roleId}`, {
    method: 'DELETE',
    idempotencyRequired: true,
  }),
  getMembers: (filters = {}) => apiRequest(
    `/admin/access/members${buildAdminAccessQuery(filters)}`,
    { decode: decodeCollectionEnvelope('members') }
  ),
  getMember: (userId) => apiRequest(`/admin/access/members/${userId}`),
  createMember: (data) => apiRequest('/admin/access/members', {
    method: 'POST',
    idempotencyRequired: true,
    body: JSON.stringify(data),
  }),
  updateMember: (userId, data) => apiRequest(`/admin/access/members/${userId}`, {
    method: 'PATCH',
    idempotencyRequired: true,
    body: JSON.stringify(data),
  }),
  resendInvitation: (userId) => apiRequest(`/admin/access/members/${userId}/invitations/resend`, {
    method: 'POST',
    idempotencyRequired: true,
  }),
  requestMemberPasswordReset: (userId) => apiRequest(
    `/admin/access/members/${userId}/password-reset`,
    {
      method: 'POST',
      idempotencyRequired: true,
    }
  ),
  getAuditLogs: (filters = {}) => apiRequest(
    `/admin/access/audit${buildAdminAccessQuery(filters)}`,
    { decode: decodeCollectionEnvelope('logs') }
  ),
};

// ============================================
// PRODUCT API
// ============================================
export const productApi = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const query = params.toString();
    return apiRequest(`/admin/products${query ? `?${query}` : ''}`, {
      decode: decodeCollectionEnvelope('products'),
    });
  },

  getById: async (id) => apiRequest(`/admin/products/${id}`),

  create: async (productData) => {
    return apiRequest('/admin/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  update: async (id, updates) => {
    return apiRequest(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  delete: async (id) => apiRequest(`/admin/products/${id}`, { method: 'DELETE' }),

  // Trash helpers
  getTrash: async (filters = {}) => {
    return productApi.getAll({ ...filters, onlyDeleted: true });
  },

  restore: async (id) => apiRequest(`/admin/products/${id}/restore`, { method: 'POST' }),

  hardDelete: async (id) => apiRequest(`/admin/products/${id}/hard`, { method: 'DELETE' }),

  bulkDelete: async (ids) => {
    return apiRequest('/admin/products/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  validateSku: async (sku, options = {}) => {
    const body = { sku };
    if (options.excludeVariantId) body.variant_id = options.excludeVariantId;
    if (options.excludeProductId) body.product_id = options.excludeProductId;

    return apiRequest('/admin/products/validate-sku', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  bulkReceive: async (products) => {
    return apiRequest('/admin/products/bulk-receive', {
      method: 'POST',
      body: JSON.stringify({ products }),
    });
  },

  exportCSV: async () => apiRequest('/admin/products/export', {
    responseType: 'blob',
  }),

  // Barcode operations
  generateBarcode: async (id) => {
    return apiRequest(`/admin/products/${id}/generate-barcode`, { method: 'POST' });
  },

  batchGenerateBarcodes: async (productIds) => {
    return apiRequest('/admin/products/generate-barcodes/batch', {
      method: 'POST',
      body: JSON.stringify({ product_ids: productIds }),
    });
  },

  validateBarcode: async ({ barcode, productId }) => {
    return apiRequest('/admin/products/validate-barcode', {
      method: 'POST',
      body: JSON.stringify({ barcode, product_id: productId }),
    });
  },

  searchByBarcodeOrSku: async (query) => {
    return apiRequest(`/admin/products/barcode-search?query=${encodeURIComponent(query)}`);
  },

  getProductByBarcode: async (barcode) => {
    return apiRequest(`/admin/products/by-barcode/${encodeURIComponent(barcode)}`);
  },

  getBarcodeConfig: async () => apiRequest('/products/barcode-config'),

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiRequest('/admin/products/upload', {
      method: 'POST',
      body: formData,
    });
    if (response?.data) return response.data;
    throw new ApiError('Invalid upload response format', {
      kind: 'malformed_response',
      code: 'INVALID_SUCCESS_PAYLOAD',
      endpoint: '/admin/products/upload',
    });
  },

  getCategories: async () => apiRequest('/products/meta/categories'),
  getSuppliers: async () => apiRequest('/products/meta/suppliers'),
};

// ============================================
// ORDER API
// ============================================
export const orderApi = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const query = params.toString();
    const response = await apiRequest(`/admin/orders${query ? `?${query}` : ''}`, {
      decode: decodeCollectionEnvelope('orders'),
    });
    return response.data || response;
  },

  getById: async (id) => apiRequest(`/admin/orders/${id}`),

  createManual: async (orderData) => {
    return apiRequest('/admin/orders/manual', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  updateStatus: async (id, status, notes = '') => {
    return apiRequest(`/admin/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  updatePaymentStatus: async (id, paymentStatus) => {
    return apiRequest(`/admin/orders/${id}/payment-status`, {
      method: 'PUT',
      body: JSON.stringify({ paymentStatus }),
    });
  },

  cancel: async (id, reason) => {
    return apiRequest(`/admin/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled', notes: reason }),
    });
  },

  getStats: async () => apiRequest('/admin/orders/stats/summary'),

  // Phone confirmation endpoints
  confirmPhone: async (id, status, notes = '') => {
    return apiRequest(`/admin/orders/${id}/phone-confirmation`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  needsConfirmation: async () => {
    const response = await apiRequest('/admin/orders/needs-confirmation', {
      decode: decodeCollectionEnvelope('orders'),
    });
    return collectionAt(response, ['orders']);
  },

  // Guepex shipping endpoints
  createShipment: async (id, deliveryType = 'home', prepaidAmount = 0) => {
    return apiRequest(`/admin/orders/${id}/create-shipment`, {
      method: 'POST',
      idempotencyRequired: true,
      body: JSON.stringify({
        delivery_type: deliveryType,
        prepaidAmount: prepaidAmount
      }),
    });
  },

  getTrackingHistory: async (id) => apiRequest(`/admin/orders/${id}/tracking-history`),

  exportCSV: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const query = params.toString();

    return apiRequest(`/admin/orders/export${query ? `?${query}` : ''}`, {
      responseType: 'blob',
    });
  },
};

// ============================================
// USER API
// ============================================
export const userApi = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const query = params.toString();
    return apiRequest(`/admin/customers${query ? `?${query}` : ''}`, {
      decode: decodeCollectionEnvelope('users'),
    });
  },

  getById: async (id) => apiRequest(`/admin/customers/${id}`),

  create: async (userData) => {
    return apiRequest('/admin/customers', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  update: async (id, updates) => {
    return apiRequest(`/admin/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  delete: async (id) => apiRequest(`/admin/customers/${id}`, { method: 'DELETE' }),

  // Trash helpers
  getTrash: async (filters = {}) => userApi.getAll({ ...filters, onlyDeleted: true }),
  restore: async (id) => apiRequest(`/admin/customers/${id}/restore`, { method: 'POST' }),
  hardDelete: async (id) => apiRequest(`/admin/customers/${id}/hard`, { method: 'DELETE' }),

  updateRole: async (id, role) => {
    return apiRequest(`/admin/customers/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  deactivate: async (id) => {
    return apiRequest(`/admin/customers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'inactive' }),
    });
  },

  activate: async (id) => {
    return apiRequest(`/admin/customers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' }),
    });
  },

  verifyEmail: async (id) => {
    return apiRequest(`/admin/customers/${id}/verify-email`, {
      method: 'PATCH',
    });
  },

  getStats: async () => apiRequest('/admin/customers/stats/summary'),
};

// ============================================
// REVIEW API
// ============================================
export const reviewApi = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const query = params.toString();
    const res = await apiRequest(`/admin/reviews${query ? `?${query}` : ''}`, {
      decode: decodeCollectionEnvelope('reviews'),
    });
    const items = collectionAt(res, ['reviews']);
    return items.map(mapReviewFromApi);
  },

  getById: async (id) => {
    const res = await apiRequest(`/admin/reviews/${id}`);
    return mapReviewFromApi(res.data || res.review || res);
  },

  updateStatus: async (id, status, rejectionReason = null) => {
    return apiRequest(`/admin/reviews/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, rejectionReason }),
    });
  },

  approve: async (id) => reviewApi.updateStatus(id, 'approved'),

  reject: async (id, reason) => reviewApi.updateStatus(id, 'rejected', reason),

  getPending: async () => {
    const list = await reviewApi.getAll({ status: 'pending' });
    return list;
  },

  bulkUpdateStatus: async (ids, status) => Promise.all(ids.map(id => reviewApi.updateStatus(id, status))),

  bulkApprove: async (ids) => reviewApi.bulkUpdateStatus(ids, 'approved'),

  bulkReject: async (ids, reason = null) => Promise.all(ids.map(id => reviewApi.updateStatus(id, 'rejected', reason))),

  delete: async (id) => apiRequest(`/admin/reviews/${id}`, { method: 'DELETE' }),

  // Trash helpers
  getTrash: async (filters = {}) => reviewApi.getAll({ ...filters, onlyDeleted: true }),
  restore: async (id) => apiRequest(`/admin/reviews/${id}/restore`, { method: 'POST' }),
  hardDelete: async (id) => apiRequest(`/admin/reviews/${id}/hard`, { method: 'DELETE' }),

  bulkDelete: async (ids) => Promise.all(ids.map(id => reviewApi.delete(id))),

  getStats: async () => apiRequest('/admin/reviews/stats/summary'),
};

// ============================================
// DASHBOARD API
// ============================================
export const dashboardApi = {
  getStats: async () => {
    const res = await apiRequest('/admin/dashboard/stats', {
      decode: decodeObjectWithKeys('products', 'orders', 'revenue', 'customers'),
    });
    const products = res?.products || {};
    const orders = res?.orders || {};
    const revenue = res?.revenue || {};
    const customers = res?.customers || {};

    return {
      products: {
        total: Number(products.total ?? products.total_products ?? 0),
        active: Number(products.active ?? products.active_products ?? 0),
        categories: Number(products.categories ?? products.total_categories ?? 0),
        lowStock: Number(products.lowStock ?? products.low_stock ?? 0),
        outOfStock: Number(products.outOfStock ?? products.out_of_stock ?? 0),
      },
      orders: {
        total: Number(orders.total ?? orders.total_orders ?? 0),
        pending: Number(orders.pending ?? orders.pending_orders ?? 0),
        processing: Number(orders.processing ?? orders.processing_orders ?? 0),
        shipped: Number(orders.shipped ?? orders.shipped_orders ?? 0),
        delivered: Number(orders.delivered ?? orders.delivered_orders ?? 0),
        cancelled: Number(orders.cancelled ?? orders.cancelled_orders ?? 0),
      },
      revenue: {
        total: Number(revenue.total ?? revenue.total_revenue ?? 0),
        average: Number(revenue.average ?? revenue.avg_order_value ?? 0),
        monthly: Number(revenue.monthly ?? revenue.monthly_revenue ?? revenue.total_revenue ?? 0),
      },
      customers: {
        total: Number(customers.total ?? customers.total_users ?? 0),
        newThisMonth: Number(customers.newThisMonth ?? customers.new_users_this_month ?? 0),
      },
      inventory: res?.inventory || {},
      reviews: res?.reviews || {},
    };
  },

  getRecentOrders: async (limit = 10) => {
    const list = await apiRequest(`/admin/dashboard/recent-orders?limit=${limit}`, {
      decode: decodeCollectionEnvelope('orders'),
    });
    const items = collectionAt(list, ['orders']);
    return items.map((o) => ({
      id: o.id ?? o.order_id,
      orderNumber: o.orderNumber ?? o.order_number,
      customerName: o.customerName ?? o.customer_name ?? o.username ?? o.email ?? 'Guest',
      total: Number(o.total ?? o.total_amount ?? 0),
      status: o.status ?? o.current_status ?? 'pending',
      paymentStatus: o.paymentStatus ?? o.payment_status ?? null,
      paymentMethod: o.paymentMethod ?? o.payment_method ?? null,
    }));
  },

  getSalesChart: async (period = 'week') => {
    const data = await apiRequest(`/admin/dashboard/sales-chart?period=${period}`, {
      decode: decodeCollectionEnvelope('sales'),
    });
    const items = collectionAt(data, ['sales']);
    return items.map((row) => ({
      date: row.date || row.period,
      orders: Number(row.orders || 0),
      revenue: Number(row.revenue || 0),
    }));
  },

  getCategorySales: async (period = 'all') => {
    const data = await apiRequest(`/admin/dashboard/category-sales?period=${period}`, {
      decode: decodeCollectionEnvelope('categories'),
    });
    const items = collectionAt(data, ['categories']);
    return items.map((c) => ({
      id: c.id ?? c.category_id,
      name: c.name ?? c.category_name,
      value: Number(c.value ?? c.revenue ?? c.total_revenue ?? 0),
      orderCount: Number(c.orderCount ?? c.order_count ?? 0),
      unitsSold: Number(c.unitsSold ?? c.units_sold ?? 0),
    }));
  },

  getTopProducts: async (limit = 5, period = 'all') => {
    const data = await apiRequest(`/admin/dashboard/top-products?limit=${limit}&period=${period}`, {
      decode: decodeCollectionEnvelope('products'),
    });
    const items = collectionAt(data, ['products']);
    return items.map((p) => ({
      id: p.id ?? p.product_id,
      name: p.name ?? p.product_name,
      sku: p.sku,
      price: Number(p.price ?? p.current_price ?? 0),
      salesCount: Number(p.salesCount ?? p.total_sold ?? 0),
      revenue: Number(p.revenue ?? p.total_revenue ?? 0),
      orderCount: Number(p.orderCount ?? p.order_count ?? 0),
    }));
  },
};

// ============================================
// METADATA API
// ============================================
export const metadataApi = {
  getCategories: async () => {
    const res = await apiRequest('/admin/metadata/categories', {
      decode: decodeCollectionEnvelope('categories'),
    });
    const items = collectionAt(res, ['categories']);
    // Map database field names to frontend field names
    return items.map(cat => ({
      id: cat.category_id ?? cat.id,
      name: cat.category_name ?? cat.name,
      slug: cat.category_slug ?? cat.slug,
      description: cat.description,
      productCount: cat.product_count ?? 0
    }));
  },
  getCollections: async () => {
    const res = await apiRequest('/admin/metadata/collections', {
      decode: decodeCollectionEnvelope('collections'),
    });
    return collectionAt(res, ['collections']).map((collection) => ({
      collection_id: collection.collection_id ?? collection.id,
      collection_name: collection.collection_name ?? collection.name,
      collection_slug: collection.collection_slug ?? collection.slug,
      parent_collection_id: collection.parent_collection_id ?? null,
    }));
  },
  getBrands: async () => {
    const res = await apiRequest('/admin/metadata/brands', {
      decode: decodeCollectionEnvelope('brands'),
    });
    const items = collectionAt(res, ['brands']);
    // Normalize to { brand, name } objects and dedupe by brand
    const normalized = items
      .map(b => {
        const value = b?.brand ?? b?.name ?? b;
        if (!value) return null;
        const brand = String(value);
        return { brand, name: brand };
      })
      .filter(Boolean);

    const seen = new Set();
    const deduped = [];
    for (const item of normalized) {
      if (seen.has(item.brand)) continue;
      seen.add(item.brand);
      deduped.push(item);
    }
    return deduped;
  },
  getWarehouses: async () => {
    const res = await apiRequest('/admin/metadata/warehouses', {
      decode: decodeCollectionEnvelope('warehouses'),
    });
    const items = collectionAt(res, ['warehouses']);
    return items.map((w) => ({
      warehouse_id: w.warehouse_id ?? w.id ?? w.supplier_id ?? null,
      warehouse_name: w.warehouse_name ?? w.name ?? w.brand ?? 'Warehouse',
      location_address: w.location_address ?? w.address ?? '',
      deleted_at: w.deleted_at ?? null,
    }));
  },
  getSuppliers: async () => {
    const res = await apiRequest('/admin/metadata/suppliers', {
      decode: decodeCollectionEnvelope('suppliers'),
    });
    const items = collectionAt(res, ['suppliers']);
    return items.map((s) => ({
      ...s,
      supplier_id: s.supplier_id ?? s.id ?? null,
      supplier_name: s.supplier_name ?? s.name ?? s.company_name ?? s.companyName ?? '',
      id: s.id ?? s.supplier_id ?? null,
      name: s.name ?? s.supplier_name ?? s.company_name ?? s.companyName ?? ''
    }));
  },
  getWilayas: async () => {
    const res = await apiRequest('/metadata/wilayas', {
      decode: decodeCollectionEnvelope('wilayas'),
    });
    return collectionAt(res, ['wilayas']);
  },
};

// ============ WAREHOUSE API (Full CRUD) ============
export const warehouseApi = {
  getAll: async () => {
    const response = await apiRequest('/admin/warehouses', {
      decode: decodeCollectionEnvelope('warehouses'),
    });
    return collectionAt(response, ['warehouses']);
  },
  getById: async (id) => apiRequest(`/admin/warehouses/${id}`),
  create: async (data) => apiRequest('/admin/warehouses', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id, data) => apiRequest(`/admin/warehouses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id) => apiRequest(`/admin/warehouses/${id}`, { method: 'DELETE' }),

  // Trash helpers
  getTrash: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    const queryString = params.toString();
    const response = await apiRequest(`/admin/warehouses/trash${queryString ? `?${queryString}` : ''}`, {
      decode: decodeCollectionEnvelope('warehouses'),
    });
    return collectionAt(response, ['warehouses']);
  },
  restore: async (id) => apiRequest(`/admin/warehouses/${id}/restore`, { method: 'POST' }),
  hardDelete: async (id) => apiRequest(`/admin/warehouses/${id}/hard`, { method: 'DELETE' }),
};

// Map backend snake_case promotion to frontend camelCase shape
const mapPromotionFromApi = (p = {}) => ({
  id: p.promotion_id ?? p.id,
  code: p.promotion_code ?? p.code,
  name: p.promotion_name ?? p.name,
  description: p.description,
  discountType: p.discount_type ?? p.discountType,
  discountValue: p.discount_value !== undefined ? Number(p.discount_value) : p.discountValue,
  minOrderAmount: p.min_order_amount !== undefined ? Number(p.min_order_amount) : p.minOrderAmount,
  maxUses: p.max_uses !== undefined ? p.max_uses : p.maxUses,
  maxUsesPerUser: p.max_uses_per_user !== undefined ? p.max_uses_per_user : p.maxUsesPerUser,
  currentUses: p.current_uses !== undefined ? p.current_uses : p.currentUses,
  applicableTo: (p.applicable_to ?? p.applicableTo ?? 'ALL').toString().toLowerCase(),
  applicableCategories: p.applicable_categories ?? p.applicableCategories ?? [],
  applicableCollections: p.applicable_collections ?? p.applicableCollections ?? [],
  startDate: p.start_date ?? p.startDate,
  endDate: p.end_date ?? p.endDate,
  createdAt: p.created_at ?? p.createdAt,
  deletedAt: p.deleted_at ?? p.deletedAt,
  deleted_at: p.deleted_at ?? p.deletedAt,
});

// Map frontend camelCase promotion payload to backend expectations
// Backend validation expects `name` and `code`
const mapPromotionToApi = (p = {}) => ({
  code: p.code ?? p.promotionCode,
  name: p.name ?? p.promotionName,
  description: p.description,
  discountType: p.discountType,
  discountValue: p.discountValue,
  minOrderAmount: p.minOrderAmount,
  maxUses: p.maxUses,
  applicableTo: p.applicableTo,
  applicableCategories: p.applicableCategories ?? [],
  applicableCollections: p.applicableCollections ?? [],
  startDate: p.startDate,
  endDate: p.endDate,
});

// ============================================
// PROMOTION API
// ============================================
export const promotionApi = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.discountType) params.append('discountType', filters.discountType);
    if (filters.includeDeleted) params.append('includeDeleted', 'true');
    if (filters.onlyDeleted) params.append('onlyDeleted', 'true');
    const query = params.toString();
    const response = await apiRequest(`/admin/promotions${query ? `?${query}` : ''}`, {
      decode: decodeCollectionEnvelope('promotions'),
    });
    const items = collectionAt(response, ['promotions']);
    return items.map(mapPromotionFromApi);
  },

  getById: async (id) => {
    const promotion = await apiRequest(`/admin/promotions/${id}`);
    return mapPromotionFromApi(promotion);
  },

  create: async (data) => {
    const payload = mapPromotionToApi(data);
    return apiRequest('/admin/promotions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (id, data) => {
    const payload = mapPromotionToApi(data);
    return apiRequest(`/admin/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  delete: async (id) => apiRequest(`/admin/promotions/${id}`, { method: 'DELETE' }),

  // Trash helpers
  getTrash: async (filters = {}) => promotionApi.getAll({ ...filters, onlyDeleted: true }),
  restore: async (id) => apiRequest(`/admin/promotions/${id}/restore`, { method: 'POST' }),
  hardDelete: async (id) => apiRequest(`/admin/promotions/${id}/hard`, { method: 'DELETE' }),

  getStats: async () => apiRequest('/admin/promotions/stats/summary'),
};

// ============================================
// SUPPLIERS API
// ============================================
export const supplierApi = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.includeDeleted) params.append('includeDeleted', 'true');
    if (filters.onlyDeleted) params.append('onlyDeleted', 'true');
    const queryString = params.toString();
    const res = await apiRequest(`/admin/suppliers${queryString ? `?${queryString}` : ''}`, {
      decode: decodeCollectionEnvelope('suppliers'),
    });
    const items = collectionAt(res, ['suppliers']);
    // Normalize supplier payload shape for the table
    return items.map((s) => ({
      supplier_id: s.supplier_id ?? s.id,
      id: s.id ?? s.supplier_id,
      name: s.supplier_name ?? s.name,
      contact_email: s.contact_email ?? s.email ?? null,
      contact_phone: s.contact_phone ?? s.phone ?? null,
      address: s.address ?? s.location_address ?? '',
      product_count: s.product_count ?? s.productCount ?? 0,
      deleted_at: s.deleted_at ?? s.deletedAt ?? null,
      deletedAt: s.deleted_at ?? s.deletedAt ?? null,
    }));
  },

  getById: async (id) => apiRequest(`/admin/suppliers/${id}`),

  create: async (supplierData) => {
    return apiRequest('/admin/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplierData),
    });
  },

  update: async (id, supplierData) => {
    return apiRequest(`/admin/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(supplierData),
    });
  },

  delete: async (id) => apiRequest(`/admin/suppliers/${id}`, { method: 'DELETE' }),

  // Trash helpers
  getTrash: async (filters = {}) => supplierApi.getAll({ ...filters, onlyDeleted: true }),
  restore: async (id) => apiRequest(`/admin/suppliers/${id}/restore`, { method: 'POST' }),
  hardDelete: async (id) => apiRequest(`/admin/suppliers/${id}/hard`, { method: 'DELETE' }),

  getStats: async () => {
    const stats = await apiRequest('/admin/suppliers/stats');
    // Map backend stats keys to UI expectations
    return {
      total: stats.total ?? stats.total_suppliers ?? 0,
      active: stats.active ?? stats.active_suppliers ?? stats.total ?? 0,
      with_products: stats.with_products ?? stats.withProducts ?? stats.suppliers_with_products ?? 0,
      without_products: stats.without_products ?? stats.withoutProducts ?? stats.suppliers_without_products ?? 0,
      total_products: stats.total_products ?? stats.totalProducts ?? stats.total_products ?? 0,
      top_suppliers: stats.top_suppliers ?? stats.topSuppliers ?? [],
    };
  },
};

// ============================================
// CATEGORIES API
// ============================================
export const categoryApi = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.pageSize) params.append('pageSize', filters.pageSize);
    if (filters.search) params.append('search', filters.search);
    if (filters.tree) params.append('tree', 'true');
    if (filters.includeDeleted) params.append('includeDeleted', 'true');
    if (filters.onlyDeleted) params.append('onlyDeleted', 'true');
    const queryString = params.toString();
    return apiRequest(`/admin/categories${queryString ? `?${queryString}` : ''}`, {
      decode: decodeCollectionEnvelope('categories'),
    });
  },

  // Trash helpers
  getTrash: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    const queryString = params.toString();
    const response = await apiRequest(`/admin/categories/trash${queryString ? `?${queryString}` : ''}`, {
      decode: decodeCollectionEnvelope('categories'),
    });
    return collectionAt(response, ['categories']);
  },

  restore: async (id) => apiRequest(`/admin/categories/${id}/restore`, { method: 'POST' }),

  hardDelete: async (id) => apiRequest(`/admin/categories/${id}/hard`, { method: 'DELETE' }),

  getById: async (id) => apiRequest(`/admin/categories/${id}`),

  create: async (categoryData) => {
    return apiRequest('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  },

  update: async (id, categoryData) => {
    return apiRequest(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiRequest('/admin/categories/upload', {
      method: 'POST',
      body: formData,
    });
    if (response?.data) return response.data;
    throw new ApiError('Invalid upload response format', {
      kind: 'malformed_response',
      code: 'INVALID_SUCCESS_PAYLOAD',
      endpoint: '/admin/categories/upload',
    });
  },

  delete: async (id) => apiRequest(`/admin/categories/${id}`, { method: 'DELETE' }),

  getStats: async () => apiRequest('/admin/categories/stats'),
};

// ============================================
// COLLECTIONS API
// ============================================
export const collectionApi = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.includeDeleted) params.append('includeDeleted', 'true');
    if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters.parentId) params.append('parentId', String(filters.parentId));
    const queryString = params.toString();
    return apiRequest(`/admin/collections${queryString ? `?${queryString}` : ''}`, {
      decode: decodeCollectionEnvelope('collections'),
    });
  },

  getById: async (id) => apiRequest(`/admin/collections/${id}`),
  getBySlug: async (slug) => apiRequest(`/collections/slug/${slug}`),

  create: async (collectionData) => {
    return apiRequest('/admin/collections', {
      method: 'POST',
      body: JSON.stringify(collectionData),
    });
  },

  update: async (id, collectionData) => {
    return apiRequest(`/admin/collections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(collectionData),
    });
  },

  delete: async (id) => apiRequest(`/admin/collections/${id}`, { method: 'DELETE' }),

  // Trash helpers
  getTrash: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    const queryString = params.toString();
    const res = await apiRequest(`/admin/collections/trash${queryString ? `?${queryString}` : ''}`, {
      decode: decodeCollectionEnvelope('collections'),
    });
    return collectionAt(res, ['collections']);
  },
  restore: async (id) => apiRequest(`/admin/collections/${id}/restore`, { method: 'POST' }),
  hardDelete: async (id) => apiRequest(`/admin/collections/${id}/hard`, { method: 'DELETE' }),

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiRequest('/admin/collections/upload', {
      method: 'POST',
      body: formData,
    });
    if (response?.data) return response.data;
    throw new ApiError('Invalid upload response format', {
      kind: 'malformed_response',
      code: 'INVALID_SUCCESS_PAYLOAD',
      endpoint: '/admin/collections/upload',
    });
  },

  getProducts: async (id) => apiRequest(`/collections/${id}/products`),

  addProducts: async (id, productIds) => {
    return apiRequest(`/admin/collections/${id}/products`, {
      method: 'POST',
      body: JSON.stringify({ productIds }),
    });
  },

  removeProducts: async (id, productIds) => {
    return apiRequest(`/admin/collections/${id}/products`, {
      method: 'DELETE',
      body: JSON.stringify({ productIds }),
    });
  },

  reorderProducts: async (id, items) => {
    return apiRequest(`/admin/collections/${id}/products/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  },
};

// ============================================
// RETURNS API
// ============================================
export const returnApi = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    const queryString = params.toString();
    return apiRequest(`/admin/returns${queryString ? `?${queryString}` : ''}`, {
      decode: decodeCollectionEnvelope('returns'),
    });
  },

  getById: async (id) => apiRequest(`/admin/returns/${id}`),

  updateStatus: async (id, status, notes) => {
    return apiRequest(`/admin/returns/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  processRefund: async (id, refundData) => {
    return apiRequest(`/admin/returns/${id}/refund`, {
      method: 'POST',
      idempotencyRequired: true,
      body: JSON.stringify(refundData),
    });
  },

  create: async (returnData) => {
    return apiRequest('/returns', {
      method: 'POST',
      body: JSON.stringify(returnData),
    });
  },

  delete: async (id) => apiRequest(`/admin/returns/${id}`, { method: 'DELETE' }),

  getStats: async () => apiRequest('/admin/returns/stats'),

  // Confirm receipt at warehouse
  confirmReceipt: async (id) => {
    return apiRequest(`/admin/returns/${id}/confirm-receipt`, {
      method: 'POST',
    });
  },
};

// ============================================
// INVENTORY API
// ============================================
export const inventoryApi = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.warehouse_id) params.append('warehouse_id', filters.warehouse_id);
    if (filters.product_id) params.append('product_id', filters.product_id);
    if (filters.low_stock) params.append('low_stock', 'true');
    if (filters.search) params.append('search', filters.search);
    const queryString = params.toString();
    return apiRequest(`/admin/inventory${queryString ? `?${queryString}` : ''}`);
  },

  getById: async (id) => apiRequest(`/admin/inventory/${id}`),

  adjustStock: async (id, adjustmentData) => {
    return apiRequest(`/admin/inventory/${id}/adjust`, {
      method: 'PUT',
      body: JSON.stringify(adjustmentData),
    });
  },

  reserveStock: async (id, quantity) => {
    return apiRequest(`/admin/inventory/${id}/reserve`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  },

  releaseStock: async (id, quantity) => {
    return apiRequest(`/admin/inventory/${id}/release`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  },

  // Backend does not expose /inventory/warehouses/all; reuse metadata warehouses
  getWarehouses: async () => metadataApi.getWarehouses(),

  getStats: async () => {
    const res = await apiRequest('/admin/inventory/stats');
    // Backend shape: { totalItems, totalQuantity, totalReserved, lowStockItems, outOfStockItems }
    return {
      total_products: res.totalItems ?? 0,
      total_quantity: res.totalQuantity ?? 0,
      total_available: (res.totalQuantity ?? 0) - (res.totalReserved ?? 0),
      total_reserved: res.totalReserved ?? 0,
      low_stock_products: res.lowStockItems ?? 0,
      out_of_stock_products: res.outOfStockItems ?? 0,
    };
  },
};

// ============================================
// ORDER HISTORY API
// ============================================
export const orderHistoryApi = {
  getOrderTimeline: async (orderId) => apiRequest(`/admin/order-history/${orderId}`),

  addTimelineEvent: async (eventData) => {
    return apiRequest('/admin/order-history', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.order_id) params.append('order_id', filters.order_id);
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit);
    const queryString = params.toString();
    return apiRequest(`/admin/order-history${queryString ? `?${queryString}` : ''}`);
  },
};

// ============================================
// SHIPPING API
// ============================================
export const shippingApi = {
  getWilayas: async () => apiRequest('/shipping/wilayas'),
  getCommunes: async (wilayaId) => apiRequest(`/shipping/communes?wilayaId=${wilayaId}&isDeliverable=true`),
};

// ============================================
// VARIANT API
// ============================================
export const variantApi = {
  getVariantsByProductId: async (productId) => apiRequest(`/products/${productId}/variants`),
  getVariantById: async (id) => apiRequest(`/variants/${id}`),
  createVariant: async (productId, variantData) => apiRequest(`/admin/products/${productId}/variants`, {
    method: 'POST',
    body: JSON.stringify(variantData),
  }),
  updateVariant: async (id, variantData) => apiRequest(`/admin/variants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(variantData),
  }),
  deleteVariant: async (id) => apiRequest(`/admin/variants/${id}`, { method: 'DELETE' }),
  setDefaultVariant: async (productId, variantId) => apiRequest(`/admin/products/${productId}/variants/${variantId}/set-default`, { method: 'PUT' }),
  getByBarcode: async (barcode) => apiRequest(`/variants/barcode/${encodeURIComponent(barcode)}`),
  generateBarcode: async (variantId) => apiRequest(`/admin/variants/${variantId}/generate-barcode`, { method: 'POST' }),
};

// ============================================
// DATABASE API (ADMIN ONLY)
// ============================================
export const databaseApi = {
  // Get database statistics
  getStats: async () => apiRequest('/admin/database/stats'),

  // Verify admin password before destructive DB actions
  verifyDeletePassword: async (password) => {
    return apiRequest('/admin/database/verify-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  // Export entire database to JSON
  exportDatabase: async () => {
    const response = await apiRequest('/admin/database/export');
    return response;
  },

  // Import database from JSON
  importDatabase: async (data, options = {}) => {
    return apiRequest('/admin/database/import', {
      method: 'POST',
      idempotencyRequired: true,
      body: JSON.stringify({ data, options }),
    });
  },

  // Create a backup
  createBackup: async () => {
    return apiRequest('/admin/database/backup', {
      method: 'POST',
      idempotencyRequired: true,
    });
  },

  // Restore from backup
  restoreBackup: async (backup) => {
    return apiRequest('/admin/database/restore', {
      method: 'POST',
      idempotencyRequired: true,
      body: JSON.stringify({ backup }),
    });
  },

  // Truncate selected allowlisted tables
  truncateSelectedTables: async ({ tables, reason, confirmationText, reauthToken }) => {
    return apiRequest('/admin/database/tables/truncate', {
      method: 'POST',
      body: JSON.stringify({ tables, reason, confirmationText, reauthToken }),
    });
  },
};

export const newsletterBroadcastApi = {
  getTrash: async (filters = {}) => {
    const response = await apiRequest('/admin/newsletter/broadcasts/trash', {
      method: 'GET',
      decode: decodeCollectionEnvelope('broadcasts'),
    });
    return collectionAt(response, ['broadcasts']);
  },
  restore: async (id) => {
    return apiRequest(`/admin/newsletter/broadcasts/trash/${id}/restore`, {
      method: 'PUT',
    });
  },
  hardDelete: async (id) => {
    return apiRequest(`/admin/newsletter/broadcasts/trash/${id}/hard-delete`, {
      method: 'DELETE',
    });
  },
};

export default {
  authApi,
  adminAccessApi,
  productApi,
  orderApi,
  userApi,
  reviewApi,
  dashboardApi,
  metadataApi,
  promotionApi,
  supplierApi,
  categoryApi,
  collectionApi,
  returnApi,
  inventoryApi,
  variantApi,
  orderHistoryApi,
  shippingApi,
  databaseApi,
  newsletterBroadcastApi,
};

// Map backend review shape (snake_case) to frontend camelCase
const mapReviewFromApi = (p = {}) => {
  const fullName = [p.user_name, p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  return {
    id: p.review_id ?? p.id,
    productId: p.product_id ?? p.productId,
    productName: p.product_name ?? p.productName,
    userId: p.user_id ?? p.userId,
    userName: fullName || p.email || '',
    rating: p.rating,
    reviewTitle: p.review_title ?? p.title ?? '',
    comment: p.review_text ?? p.comment ?? '',
    verifiedPurchase: p.verified_purchase ?? p.verifiedPurchase ?? false,
    status: p.status,
    createdAt: p.created_at ?? p.createdAt,
    editedAt: p.edited_at ?? p.editedAt,
    editCount: p.edit_count ?? p.editCount ?? 0,
    rejectionReason: p.rejection_reason ?? p.rejectionReason,
    moderatedBy: p.moderated_by ?? p.moderatedBy,
    moderatedAt: p.moderated_at ?? p.moderatedAt,
    email: p.email,
    deletedAt: p.deleted_at ?? p.deletedAt,
    deleted_at: p.deleted_at ?? p.deletedAt,
  };
};
