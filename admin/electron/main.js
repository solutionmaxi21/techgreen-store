import path from 'path'
import fs from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { app, BrowserWindow, session, ipcMain, net, protocol } from 'electron'
import log from './logger.js'
import { loadWindowState, saveWindowState, applyWindowState } from './windowState.js'
import { createMenu } from './menu.js'

let keytarModule = null
try {
  keytarModule = (await import('keytar')).default
} catch (err) {
  log?.warn?.('Keytar module not available, using memory fallback:', err?.message || err)
}

const memoryStore = new Map()
const keytar = {
  setPassword: async (service, account, password) => {
    if (keytarModule) {
      try { return await keytarModule.setPassword(service, account, password) } catch (e) {}
    }
    memoryStore.set(`${service}:${account}`, password)
    return true
  },
  getPassword: async (service, account) => {
    if (keytarModule) {
      try { return await keytarModule.getPassword(service, account) } catch (e) {}
    }
    return memoryStore.get(`${service}:${account}`) || null
  },
  deletePassword: async (service, account) => {
    if (keytarModule) {
      try { return await keytarModule.deletePassword(service, account) } catch (e) {}
    }
    memoryStore.delete(`${service}:${account}`)
    return true
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Set user data path to AppData so Electron can write cache/cookies
const userDataPath = path.join(
  process.env.APPDATA || path.join(process.env.HOME || '', 'AppData', 'Roaming'),
  'Maxi Store Admin'
)
// CRITICAL: Disable hardware acceleration for Windows Server 2019/RDP performance
app.disableHardwareAcceleration()

app.setPath('userData', userDataPath)

const SERVICE_NAME = 'Maxi Store Admin'
const TOKEN_ACCOUNT = 'admin-access-token'
const REFRESH_TOKEN_ACCOUNT = 'admin-refresh-token'
const isDev = !app.isPackaged
const PRODUCTION_BACKEND_ORIGIN = 'https://api.solutionmaxi.dz'
const DEV_SERVER_URL = 'http://localhost:5174'
const BUILT_INDEX_PATH = path.join(__dirname, '..', 'dist-app', 'index.html')
const BUILT_APP_ROOT = path.dirname(BUILT_INDEX_PATH)
const APP_PROTOCOL_SCHEME = 'maxistore-app'
const APP_PROTOCOL_HOST = 'admin'
const ADMIN_PROTOCOL_SCHEME = 'maxistore-admin'
const ADMIN_DEEP_LINK_ROUTES = new Map([
  ['accept-invite', '/accept-invite'],
  ['reset-password', '/reset-password'],
])

protocol.registerSchemesAsPrivileged([{
  scheme: APP_PROTOCOL_SCHEME,
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true
  }
}])

let mainWindow = null
let pendingAdminDeepLink = null

const handlePackagedAppRequest = (request) => {
  try {
    const requestUrl = new URL(request.url)
    if (requestUrl.hostname !== APP_PROTOCOL_HOST) {
      return new Response('Not found', { status: 404 })
    }

    const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '') || 'index.html'
    const resourcePath = path.resolve(BUILT_APP_ROOT, relativePath)
    const isInsideApp = resourcePath === BUILT_APP_ROOT || resourcePath.startsWith(`${BUILT_APP_ROOT}${path.sep}`)

    if (!isInsideApp || !fs.existsSync(resourcePath) || !fs.statSync(resourcePath).isFile()) {
      return new Response('Not found', { status: 404 })
    }

    return net.fetch(pathToFileURL(resourcePath).toString())
  } catch (error) {
    log.warn('Rejected invalid packaged application URL:', request.url, error?.message || error)
    return new Response('Bad request', { status: 400 })
  }
}

const parseAdminDeepLink = (rawValue) => {
  if (typeof rawValue !== 'string') return null

  try {
    const parsed = new URL(rawValue.replace(/^"|"$/g, ''))
    const route = ADMIN_DEEP_LINK_ROUTES.get(parsed.hostname)
    const validTarget = parsed.protocol === `${ADMIN_PROTOCOL_SCHEME}:` &&
      Boolean(route) &&
      (parsed.pathname === '' || parsed.pathname === '/') &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      !parsed.hash &&
      [...parsed.searchParams.keys()].length === 1
    const token = parsed.searchParams.get('token')

    if (!validTarget || !/^[A-Za-z0-9_-]{43}$/.test(token || '')) return null

    return `${route}?token=${encodeURIComponent(token)}`
  } catch {
    return null
  }
}

