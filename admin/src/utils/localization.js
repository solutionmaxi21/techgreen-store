/**
 * Localization Helpers for Admin Panel
 * Utility functions for handling bilingual data in the UI
 */

/**
 * Get the localized text from a bilingual object or string
 * @param {Object|string} value - Bilingual object { fr: "...", ar: "..." } or string
 * @param {string} locale - Target locale ("fr" or "ar"), defaults to "fr"
 * @returns {string} Localized string
 */
export function getLocalizedText(value, locale = 'fr') {
    if (value === null || value === undefined) {
        return '';
    }

    // Already a string
    if (typeof value === 'string') {
        return value;
    }

    // Bilingual object
    if (typeof value === 'object') {
        const targetValue = value[locale];
        if (targetValue && targetValue.trim() !== '') {
            return targetValue;
        }
        // Fallback to French, then Arabic
        return value.fr || value.ar || '';
    }

    return String(value);
}

/**
 * Create a bilingual object from a value
 * @param {string|Object} value - Value to normalize
 * @param {string} locale - Which locale the string value belongs to
 * @returns {Object} Bilingual object { fr: "...", ar: "..." }
 */
export function createBilingual(value, locale = 'fr') {
    // Already bilingual
    if (value && typeof value === 'object' && ('fr' in value || 'ar' in value)) {
        return {
            fr: value.fr || '',
            ar: value.ar || ''
        };
    }

    // Convert string to bilingual
    const stringValue = value != null ? String(value) : '';
    return {
        fr: locale === 'fr' ? stringValue : '',
        ar: locale === 'ar' ? stringValue : ''
    };
}

/**
 * Check if a value is in bilingual format
 * @param {any} value - Value to check
 * @returns {boolean} True if bilingual object
 */
export function isBilingual(value) {
    return (
        value != null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        (typeof value.fr === 'string' || typeof value.ar === 'string')
    );
}

/**
 * Get the current UI locale from i18n
 * @returns {string} Current locale ("fr" or "ar")
 */
export function getCurrentLocale() {
    // Try to get from i18n if available in window
    if (typeof window !== 'undefined') {
        const lang = document.documentElement.lang ||
            localStorage.getItem('i18nextLng') ||
            'fr';
        return lang.startsWith('ar') ? 'ar' : 'fr';
    }
    return 'fr';
}

export default {
    getLocalizedText,
    createBilingual,
    isBilingual,
    getCurrentLocale
};
