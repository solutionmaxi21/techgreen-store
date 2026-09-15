/**
 * NotificationsPage.jsx - Admin Notifications Page
 * Full notification history with filtering, pagination, and mark as read
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import notificationAPI from '../services/notificationAPI.js';
import toast from 'react-hot-toast';
import {
    Bell, Package, Truck, Star, RotateCcw, CheckCheck, Filter, ChevronLeft, Loader2
} from 'lucide-react';
import './NotificationsPage.css';

export default function NotificationsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);

    // Fetch notifications
    const fetchNotifications = useCallback(async (cursor = null) => {
        try {
            const limit = 20;
            // Note: The API service doesn't support cursor yet, but backend does
            const result = await notificationAPI.getNotifications(limit, filter, cursor);

            if (result.success) {
                if (cursor) {
                    setNotifications(prev => [...prev, ...(result.data || [])]);
                } else {
                    setNotifications(result.data || []);
                }
                setHasMore(result.pagination?.hasMore || false);
                setNextCursor(result.pagination?.nextCursor || null);
            } else {
                toast.error(t('notifications.loadError', 'Failed to load notifications'));
            }
        } catch (err) {
            console.error('[NotificationsPage] Fetch error:', err);
            toast.error(t('notifications.loadError', 'Failed to load notifications'));
        } finally {
            setLoading(false);
        }
    }, [filter, t]);

    useEffect(() => {
        setLoading(true);
        fetchNotifications();
    }, [filter, fetchNotifications]);

    // Mark as read
    const markAsRead = async (notificationId) => {
        try {
            const result = await notificationAPI.markAsRead(notificationId);
            if (result.success) {
                setNotifications(prev =>
                    prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
                );
            }
        } catch (err) {
            console.error('[NotificationsPage] Mark as read error:', err);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            const result = await notificationAPI.markAllAsRead();
            if (result.success) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                toast.success(t('notifications.markedAllRead', 'All marked as read'));
            }
        } catch (err) {
            console.error('[NotificationsPage] Mark all error:', err);
            toast.error(t('notifications.markError', 'Failed to update'));
        }
    };

    // Handle notification click
    const handleClick = (notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }

        // Navigate based on related entity
        if (notification.action_url) {
            // Convert storefront URLs to admin URLs
            const url = notification.action_url;
            if (url.startsWith('/orders/')) {
                const orderId = url.replace('/orders/', '');
                navigate(`/orders/${orderId}`);
            } else if (url.startsWith('/returns/')) {
                const returnId = url.replace('/returns/', '');
                navigate(`/returns/${returnId}`);
            } else {
                // For other URLs, try to navigate within admin
                navigate(url);
            }
        }
    };

    // Format time
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return t('notifications.justNow', 'Just now');
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}${t('notifications.minutesAgo', 'm ago')}`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}${t('notifications.hoursAgo', 'h ago')}`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}${t('notifications.daysAgo', 'd ago')}`;

        return date.toLocaleDateString();
    };

    // Get icon for notification type
    const getIcon = (type) => {
        switch (type) {
            case 'ORDER_STATUS':
                return <Package className="icon-blue" size={18} />;
            case 'SHIPMENT_UPDATE':
                return <Truck className="icon-cyan" size={18} />;
            case 'RETURN_UPDATE':
                return <RotateCcw className="icon-amber" size={18} />;
            case 'REVIEW_SUBMITTED':
            case 'REVIEW_MODERATED':
                return <Star className="icon-purple" size={18} />;
            default:
                return <Bell className="icon-gray" size={18} />;
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="notifications-page">
            {/* Header */}
            <div className="page-header">
                <div className="header-left">
                    <button className="back-button" onClick={() => navigate(-1)} title={t('common.back')}>
                        <ChevronLeft size={20} />
                    </button>
                    <h1>{t('notifications.title', 'Notifications')}</h1>
                    {unreadCount > 0 && (
                        <span className="unread-badge">{unreadCount}</span>
                    )}
                </div>

                {unreadCount > 0 && (
                    <button className="mark-all-btn" onClick={markAllAsRead}>
                        <CheckCheck size={16} />
                        {t('notifications.markAllRead', 'Mark all as read')}
                    </button>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
                <button
                    className={`tab ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    {t('notifications.filterAll', 'All')}
                </button>
                <button
                    className={`tab ${filter === 'unread' ? 'active' : ''}`}
                    onClick={() => setFilter('unread')}
                >
                    {t('notifications.filterUnread', 'Unread')}
                </button>
                <button
                    className={`tab ${filter === 'read' ? 'active' : ''}`}
                    onClick={() => setFilter('read')}
                >
                    {t('notifications.filterRead', 'Read')}
                </button>
            </div>

            {/* Content */}
            <div className="notifications-content">
                {loading ? (
                    <div className="loading-state">
                        <Loader2 className="spinner" size={32} />
                        <p>{t('notifications.loading', 'Loading...')}</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="empty-state">
                        <Bell size={48} />
                        <h3>{t('notifications.empty', 'No notifications')}</h3>
                        <p>{t('notifications.emptyDesc', 'You have no notifications yet')}</p>
                    </div>
                ) : (
                    <div className="notifications-list">
                        {notifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`notification-card ${!notification.is_read ? 'unread' : ''}`}
                                onClick={() => handleClick(notification)}
                            >
                                <div className="notification-icon">
                                    {getIcon(notification.type)}
                                </div>
                                <div className="notification-body">
                                    <div className="notification-header">
                                        <span className={`notification-title ${!notification.is_read ? 'font-semibold' : ''}`}>
                                            {notification.title}
                                        </span>
                                        <div className="notification-meta">
                                            <span className="notification-time">{formatTime(notification.created_at)}</span>
                                            {!notification.is_read && <div className="unread-dot" />}
                                        </div>
                                    </div>
                                    <p className="notification-message">{notification.message}</p>
                                </div>
                            </div>
                        ))}

                        {/* Load More */}
                        {hasMore && (
                            <div className="load-more">
                                <button
                                    className="load-more-btn"
                                    onClick={() => fetchNotifications(nextCursor)}
                                >
                                    {t('notifications.loadMore', 'Load more')}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
