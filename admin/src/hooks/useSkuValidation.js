import { useState, useMemo, useCallback } from 'react';
import { productApi } from '../services/apiService';
import i18n from '../i18n/config';

/**
 * Debounce utility function
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Custom hook for SKU validation with debounced API calls
 * Checks SKU uniqueness in real-time
 */
export const useSkuValidation = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isValid, setIsValid] = useState(null);
  const [message, setMessage] = useState('');

  const checkSkuAvailability = useCallback(async (sku, options = {}) => {
    if (!sku || sku.length < 3) {
      setIsValid(null);
      setMessage('');
      setIsChecking(false);
      return;
    }

    // Validate SKU format
    const skuRegex = /^[A-Za-z0-9-_]+$/;
    if (!skuRegex.test(sku)) {
      setIsValid(false);
      setMessage(i18n.t('wizard.step1.sku_hint'));
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    try {
      // FIXED: Use centralized productApi.validateSku() instead of direct fetch
      // This ensures:
      // 1. Cookie-based authentication (credentials: 'include')
      // 2. Proper error handling and token refresh
      // 3. Consistent API_BASE usage
      // 4. X-Client-Type header for admin identification
      const data = await productApi.validateSku(sku, options);
      const available = data.available ?? false;

      setIsValid(available);
      setMessage(available ? `✓ ${i18n.t('wizard.step1.sku_available')}` : `✗ ${i18n.t('wizard.step1.sku_exists')}`);
    } catch (error) {
      console.error('SKU validation error:', error);
      // Don't block the user - treat as "unknown" rather than invalid
      setIsValid(null);
      setMessage(i18n.t('wizard.step1.sku_verify_failed'));
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Debounced validation function
  const validateSku = useMemo(
    () => debounce(checkSkuAvailability, 500),
    [checkSkuAvailability]
  );

  const reset = useCallback(() => {
    setIsChecking(false);
    setIsValid(null);
    setMessage('');
  }, []);

  return {
    isChecking,
    isValid,
    message,
    validateSku,
    reset
  };
};
