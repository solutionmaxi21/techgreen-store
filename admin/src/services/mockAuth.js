import { API_BASE_URL } from '../config/backend';

// ============================================
// Authentication Service - Real API Integration
// Connects to backend API for user authentication
// ============================================

const API_URL = `${API_BASE_URL}/auth`;

/**
 * Authenticate user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - User object if authenticated
 */
export const login = async (email, password) => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Login failed');
    }

    const data = await response.json();
    
    // Store token and user data (backend returns 'accessToken', not 'token')
    const token = data.accessToken || data.token;
    localStorage.setItem('admin-token', token);
    localStorage.setItem('admin-refresh-token', data.refreshToken);
    localStorage.setItem('admin-user', JSON.stringify(data.user));
    
    return data.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Verify if a token is valid
 * @param {string} token - Auth token
 * @returns {Promise<Object|null>} - User object if valid, null otherwise
 */
export const verifyToken = async (token) => {
  try {
    if (!token) {
      return null;
    }

    const response = await fetch(`${API_URL}/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.valid && data.user) {
      // Update stored user data
      localStorage.setItem('admin-user', JSON.stringify(data.user));
      return data.user;
    }
    
    return null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

/**
 * Logout (clear session)
 */
export const logout = async () => {
  try {
    const token = localStorage.getItem('admin-token');
    
    if (token) {
      // Call logout endpoint
      await fetch(`${API_URL}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage regardless of API call success
    localStorage.removeItem('admin-token');
    localStorage.removeItem('admin-user');
  }
};

/**
 * Get current authenticated user
 * @returns {Object|null} - Current user or null
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('admin-user');
  if (!userStr) {
    return null;
  }
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    return null;
  }
};

/**
 * Get authentication token
 * @returns {string|null} - Auth token or null
 */
export const getToken = () => {
  return localStorage.getItem('admin-token');
};

/**
 * Get refresh token
 * @returns {string|null} - Refresh token or null
 */
export const getRefreshToken = () => {
  return localStorage.getItem('admin-refresh-token');
};

/**
 * Refresh access token using refresh token
 * @returns {Promise<string|null>} - New access token or null
 */
export const refreshAccessToken = async () => {
  try {
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
      return null;
    }

    const response = await fetch(`${API_URL}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Refresh token is invalid or expired, clear everything
      localStorage.removeItem('admin-token');
      localStorage.removeItem('admin-refresh-token');
      localStorage.removeItem('admin-user');
      return null;
    }

    const data = await response.json();
    
    // Store new access token
    const newToken = data.accessToken || data.token;
    localStorage.setItem('admin-token', newToken);
    
    return newToken;
  } catch (error) {
    console.error('Token refresh error:', error);
    // Clear tokens on error
    localStorage.removeItem('admin-token');
    localStorage.removeItem('admin-refresh-token');
    localStorage.removeItem('admin-user');
    return null;
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  const token = getToken();
  const user = getCurrentUser();
  return !!(token && user && user.role === 'admin');
};

export default {
  login,
  logout,
  verifyToken,
  getCurrentUser,
  getToken,
  getRefreshToken,
  refreshAccessToken,
  isAuthenticated
};
