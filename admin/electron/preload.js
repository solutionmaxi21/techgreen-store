import { contextBridge, ipcRenderer } from 'electron'

let pendingAdminDeepLink = null
const adminDeepLinkListeners = new Set()

ipcRenderer.on('admin-deep-link', (_event, route) => {
  if (
    typeof route !== 'string'
    || !/^\/(?:accept-invite|reset-password)\?token=[A-Za-z0-9_-]{43}$/.test(route)
  ) return

  if (adminDeepLinkListeners.size === 0) {
    pendingAdminDeepLink = route
    return
  }

  for (const listener of adminDeepLinkListeners) listener(route)
})

/**
 * @typedef {Object} ElectronAPI
 * @property {(token: string) => Promise<boolean>} storeToken - Store authentication token securely
 * @property {() => Promise<boolean>} clearToken - Clear stored authentication token
 * @property {() => Promise<string|null>} getToken - Retrieve stored authentication token
 * @property {() => string} getAppVersion - Get application version
 * @property {() => string} getPlatform - Get platform information
 * @property {(callback: (route: string) => void) => () => void} onAdminDeepLink - Subscribe to validated admin account links
 */

/**
 * Expose secure Electron APIs to the renderer process
 * All IPC communication is validated and sandboxed
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Access token management (secure storage via keytar)
  storeToken: (token) => {
    if (typeof token !== 'string' || !token) {
      return Promise.resolve(false)
    }
    return ipcRenderer.invoke('store-token', token)
  },

  clearToken: () => ipcRenderer.invoke('clear-token'),

  getToken: () => ipcRenderer.invoke('get-token'),

  // Refresh token management (secure storage via keytar)
  storeRefreshToken: (token) => {
    if (typeof token !== 'string' || !token) {
      return Promise.resolve(false)
    }
    return ipcRenderer.invoke('store-refresh-token', token)
  },

  clearRefreshToken: () => ipcRenderer.invoke('clear-refresh-token'),

  getRefreshToken: () => ipcRenderer.invoke('get-refresh-token'),

  // Application information (read-only, safe to expose)
  getAppVersion: () => ipcRenderer.sendSync('get-app-version'),

  getPlatform: () => ipcRenderer.sendSync('get-platform'),

  onAdminDeepLink: (callback) => {
    if (typeof callback !== 'function') return () => {}

    adminDeepLinkListeners.add(callback)
    if (pendingAdminDeepLink) {
      const route = pendingAdminDeepLink
      pendingAdminDeepLink = null
      callback(route)
    }

    return () => adminDeepLinkListeners.delete(callback)
  }
})
