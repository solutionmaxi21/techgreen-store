/**
 * Input Sanitization Utilities
 * Strips HTML tags and trims whitespace from user input
 * to prevent stored XSS attacks.
 */

/**
 * Strip HTML tags from a string
 * Removes <script>, <iframe>, event handlers, and all HTML tags
 */
export function stripHtml(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Sanitize a bilingual object { fr: string, ar: string }
 */
export function sanitizeBilingual(input) {
  if (!input || typeof input !== 'object') return input;
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    result[key] = typeof value === 'string' ? stripHtml(value) : value;
  }
  return result;
}

/**
 * Sanitize common text fields in a product payload
 */
export function sanitizeProductData(data) {
  if (!data || typeof data !== 'object') return data;

  const textFields = [
    'name', 'product_name', 'sku', 'brand', 'model_number',
    'description', 'short_description', 'full_description',
    'meta_title', 'meta_description'
  ];

  const sanitized = { ...data };
  for (const field of textFields) {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = stripHtml(sanitized[field]);
    }
  }

  // Handle tags array
  if (Array.isArray(sanitized.tags)) {
    sanitized.tags = sanitized.tags.map(tag =>
      typeof tag === 'string' ? stripHtml(tag) : tag
    );
  }

  return sanitized;
}
