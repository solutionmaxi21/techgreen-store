import DOMPurify from 'dompurify';

const HTML_SANITIZE_OPTIONS = Object.freeze({
  USE_PROFILES: { html: true },
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: [
    'base',
    'button',
    'form',
    'input',
    'meta',
    'option',
    'select',
    'textarea',
  ],
  FORBID_ATTR: ['style'],
});

/**
 * Sanitize rich HTML received from the API before inserting it into the DOM.
 *
 * Content is intentionally sanitized at render time rather than mutated so
 * existing product descriptions and newsletter drafts keep their stored value.
 */
export const sanitizeRichHtml = (value) => DOMPurify.sanitize(
  typeof value === 'string' ? value : '',
  HTML_SANITIZE_OPTIONS,
);

