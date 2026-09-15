import { useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for auto-saving form data to localStorage
 * Automatically saves drafts every 30 seconds
 * 
 * @param {Object} formData - The form data to save
 * @param {number} interval - Auto-save interval in milliseconds (default: 30000)
 */
export const useAutoSave = (formData, interval = 30000) => {
  const isFirstRender = useRef(true);

  // Debounced auto-save effect
  useEffect(() => {
    // Skip the first render to prevent overwriting existing drafts with initial empty state
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Only save if there's actual data
    if (!formData || Object.keys(formData).length === 0) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem('product_draft', JSON.stringify({
          data: formData,
          timestamp: Date.now()
        }));
        console.log('✓ Draft auto-saved (debounced)');
      } catch (error) {
        console.error('Failed to auto-save draft:', error);
      }
    }, 2000); // Reduced to 2s for better responsiveness

    return () => clearTimeout(timer);
  }, [formData]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem('product_draft');
      console.log('✓ Draft cleared');
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, []);

  // Load draft from localStorage
  const loadDraft = useCallback(() => {
    try {
      const draft = localStorage.getItem('product_draft');
      if (!draft) return null;

      const { data, timestamp } = JSON.parse(draft);
      const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);

      // Expire drafts older than 24 hours
      if (ageHours > 24) {
        clearDraft();
        return null;
      }

      console.log('✓ Draft loaded (saved ' + Math.round(ageHours) + ' hours ago)');
      return data;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }, [clearDraft]);

  // Check if draft exists
  const hasDraft = useCallback(() => {
    try {
      const draft = localStorage.getItem('product_draft');
      if (!draft) return false;

      const { timestamp } = JSON.parse(draft);
      const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);

      return ageHours <= 24;
    } catch (error) {
      return false;
    }
  }, []);

  return {
    clearDraft,
    loadDraft,
    hasDraft
  };
};
