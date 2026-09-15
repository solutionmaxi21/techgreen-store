// ============================================
// Currency & Number Formatting Utilities
// ============================================

/**
 * Format amount as Algerian Dinars
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '0 DA';
  return `${Number(amount).toLocaleString('fr-DZ')} DA`;
};

/**
 * Format number with thousand separators
 * @param {number} num - Number to format
 * @returns {string} - Formatted number string
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('fr-DZ');
};

/**
 * Parse currency string to number
 * @param {string} str - Currency string (e.g., "100,000 DA")
 * @returns {number} - Parsed number
 */
export const parseCurrency = (str) => {
  if (!str) return 0;
  return Number(String(str).replace(/[^\d.-]/g, ''));
};

/**
 * Format percentage
 * @param {number} value - Percentage value
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted percentage string
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
};

/**
 * Format date to locale string
 * @param {string|Date} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '-';
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  return new Date(date).toLocaleDateString('fr-DZ', defaultOptions);
};

/**
 * Format datetime to locale string
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted datetime string
 */
export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-DZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export default {
  formatCurrency,
  formatNumber,
  parseCurrency,
  formatPercentage,
  formatDate,
  formatDateTime,
  formatFileSize,
  truncateText
};