const deliverAdminDeepLink = (rawValue) => {
  const route = parseAdminDeepLink(rawValue)
  if (!route) {
    log.warn('Ignored invalid admin account deep link')
    return
  }

  pendingAdminDeepLink = route
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isLoading()) {
    mainWindow.webContents.send('admin-deep-link', route)
    pendingAdminDeepLink = null
  }
}

const registerAdminProtocol = () => {
  if (process.defaultApp && process.argv.length >= 2) {
    return app.setAsDefaultProtocolClient(
      ADMIN_PROTOCOL_SCHEME,
      process.execPath,
      [path.resolve(process.argv[1])]
    )
  }

  return app.setAsDefaultProtocolClient(ADMIN_PROTOCOL_SCHEME)
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  if (!registerAdminProtocol()) {
    log.warn('Unable to register the admin account URL protocol')
  }

  const initialDeepLink = process.argv.find((value) =>
    typeof value === 'string' && value.startsWith(`${ADMIN_PROTOCOL_SCHEME}://`)
  )
  if (initialDeepLink) deliverAdminDeepLink(initialDeepLink)

  app.on('second-instance', (_event, commandLine) => {
    const deepLink = commandLine.find((value) =>
      typeof value === 'string' && value.startsWith(`${ADMIN_PROTOCOL_SCHEME}://`)
    )
    if (deepLink) deliverAdminDeepLink(deepLink)

    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.on('open-url', (event, url) => {
    event.preventDefault()
    deliverAdminDeepLink(url)
  })
}

// Log startup information
log.info('='.repeat(80))
log.info(`Maxi Store Admin v${app.getVersion()} starting...`)
log.info(`Mode: ${isDev ? 'Development' : 'Production'}`)
log.info(`Platform: ${process.platform}`)
log.info(`Electron: ${process.versions.electron}`)
log.info(`Node: ${process.versions.node}`)
log.info(`User Data Path: ${userDataPath}`)
log.info('='.repeat(80))

// Global error handlers
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// IPC handlers for secure token storage
ipcMain.handle('store-token', async (event, token) => {
  try {
    log.info('Storing authentication token')
    await keytar.setPassword(SERVICE_NAME, TOKEN_ACCOUNT, token)
    return true
  } catch (err) {
    log.error('Failed to store token in keytar:', err)
    return false
  }
})

ipcMain.handle('clear-token', async () => {
  try {
    log.info('Clearing authentication token')
    await keytar.deletePassword(SERVICE_NAME, TOKEN_ACCOUNT)
    return true
  } catch (err) {
    log.error('Failed to clear token in keytar:', err)
    return false
  }
})

ipcMain.handle('get-token', async () => {
  try {
    const token = await keytar.getPassword(SERVICE_NAME, TOKEN_ACCOUNT)
    log.debug('Token retrieval:', token ? 'success' : 'no token found')
    return token || null
  } catch (err) {
    log.error('Failed to get token from keytar:', err)
    return null
  }
})

// Refresh token IPC handlers
ipcMain.handle('store-refresh-token', async (event, token) => {
  try {
    log.info('Storing refresh token')
    await keytar.setPassword(SERVICE_NAME, REFRESH_TOKEN_ACCOUNT, token)
    return true
  } catch (err) {
    log.error('Failed to store refresh token in keytar:', err)
    return false
  }
})

ipcMain.handle('get-refresh-token', async () => {
  try {
    const token = await keytar.getPassword(SERVICE_NAME, REFRESH_TOKEN_ACCOUNT)
    log.debug('Refresh token retrieval:', token ? 'success' : 'no token found')
    return token || null
  } catch (err) {
    log.error('Failed to get refresh token from keytar:', err)
    return null
  }
})

ipcMain.handle('clear-refresh-token', async () => {
  try {
    log.info('Clearing refresh token')
    await keytar.deletePassword(SERVICE_NAME, REFRESH_TOKEN_ACCOUNT)
    return true
  } catch (err) {
    log.error('Failed to clear refresh token in keytar:', err)
    return false
  }
})

// Synchronous IPC handlers for app info
ipcMain.on('get-app-version', (event) => {
  event.returnValue = app.getVersion()
})

ipcMain.on('get-platform', (event) => {
  event.returnValue = process.platform
})

function createWindow() {
  log.info('Creating main window...')

  // Load saved window state
  const windowState = loadWindowState()
  log.debug('Window state loaded:', windowState)

  const win = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show until ready
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, '../build/icon.png'), // Set window icon for dev/runtime
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
      // Use a persistent partition for stored cookies/data
      partition: 'persist:maxi-admin',
      // Disable unnecessary features
      webgl: false,
      plugins: false,
      // Security
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    }
  })
  mainWindow = win

  // Apply saved window state
  applyWindowState(win, windowState)

  // Save window state on close
  win.on('close', () => {
    log.info('Saving window state...')
    saveWindowState(win)
  })

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })

  // Show window when ready
  win.once('ready-to-show', () => {
    log.info('Window ready to show')
    win.show()
  })

  // Error handlers
  win.webContents.on('crashed', (event, killed) => {
    log.error('WebContents crashed. Killed:', killed)
  })

  win.webContents.on('unresponsive', () => {
    log.error('WebContents became unresponsive')
  })

  win.webContents.on('responsive', () => {
    log.info('WebContents became responsive again')
  })

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error('Failed to load:', errorCode, errorDescription)
  })

  win.webContents.on('did-finish-load', () => {
    if (pendingAdminDeepLink) {
      win.webContents.send('admin-deep-link', pendingAdminDeepLink)
      pendingAdminDeepLink = null
    }
  })

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const msg = typeof event === 'object' && event.message !== undefined ? event.message : message
    const lvl = typeof event === 'object' && event.level !== undefined ? event.level : level
    const lineNo = typeof event === 'object' && event.lineNumber !== undefined ? event.lineNumber : line
    const src = typeof event === 'object' && event.sourceId !== undefined ? event.sourceId : sourceId
    const levels = ['debug', 'info', 'warn', 'error']
    const logLevel = levels[lvl] || 'info'
    log[logLevel](`[Renderer] ${msg} (${src}:${lineNo})`)
  })

  // Load application
  const loadApp = async () => {
    const forcedUrl = process.env.ELECTRON_START_URL

    if (forcedUrl) {
      log.info('Loading from ELECTRON_START_URL:', forcedUrl)
      await win.loadURL(forcedUrl)
      return
    }

    if (isDev) {
      log.info('Loading from development server:', DEV_SERVER_URL)
      try {
        await win.loadURL(DEV_SERVER_URL)
        win.webContents.openDevTools()
        return
      } catch (err) {
        log.warn('Dev server loadURL failed, trying built app fallback:', err?.message || err)
      }
    }

    if (fs.existsSync(BUILT_INDEX_PATH)) {
      const appUrl = `${APP_PROTOCOL_SCHEME}://${APP_PROTOCOL_HOST}/index.html`
      log.info('Loading packaged application:', appUrl)
      await win.loadURL(appUrl)
      return
    }

    log.info('Built app not found, trying development server as last resort:', DEV_SERVER_URL)
    await win.loadURL(DEV_SERVER_URL)
    if (isDev) {
      win.webContents.openDevTools()
    }
  }

  loadApp().catch(err => {
    log.error('Failed to load application:', err)
  })

  // Create application menu
  createMenu(win)

  return win
}

