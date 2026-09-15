/**
 * notificationAPI.js - Notification Service Module
 * Centralized API service for all notification operations
 * Uses shared apiRequest for automatic token refresh and auth handling
 */

import { apiRequest } from './apiService.js';

export const notificationAPI = {
  /**
   * Get unread count
   */
  async getUnreadCount({ background = false } = {}) {
    try {
      const result = await apiRequest('/notifications/unread-count', { background });
      return {
        success: result && !result.error,
        unreadCount: result?.unreadCount || 0,
        error: result?.error
      };
    } catch (error) {
      console.error('[NotificationAPI] getUnreadCount error:', error);
      return { success: false, unreadCount: 0, error: error.message };
    }
  },

  /**
   * Get paginated notifications
   */
  async getNotifications(limit = 20, filter = 'all', cursor = null, { background = false } = {}) {
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        filter: String(filter),
      });
      if (cursor !== null && cursor !== undefined) {
        params.set('cursor', String(cursor));
      }

      const result = await apiRequest(`/notifications?${params.toString()}`, { background });
      return {
        success: result && !result.error,
        data: result?.data || [],
        pagination: result?.pagination || {},
        error: result?.error
      };
    } catch (error) {
      console.error('[NotificationAPI] getNotifications error:', error);
      return { success: false, data: [], pagination: {}, error: error.message };
    }
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const result = await apiRequest(`/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });
      return {
        success: result?.success || false,
        message: result?.message,
        error: result?.error
      };
    } catch (error) {
      console.error('[NotificationAPI] markAsRead error:', error);
      return { success: false, message: null, error: error.message };
    }
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      const result = await apiRequest('/notifications/mark-all-read', {
        method: 'PATCH'
      });
      return {
        success: result?.success || false,
        count: result?.count || 0,
        error: result?.error
      };
    } catch (error) {
      console.error('[NotificationAPI] markAllAsRead error:', error);
      return { success: false, count: 0, error: error.message };
    }
  },

  /**
   * Delete notification
   */
  async deleteNotification(notificationId) {
    try {
      const result = await apiRequest(`/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      return {
        success: result?.success || false,
        message: result?.message,
        error: result?.error
      };
    } catch (error) {
      console.error('[NotificationAPI] deleteNotification error:', error);
      return { success: false, message: null, error: error.message };
    }
  },

  /**
   * Get notification preferences
   */
  async getPreferences() {
    try {
      const result = await apiRequest('/notifications/preferences');
      return {
        success: result && !result.error,
        preferences: result?.data || {},
        error: result?.error
      };
    } catch (error) {
      console.error('[NotificationAPI] getPreferences error:', error);
      return { success: false, preferences: {}, error: error.message };
    }
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences) {
    try {
      const result = await apiRequest('/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(preferences)
      });
      return {
        success: result?.success || false,
        preferences: result?.data || {},
        error: result?.error
      };
    } catch (error) {
      console.error('[NotificationAPI] updatePreferences error:', error);
      return { success: false, preferences: {}, error: error.message };
    }
  }
};

export default notificationAPI;
