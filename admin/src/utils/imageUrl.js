import { BACKEND_ORIGIN } from '../config/backend';

const PRODUCT_FILE_NAME_REGEX = /^product-\d+-\d+\.(png|jpe?g|webp|gif)$/i;
const CATEGORY_FILE_NAME_REGEX = /^category-\d+-\d+\.(png|jpe?g|webp|gif)$/i;

const normalizeRawString = (value) => {
  if (typeof value !== 'string') return value;

  let next = value.trim();

  // Handle values accidentally serialized as quoted JSON strings.
  if ((next.startsWith('"') && next.endsWith('"')) || (next.startsWith("'") && next.endsWith("'"))) {
    next = next.slice(1, -1);
  }

  // Unescape common JSON escaping artifacts (e.g. https:\/\/host\/uploads\/x.webp).
  next = next.replace(/\\\//g, '/');
  next = next.replace(/\\\\/g, '/');

  return next.trim();
};

const extractRawCandidate = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const normalizedText = normalizeRawString(value);

    // Handle stringified JSON payloads for image arrays/objects.
    if ((normalizedText.startsWith('[') && normalizedText.endsWith(']'))
      || (normalizedText.startsWith('{') && normalizedText.endsWith('}'))) {
      try {
        const parsed = JSON.parse(normalizedText);
        return extractRawCandidate(parsed);
      } catch {
        // Keep using normalized string when it isn't valid JSON.
      }
    }

    return normalizedText;
  }

  if (Array.isArray(value)) {
    for (const candidate of value) {
      const extracted = extractRawCandidate(candidate);
      if (extracted) return extracted;
    }
    return null;
  }

  if (typeof value === 'object') {
    return extractRawCandidate(
      value.url
      || value.image_url
      || value.imageUrl
      || value.image
      || value.image_path
      || value.imagePath
      || value.src
      || value.path
      || value.relativePath
      || value.filename
      || null
    );
  }

  return null;
};

export const normalizeImageUrl = (value) => {
  if (!value) return null;

  const raw = extractRawCandidate(value);

  if (!raw || typeof raw !== 'string') return null;

  const lowered = raw.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined' || lowered === 'nan' || lowered === '[object object]') {
    return null;
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }

  if (raw.startsWith('//')) {
    return `https:${raw}`;
  }

  if (raw.startsWith('www.')) {
    return `https://${raw}`;
  }

  if (raw.startsWith('/uploads/')) {
    return `${BACKEND_ORIGIN}${raw}`;
  }

  if (raw.startsWith('uploads/')) {
    return `${BACKEND_ORIGIN}/${raw}`;
  }

  if (PRODUCT_FILE_NAME_REGEX.test(raw)) {
    return `${BACKEND_ORIGIN}/uploads/products/${raw}`;
  }

  if (CATEGORY_FILE_NAME_REGEX.test(raw)) {
    return `${BACKEND_ORIGIN}/uploads/categories/${raw}`;
  }

  return raw;
};

export const normalizeImageList = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => normalizeImageUrl(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    const raw = normalizeRawString(value);

    if ((raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('{') && raw.endsWith('}'))) {
      try {
        const parsed = JSON.parse(raw);
        return normalizeImageList(parsed);
      } catch {
        // fall through to non-JSON string handling
      }
    }

    // Handle comma-separated image values.
    if (raw.includes(',')) {
      return raw
        .split(',')
        .map((item) => normalizeImageUrl(item))
        .filter(Boolean);
    }

    const single = normalizeImageUrl(raw);
    return single ? [single] : [];
  }

  const single = normalizeImageUrl(value);
  return single ? [single] : [];
};

export const getPrimaryProductImageUrl = (product) => {
  if (!product) return null;

  const directImage = normalizeImageUrl(product.image);
  if (directImage) return directImage;

  const directImageUrl = normalizeImageUrl(product.image_url || product.imageUrl || product.product_image);
  if (directImageUrl) return directImageUrl;

  const normalizedImages = normalizeImageList(product.images);
  if (normalizedImages.length > 0) return normalizedImages[0];

  const normalizedProductImages = normalizeImageList(product.product_images);
  if (normalizedProductImages.length > 0) return normalizedProductImages[0];

  return null;
};
