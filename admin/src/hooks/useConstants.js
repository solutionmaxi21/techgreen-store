// Shared Constants Hook for Admin Panel
// Fetches constants from backend API to ensure consistency

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/backend';

const CONSTANTS_CACHE_KEY = 'app_constants';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export const useConstants = () => {
    const [constants, setConstants] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchConstants = async () => {
            try {
                // Check cache first
                const cached = localStorage.getItem(CONSTANTS_CACHE_KEY);
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CACHE_DURATION) {
                        setConstants(data);
                        setLoading(false);
                        return;
                    }
                }

                // Fetch from API
                const response = await fetch(`${API_BASE_URL}/constants`, {
                    credentials: 'include',
                    headers: { 'X-Client-Type': 'admin' }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch constants');
                }

                const result = await response.json();
                const constantsData = result.data;

                // Cache the result
                localStorage.setItem(CONSTANTS_CACHE_KEY, JSON.stringify({
                    data: constantsData,
                    timestamp: Date.now()
                }));

                setConstants(constantsData);
            } catch (err) {
                console.error('Error fetching constants:', err);
                setError(err.message);

                // Fallback to hardcoded constants if API fails
                setConstants(getFallbackConstants());
            } finally {
                setLoading(false);
            }
        };

        fetchConstants();
    }, []);

    return { constants, loading, error };
};

// Fallback constants in case API is unavailable
const getFallbackConstants = () => ({
    ORDER_STATUSES: {
        PENDING: 'pending',
        PROCESSING: 'processing',
        SHIPPED: 'shipped',
        DELIVERED: 'delivered',
        CANCELLED: 'cancelled'
    },
    PAYMENT_STATUSES: {
        PENDING: 'pending',
        PAID: 'paid',
        FAILED: 'failed',
        REFUNDED: 'refunded'
    },
    USER_ROLES: {
        CUSTOMER: 'customer',
        ADMIN: 'admin'
    },
    PRODUCT_STATUSES: {
        ACTIVE: 'active',
        INACTIVE: 'inactive'
    },
    REVIEW_STATUSES: {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected'
    }
});

export default useConstants;
