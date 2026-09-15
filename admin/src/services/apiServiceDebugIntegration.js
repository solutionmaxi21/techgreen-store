/**
 * API SERVICE DEBUG INTEGRATION
 * 
 * Add these code snippets to admin/src/services/apiService.js
 * This will automatically log all API requests and auth operations
 */

// ============================================
// STEP 1: ADD AT THE TOP OF apiService.js
// ============================================

import debugConsole from '../utils/debugConsole';

// Add this variable to track request details
let lastRequestDetails = {
  endpoint: null,
  status: null,
  responseTime: null,
  timestamp: null
};

// ============================================
// STEP 2: WRAP THE apiRequest FUNCTION
// ============================================

// BEFORE the main `const apiRequest = async (endpoint, options = {}, isRetry = false) => {`
// Add this logging wrapper:

const apiRequestWithDebug = async (endpoint, options = {}, isRetry = false) => {
  const startTime = Date.now();
  const requestId = debugConsole.startRequest(endpoint, {
    method: options.method || 'GET',
    headers: options.headers
  });

  try {
    // ORIGINAL apiRequest logic here
    const config = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'admin',
        ...options.headers,
      },
    };

    let storedToken = null
    try {
      if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.getToken) {
        storedToken = await window.electronAPI.getToken()
      }
    } catch (e) {
      storedToken = null
    }

    if (storedToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${storedToken}`;
      debugConsole.debug('TOKEN', 'Using stored Electron token', {
        tokenPreview: storedToken.substring(0, 20) + '...'
      });
    }

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const responseTime = Date.now() - startTime;

    // Log response status
    debugConsole.endRequest(requestId, endpoint, response.status, responseTime);

    if (response.ok) {
      const protectedPrefixes = ['/auth/me', '/users', '/orders', '/products', '/dashboard', '/inventory', '/categories', '/notifications'];
      if (protectedPrefixes.some(prefix => endpoint.startswith(prefix))) {
        lastSuccessfulAuth = Date.now();
        debugConsole.debug('AUTH', 'Protected endpoint accessed successfully', {
          endpoint,
          status: response.status
        });
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      debugConsole.debug('API', `Error response received: ${response.status}`, {
        endpoint,
        status: response.status,
        error: errorData.error?.message || errorData.message
      });

      // If 401 Unauthorized (and not already retrying)
      if (response.status === 401 && !isRetry && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
        debugConsole.logAutoRefresh('401 Unauthorized', Date.now());
        debugConsole.warn('TOKEN', 'Access token expired, attempting refresh');

        const refreshResult = await attemptTokenRefresh();

        if (refreshResult.success) {
          debugConsole.logRefreshSuccess('new access token');
          debugConsole.logRetryRequest(endpoint, 1);
          return apiRequestWithDebug(endpoint, options, true);
        }

        if (refreshResult.isNetworkError) {
          debugConsole.error('NETWORK', 'Network error during refresh', { message: refreshResult.message });
          throw new Error('Connection failed. Please check your internet and try again.');
        }

        if (refreshResult.isTransient) {
          debugConsole.warn('SERVER', 'Transient server error', { message: refreshResult.message });
          throw new Error(refreshResult.message || 'Service temporarily unavailable. Please try again.');
        }

        debugConsole.logRefreshFailure(response.status, 'Session expired');
        debugConsole.logLogout('Auto-refresh failed - session expired');
        broadcastAdminAuthEvent('LOGOUT');

        if (typeof window !== 'undefined' && !window.location.hash.includes('#/login')) {
          window.location.hash = '#/login';
        }

        throw new Error('Session expired. Please login again.');
      }

      const baseMessage = errorData.error?.message
        || errorData.message
        || (typeof errorData.error === 'string' ? errorData.error : 'Unknown error occurred');

      const details = errorData?.error?.details;
      const detailsMessage = Array.isArray(details)
        ? details.map(d => d?.message || d?.field || String(d)).filter(Boolean).join('\n')
        : (typeof details === 'string' ? details : null);

      const errorMessage = detailsMessage && detailsMessage !== baseMessage
        ? `${baseMessage}: ${detailsMessage}`
        : baseMessage;

      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    debugConsole.debug('API', `Response received from ${endpoint}`, {
      endpoint,
      status: response.status,
      responseTime: `${responseTime}ms`,
      dataKeys: Object.keys(responseData)
    });

    return responseData;

  } catch (error) {
    const responseTime = Date.now() - startTime;
    debugConsole.logRequestError(requestId, endpoint, error);
    debugConsole.error('API', `Request failed: ${endpoint}`, {
      endpoint,
      responseTime: `${responseTime}ms`,
      error: error.message
    });

    if (!options.silent) {
      console.error(`API Error [${endpoint}]:`, error);
    }
    throw error;
  }
};

// ============================================
// STEP 3: UPDATE attemptTokenRefresh LOGGING
// ============================================

const attemptTokenRefreshWithDebug = async () => {
  if (isRefreshing && refreshPromise) {
    debugConsole.debug('AUTH', 'Refresh in progress - queuing request');
    return new Promise((resolve) => {
      pendingRequests.push({ resolve });
    });
  }

  const now = Date.now();
  if (now - lastRefreshAttempt < MIN_REFRESH_INTERVAL) {
    debugConsole.warn('AUTH', 'Refresh attempt too soon after last attempt', {
      timeSinceLastAttempt: `${now - lastRefreshAttempt}ms`,
      threshold: `${MIN_REFRESH_INTERVAL}ms`
    });
    
    if (lastRefreshResult && lastRefreshResult.success) {
      return lastRefreshResult;
    }
    return { success: false, message: 'Too many refresh attempts', isTransient: true };
  }

  isRefreshing = true;
  lastRefreshAttempt = Date.now();
  const refreshAttemptTime = new Date(lastRefreshAttempt).toLocaleTimeString();

  debugConsole.logRefreshAttempt('/auth/refresh', 1);
  debugConsole.info('AUTH', 'Sending refresh token cookie', {
    cookieAvailable: true,
    endpoint: '/auth/refresh'
  });

  refreshPromise = (async () => {
    try {
      debugConsole.debug('AUTH', 'Refresh request starting', {
        timestamp: refreshAttemptTime,
        credentials: 'include'
      });

      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Client-Type': 'admin' }
      });

      const responseTime = Date.now() - lastRefreshAttempt;

      debugConsole.debug('AUTH', 'Refresh response received', {
        status: refreshRes.status,
        responseTime: `${responseTime}ms`,
        success: refreshRes.ok
      });

      if (refreshRes.ok) {
        debugConsole.info('AUTH', 'Token refresh successful', {
          status: 200,
          responseTime: `${responseTime}ms`
        });
        lastSuccessfulAuth = Date.now();
        
        try {
          const refreshData = await refreshRes.json();
          if (refreshData.accessToken && typeof window !== 'undefined' && window.electronAPI?.storeToken) {
            await window.electronAPI.storeToken(refreshData.accessToken);
            debugConsole.debug('ELECTRON', 'Token stored in Electron keytar', {
              tokenPreview: refreshData.accessToken.substring(0, 20) + '...'
            });
          }
        } catch (e) {
          debugConsole.debug('ELECTRON', 'Could not update Electron token', { error: e.message });
        }
        
        return { success: true };
      } else {
        const status = refreshRes.status;
        const errorData = await refreshRes.json().catch(() => ({}));
        
        debugConsole.logRefreshFailure(status, errorData.error?.message || 'Unknown error');
        debugConsole.warn('AUTH', 'Refresh token endpoint returned error', {
          status,
          message: errorData.error?.message || errorData.message,
          endpoint: '/auth/refresh'
        });
        
        const message = errorData.error?.message || errorData.message || 'Refresh failed';
        const isTransient = status === 429 || status >= 500;
        
        return { 
          success: false, 
          message: isTransient 
            ? (status === 429 ? 'Too many requests. Please wait a moment.' : 'Server temporarily unavailable.')
            : message,
          isTransient,
          status,
        };
      }
    } catch (err) {
      const isNetworkError = err instanceof TypeError &&
        (err.message.includes('fetch') || err.message.includes('network'));
      
      debugConsole.error('NETWORK', 'Network error during token refresh', {
        error: err.message,
        type: isNetworkError ? 'Network Error' : 'Other Error'
      });
      
      return { success: false, isNetworkError, message: err.message };
    } finally {
      isRefreshing = false;
    }
  })();

  const result = await refreshPromise;
  lastRefreshResult = result;

  const queued = [...pendingRequests];
  pendingRequests = [];
  queued.forEach(({ resolve }) => resolve(result));

  refreshPromise = null;
  return result;
};

// ============================================
// STEP 4: UPDATE LOGIN LOGGING
// ============================================

export const authApi = {
  login: async (email, password) => {
    debugConsole.logLogin(email, true);
    
    const result = await apiRequestWithDebug('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, isAdmin: true }),
    });

    if (result.accessToken) {
      debugConsole.logTokenSet('Access', result.accessToken, Date.now() + 15 * 60 * 1000, {
        expiresIn: '15 minutes'
      });
      debugConsole.info('AUTH', 'Login successful', {
        user: result.user.email,
        role: result.user.role
      });
    }

    // ... rest of login code ...

    updateLastSuccessfulAuth();
    broadcastAdminAuthEvent('LOGIN');

    return result;
  },

  checkSession: async () => {
    debugConsole.debug('AUTH', 'Checking session', { endpoint: '/auth/me' });
    
    try {
      const result = await apiRequestWithDebug('/auth/me', { silent: true });
      if (result.success) {
        debugConsole.logSessionVerification('/auth/me', true, {
          user: result.user.email,
          role: result.user.role
        });
        updateLastSuccessfulAuth();
      }
      return result;
    } catch (err) {
      debugConsole.logSessionVerification('/auth/me', false, {
        error: err.message
      });
      throw err;
    }
  },

  logout: async () => {
    debugConsole.logLogout('User click logout button');
    
    try {
      if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.clearToken) {
        await window.electronAPI.clearToken()
        debugConsole.debug('ELECTRON', 'Token cleared from Electron storage');
      }
    } catch (e) {
      debugConsole.warn('ELECTRON', 'Failed to clear electron token', { error: e.message });
    }

    broadcastAdminAuthEvent('LOGOUT');

    return apiRequestWithDebug('/auth/logout', { 
      method: 'POST', 
      headers: { 'x-client-type': 'admin' } 
    });
  }
};

// ============================================
// STEP 5: EXPORT FOR USE IN COMPONENTS
// ============================================

export { debugConsole };
