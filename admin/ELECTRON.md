# Maxi Store Admin - Electron Desktop App

## Overview

The Maxi Store Admin Panel is now packaged as a professional Electron desktop application with enterprise-grade security, user experience features, and production-ready configuration.

## Architecture

### Security Features

- **Context Isolation**: Renderer process is fully isolated from Node.js
- **No Node Integration**: Prevents direct access to Node.js APIs from renderer
- **Preload Script**: Secure IPC bridge with validated communication
- **Content Security Policy (CSP)**: Prevents XSS and injection attacks
- **Secure Token Storage**: Uses system keychain via `keytar` for authentication tokens
- **Request Interception**: Automatically injects auth headers for API calls

### Core Components

#### Main Process (`electron/main.js`)
- Window creation and lifecycle management
- Session configuration with CSP
- IPC handlers for secure token storage
- Application menu setup
- Window state persistence
- Comprehensive error handling and logging

#### Preload Script (`electron/preload.js`)
- Context bridge for secure IPC communication
- Exposes safe APIs to renderer:
  - `storeToken(token)` - Store auth token in keychain
  - `clearToken()` - Remove auth token
  - `getToken()` - Retrieve auth token
  - `getAppVersion()` - Get app version
  - `getPlatform()` - Get platform info

#### Supporting Modules

**`electron/logger.js`**
- Centralized logging with `electron-log`
- File-based logs in user data directory
- Separate console and file log levels

**`electron/windowState.js`**
- Persists window size and position
- Restores state on app launch
- Handles multi-monitor scenarios

**`electron/menu.js`**
- Platform-specific application menu
- Standard keyboard shortcuts
- About dialog with version info

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
cd admin
npm install
```

### Running in Development Mode

```bash
npm run electron:dev
```

This will:
1. Start Vite dev server on port 5174
2. Wait for server to be ready
3. Launch Electron app
4. Open DevTools automatically

The app will load from `http://localhost:5174` with hot module replacement.

### Development Features

- **Hot Reload**: Changes to React code reload automatically
- **DevTools**: Chrome DevTools open by default
- **Detailed Logging**: Console and file logs for debugging
- **Relaxed CSP**: Allows `unsafe-inline` and `unsafe-eval` for development

## Building for Production

### Build Application

```bash
npm run build
```

Builds the Vite application to `dist/` directory.

### Package as Electron App

```bash
npm run electron:build
```

Creates distributable installers in `dist/` directory:
- **NSIS Installer**: Full installer with desktop/start menu shortcuts
- **Portable Executable**: Standalone .exe that doesn't require installation

### Build Options

```bash
# Package without creating installer (for testing)
npm run electron:pack

# Build Windows distributables only
npm run electron:dist
```

### Build Output

After running `electron:build`, you'll find in `dist/`:
- `Maxi Store Admin Setup X.X.X.exe` - NSIS installer
- `MaxiStoreAdmin-Portable.exe` - Portable executable
- `win-unpacked/` - Unpacked application files

## Production Features

### Security

- **CSP Enforced**: Strict Content Security Policy
- **DevTools Disabled**: No access to developer tools
- **Signed Requests**: All API requests include auth headers
- **Secure Storage**: Tokens stored in Windows Credential Manager

### User Experience

- **Window State**: Remembers size and position
- **Application Menu**: Full menu with keyboard shortcuts
- **Desktop Shortcuts**: Created during installation
- **Start Menu**: Application added to Start Menu
- **Uninstaller**: Clean uninstall process

### Performance

- **ASAR Packaging**: Application files compressed in archive
- **Maximum Compression**: Smallest possible file size
- **Optimized Build**: Production Vite build with minification

## Configuration

### Application Info

Defined in `package.json`:
```json
{
  "name": "maxi-store-admin",
  "version": "1.0.0",
  "productName": "Maxi Store Admin",
  "appId": "com.maxistore.admin"
}
```

### Build Configuration

```json
{
  "build": {
    "productName": "Maxi Store Admin",
    "appId": "com.maxistore.admin",
    "compression": "maximum",
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.png"
    }
  }
}
```

## File Locations

### User Data

Application data is stored in:
```
%APPDATA%\Maxi Store Admin\
```

Contains:
- `logs/main.log` - Application logs
- `window-state.json` - Window size/position
- Session data and cookies

### Credentials

Authentication tokens are stored securely in:
- **Windows**: Windows Credential Manager
- Service: "Maxi Store Admin"
- Account: "admin-access-token"

## API Integration

### Backend Connection

The app connects to the backend API at `http://localhost:3001`.

### Authentication Flow

1. User logs in via UI
2. Token received from backend
3. Token stored in system keychain via `electronAPI.storeToken()`
4. All subsequent API requests automatically include `Authorization: Bearer <token>` header
5. On logout, token cleared via `electronAPI.clearToken()`

### Request Interception

The main process intercepts all requests to `http://localhost:3001/*` and automatically injects the Authorization header from the stored token.

## Troubleshooting

### App Won't Start

1. Check logs in `%APPDATA%\Maxi Store Admin\logs\main.log`
2. Ensure backend is running on `http://localhost:3001`
3. Try deleting `%APPDATA%\Maxi Store Admin` and restarting

### Login Issues

1. Verify backend is accessible
2. Check network tab in DevTools (dev mode)
3. Clear stored token: Delete credentials from Windows Credential Manager

### Build Issues

1. Ensure `dist/` folder exists and contains built files
2. Run `npm run build` before `electron:build`
3. Check `build/icon.png` exists

### White Screen

1. Check DevTools console for errors (dev mode)
2. Verify `dist/index.html` exists
3. Check CSP errors in console

## TypeScript Support

TypeScript definitions for Electron APIs are available in `src/types/electron.d.ts`:

```typescript
interface ElectronAPI {
  storeToken: (token: string) => Promise<boolean>;
  clearToken: () => Promise<boolean>;
  getToken: () => Promise<string | null>;
  getAppVersion: () => string;
  getPlatform: () => string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
```

Use in your code:
```typescript
if (window.electronAPI) {
  const token = await window.electronAPI.getToken();
  const version = window.electronAPI.getAppVersion();
}
```

## Future Enhancements

### Auto-Updates (Not Implemented)

To add auto-updates:
1. Set up a release server
2. Add `publish` configuration to `package.json`
3. Implement update checking in main process
4. Use `electron-updater` package

### Code Signing (Recommended for Production)

To sign the application:
1. Obtain a code signing certificate
2. Add certificate configuration to `package.json`
3. Set environment variables for certificate password
4. Run build with signing enabled

### macOS/Linux Support

The configuration supports cross-platform builds:
- Add `mac` and `linux` targets to build config
- Generate platform-specific icons
- Test on each platform

## License

MIT

---

**Built with ❤️ for Maxi Store**