if (hasSingleInstanceLock) app.whenReady().then(() => {
  log.info('App is ready')

  // Configure Content Security Policy
  const ses = session.fromPartition('persist:maxi-admin')
  ses.protocol.handle(APP_PROTOCOL_SCHEME, handlePackagedAppRequest)
  // Only inject token when renderer hasn't set Authorization header already,
  // and never for auth endpoints (they use HttpOnly cookies for refresh/logout)
  ses.webRequest.onBeforeSendHeaders(
    { urls: [`${PRODUCTION_BACKEND_ORIGIN}/*`] },
    async (details, callback) => {
      // Skip auth endpoints - they rely on cookies, not Bearer tokens
      const url = details.url || ''
      if (url.includes('/auth/refresh') || url.includes('/auth/logout') || url.includes('/auth/login')) {
        callback({ requestHeaders: details.requestHeaders })
        return
      }

      // Only inject if renderer hasn't already set Authorization header
      if (!details.requestHeaders['Authorization']) {
        try {
          const token = await keytar.getPassword(SERVICE_NAME, TOKEN_ACCOUNT)
          if (token) {
            details.requestHeaders['Authorization'] = `Bearer ${token}`
            log.debug('Injected auth header for API request')
          }
        } catch (err) {
          log.error('Error retrieving token for request injection:', err)
        }
      }
      callback({ requestHeaders: details.requestHeaders })
    }
  )

  log.info('Session configured with CSP and request interception')

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      log.info('Activating app, creating new window')
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  log.info('All windows closed')
  if (process.platform !== 'darwin') {
    log.info('Quitting application')
    app.quit()
  }
})

app.on('before-quit', () => {
  log.info('Application quitting...')
})

app.on('will-quit', () => {
  log.info('Application will quit')
})
