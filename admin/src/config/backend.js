const trimTrailingSlashes = (value) => value.replace(/\/+$/, '');
const DEFAULT_HOSTED_API_BASE_URL = 'https://techgreen-store.onrender.com/api';
const DEFAULT_STOREFRONT_ORIGIN = 'https://techgreen-store.vercel.app';

const isElectronRenderer = () =>
  typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';

const getDefaultHost = () => {
  if (typeof window === 'undefined') return 'localhost';

  const host = window.location?.hostname;
  if (!host || host === '0.0.0.0' || host === '[::]') {
    return 'localhost';
  }

  return host;
};

const getDefaultApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_HOSTED_API_BASE_URL;
  }

  // In Electron (dev + production), default to the hosted backend.
  if (isElectronRenderer()) {
    return DEFAULT_HOSTED_API_BASE_URL;
  }

  const protocol = window.location?.protocol;
  const port = window.location?.port;

  // In Vite dev/preview, use relative /api so proxy rules in vite.config.js apply.
  if (protocol?.startsWith('http') && (port === '5174' || port === '4173')) {
    return '/api';
  }

  // In Electron production (file://), call backend directly on default local backend port.
  return `http://${getDefaultHost()}:3001/api`;
};

export const API_BASE_URL = trimTrailingSlashes(
  import.meta.env.VITE_API_URL || getDefaultApiBaseUrl()
);

export const BACKEND_ORIGIN = API_BASE_URL.endsWith('/api')
  ? API_BASE_URL.slice(0, -4)
  : API_BASE_URL;

export const STOREFRONT_ORIGIN = trimTrailingSlashes(
  import.meta.env.VITE_STOREFRONT_URL || DEFAULT_STOREFRONT_ORIGIN
);
