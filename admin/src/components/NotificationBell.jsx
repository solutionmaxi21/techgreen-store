/**
 * NotificationBell.jsx - Admin Notification Bell Component
 * Professional notification system for admin panel
 * Features: Real-time badge, toast notifications, smart polling
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import styles from './NotificationBell.module.css';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import notificationAPI from '../services/notificationAPI.js';  // ← NEW: Use proper API service

// Icons for notification types
const NotificationIcons = {
  NEW_ORDER: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  NEW_RETURN: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </svg>
  ),
  NEW_REVIEW: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  ORDER_STATUS: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  default: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
};

const getNotificationIcon = (type) => {
  const normalizedType = type?.toUpperCase().replace(/ /g, '_') || 'default';
  return NotificationIcons[normalizedType] || NotificationIcons.default;
};

const getNotificationColor = (type) => {
  const colors = {
    NEW_ORDER: '#10b981',      // green
    NEW_RETURN: '#f59e0b',     // amber
    NEW_REVIEW: '#8b5cf6',     // violet
    ORDER_STATUS: '#3b82f6',   // blue
    RETURN_UPDATE: '#f59e0b',  // amber
    default: '#6b7280',        // gray
  };
  const normalizedType = type?.toUpperCase().replace(/ /g, '_') || 'default';
  return colors[normalizedType] || colors.default;
};

export default function NotificationBell({ isAuthenticated = false }) {
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollingIntervalRef = useRef(null);
  const pollingTimeoutRef = useRef(null);
  const consecutiveErrorsRef = useRef(0);
  const bellRef = useRef(null);
  const panelRef = useRef(null);
  const prevCountRef = useRef(0);
  const basePollingMs = 120000; // 2 minutes

  // Admin-relevant notification types
  const ADMIN_NOTIFICATION_TYPES = ['NEW_ORDER', 'NEW_RETURN', 'NEW_REVIEW', 'LOW_STOCK', 'SYSTEM_ALERT'];

  // Fetch unread count using notificationAPI
  const fetchUnreadCount = useCallback(async () => {
    try {
      // For accurate unread count in admin panel, we fetch all and filter
      // (Backend getUnreadCount doesn't support type filtering yet)
      // background: this runs on a timer, so a transient network failure must
      // not raise a user-facing error — the next poll recovers on its own.
      const result = await notificationAPI.getNotifications(100, 'unread', null, { background: true });

      if (result.success) {
        const filtered = (result.data || []).filter(n =>
          ADMIN_NOTIFICATION_TYPES.includes(n.type?.toUpperCase())
        );
        const newCount = filtered.length;

        // Show toast on new notifications (but not on initial load)
        if (newCount > prevCountRef.current && prevCountRef.current > 0) {
          const diff = newCount - prevCountRef.current;
          toast.success(`${diff} new notification${diff > 1 ? 's' : ''}`);
        }

        prevCountRef.current = newCount;
        setUnreadCount(newCount);
      } else {
        if (result.error && result.error !== 'Access token required') {
          console.debug('[NotificationBell] Not authenticated or session expired');
        }
      }
    } catch (err) {
      if (err?.kind === 'network') {
        console.debug('[NotificationBell] Poll skipped, network unavailable');
      } else {
        console.error('[NotificationBell] Failed to fetch unread count:', err.message);
      }
    }
  }, []);

  // Fetch notifications for panel using notificationAPI
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch more to ensure we have enough after filtering
      const result = await notificationAPI.getNotifications(50, 'all');

      if (result.success) {
        const filtered = (result.data || []).filter(n =>
          ADMIN_NOTIFICATION_TYPES.includes(n.type?.toUpperCase())
        );
        setNotifications(filtered.slice(0, 20));
        setError(null);
      } else {
        console.debug('[NotificationBell] Failed to fetch notifications:', result.error);
        if (result.error && !result.error.includes('Access token required')) {
          setError(result.error);
        }
      }
    } catch (err) {
      console.error('[NotificationBell] Failed to fetch notifications:', err.message);
      if (!err.message.includes('Access token required')) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark notification as read using notificationAPI
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const result = await notificationAPI.markAsRead(notificationId);

      if (result.success) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId
              ? { ...notif, is_read: true }
              : notif
          )
        );
        await fetchUnreadCount();
      } else {
        toast.error(t('notifications.markError'));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      toast.error(t('notifications.markError'));
    }
  }, [fetchUnreadCount]);

  // Mark all as read using notificationAPI
  const markAllAsRead = useCallback(async () => {
    try {
      const result = await notificationAPI.markAllAsRead();

      if (result.success) {
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, is_read: true }))
        );
        setUnreadCount(0);
        toast.success(t('notifications.markedAllRead'));
      } else {
        toast.error(t('notifications.markError'));
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      toast.error(t('notifications.markError'));
    }
  }, []);

  // Setup polling - adaptive, only when active
  useEffect(() => {
    // Only fetch notifications if authenticated
    if (!isAuthenticated) {
      console.debug('[NotificationBell] Not authenticated, skipping notifications');
      return;
    }

    console.debug('[NotificationBell] Authenticated, starting notification polling');
    const isActive = () => !document.hidden && document.hasFocus();

    const clearTimers = () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
      pollingIntervalRef.current = null;
      pollingTimeoutRef.current = null;
    };

    const scheduleNext = (delayMs) => {
      clearTimers();
      pollingTimeoutRef.current = setTimeout(runPoll, delayMs);
    };

    const runPoll = async () => {
      if (!isActive()) return;
      try {
        await fetchUnreadCount();
        consecutiveErrorsRef.current = 0;
        scheduleNext(basePollingMs);
      } catch (e) {
        consecutiveErrorsRef.current += 1;
        const backoff = Math.min(basePollingMs * (2 ** consecutiveErrorsRef.current), 10 * 60 * 1000);
        scheduleNext(backoff);
      }
    };

    const handleVisibilityChange = () => {
      if (!isActive()) {
        clearTimers();
      } else {
        runPoll();
      }
    };

    runPoll();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
      clearTimers();
    };
  }, [fetchUnreadCount, isAuthenticated]);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close panel on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        bellRef.current &&
        !bellRef.current.contains(event.target) &&
        panelRef.current &&
        !panelRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={styles.notificationContainer}>
      {/* Bell Icon Button */}
      <button
        ref={bellRef}
        className={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
        title={t('notifications.title')}
        aria-label={t('notifications.title')}
      >
        <svg
          className={styles.bellIcon}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div ref={panelRef} className={styles.panel}>
          {/* Header */}
          <div className={styles.panelHeader}>
            <h3>{t('notifications.title')}</h3>
            {unreadCount > 0 && (
              <button
                className={styles.markAllButton}
                onClick={markAllAsRead}
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* Content */}
          <div className={styles.panelContent}>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
              </div>
            ) : error ? (
              <div className={styles.error}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p>{t('notifications.loadError')}</p>
                <button className={styles.retryButton} onClick={fetchNotifications}>
                  {t('common.retry')}
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className={styles.empty}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <p>{t('notifications.empty')}</p>
              </div>
            ) : (
              <div className={styles.notificationsList}>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''
                      }`}
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsRead(notification.id);
                      }
                      if (notification.action_url) {
                        // Use hash navigation for admin panel
                        window.location.hash = `#${notification.action_url}`;
                      }
                    }}
                  >
                    <div
                      className={styles.notificationIcon}
                      style={{ backgroundColor: `${getNotificationColor(notification.type)}20`, color: getNotificationColor(notification.type) }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className={styles.notificationContent}>
                      <div className={styles.titleRow}>
                        <p className={styles.title}>{notification.title}</p>
                        {!notification.is_read && (
                          <span className={styles.unreadDot}></span>
                        )}
                      </div>
                      <p className={styles.message}>{notification.message}</p>
                      <p className={styles.time}>
                        {formatTime(new Date(notification.created_at))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className={styles.panelFooter}>
              <button
                className={styles.viewAllButton}
                onClick={() => {
                  setIsOpen(false);
                  // Use hash navigation for HashRouter
                  window.location.hash = '#/notifications';
                }}
              >
              {t('notifications.viewAll')} →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Format time relative to now
 */
function formatTime(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}
