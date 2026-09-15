# Debug Console Setup & Usage Guide

## Overview
You now have three debugging tools ready to identify the 18-minute logout issue:

1. **debugConsole.js** - Advanced logging for tokens, cookies, API requests, and auth flow
2. **useDebugAuth.js** - React hook for automatic integration
3. **apiServiceDebugIntegration.js** - Code snippets to add detailed API logging

---

## CRITICAL FIRST STEP: Restart Backend
**⚠️ YOU MUST DO THIS BEFORE TESTING ⚠️**

The cookie path change from `/api/auth` to `/` requires the backend to be restarted.

### Windows:
```bash
# In backend folder
cd backend
npm run stop  # or kill the process if running
npm run dev   # or npm start
```

Check the console output for:
```
Server running on http://localhost:3001
✓ Database connected
```

---

## STEP 1: Clear Browser Cookies
Old cookies with `path: '/api/auth'` will interfere with the new path.

### In Admin Panel (http://localhost:3000):
1. Press **F12** to open DevTools
2. Go to **Application** tab → **Cookies**
3. Look for cookies named:
   - `adminAccessToken`
   - `adminRefreshToken`
   - `adminSessionId`
4. **Delete ALL of them** or click **Clear Site Data**
5. **Close the browser tab completely**
6. Restart the app fresh

---

## STEP 2: Initialize Debug Console in App.jsx

Open `admin/src/App.jsx` and add the hook:

```javascript
// At the top of the file, add this import:
import useDebugAuth from './hooks/useDebugAuth';

// Inside the App component, add this line:
function App() {
  // Add this first thing in the component:
  useDebugAuth();
  
  // ... rest of your component code ...
  
  return (
    // ... your JSX ...
  );
}
```

This will automatically initialize the debug console when the app loads.

---

## STEP 3: Optional - Add API Logging (Advanced)

For detailed API request tracking, update `admin/src/services/apiService.js`:

See `apiServiceDebugIntegration.js` for the exact code snippets to add.

This will log:
- Every API request and response
- Token refresh attempts
- Session verification calls
- Login/logout events

---

## STEP 4: Test the Debug Console

### In Browser Console (F12 → Console tab):

```javascript
// View a summary of all events
DEBUG.printSummary()

// View detailed log table
DEBUG.printTable()

// View only token-related events
DEBUG.printTable('TOKEN')

// View only auth events
DEBUG.printTable('AUTH')

// View only API request/response events
DEBUG.printTable('API')

// View only cookie events
DEBUG.printTable('COOKIE')

// Search for specific events
DEBUG.search('refresh')
DEBUG.search('401')

// Check current stored tokens
DEBUG.getCurrentTokenInfo()

// Get all cookies (what browser has)
DEBUG.getAllCookies()

// Export logs as JSON
DEBUG.downloadLogs()

// Get raw log data
DEBUG.getRawLogs()
```

---

## STEP 5: Run the Full 18-Minute Test

1. **Start Fresh:**
   - Backend restarted ✓
   - Cookies cleared ✓
   - New browser tab with admin panel loaded ✓

2. **At 0:00 (Login)**
   - Login with admin credentials
   - Open DevTools (F12)
   - In Console, run: `DEBUG.printSummary()`
   - Should see: `Login event recorded at HH:MM:SS`

3. **At 5 minutes:**
   - Don't do anything, just let the page sit
   - In Console, run: `DEBUG.printTable('TOKEN')`
   - Should see tokens being used normally

4. **At 10 minutes:**
   - Run: `DEBUG.printTable('AUTH')`
   - Look for any auto-refresh attempts
   - Note what refresh attempts occurred (if any)

5. **At 15 minutes:**
   - Access token expires (ACCESS_TOKEN_EXPIRY=15m)
   - Auto-refresh should trigger automatically
   - Run: `DEBUG.search('refresh')`
   - Check if refresh succeeded or failed

6. **At 18 minutes:**
   - **DO: Manually refresh the page (F5)**
   - **IMPORTANT: Keep DevTools open**
   - Run: `DEBUG.printTable('API')`
   - Check the last few API requests before page refresh

7. **After the test:**
   - Run: `DEBUG.downloadLogs()` 
   - This saves a JSON file with all collected data
   - Share this file if the issue persists

---

## What to Look For

### ✅ Healthy Session (At 18+ minutes):
```
TOKEN: Access token set at 12:00:00, expires 12:15:00
AUTH: Auto-refresh completed at 12:13:45
TOKEN: New access token set at 12:13:45
API: GET /api/auth/me - 200 OK at 12:17:30
```

### ❌ Broken Session (Redirects to login):
```
TOKEN: Access token set at 12:00:00, expires 12:15:00
[5+ minutes of no refresh attempts]
API: GET /api/auth/me - 401 Unauthorized at 12:17:30
AUTH: Auto-refresh attempted at 12:17:30
COOKIE: Refresh cookie NOT found when sending to /api/auth/refresh
AUTH: Refresh failed - no cookies sent
[Redirect to login occurs]
```

---

## Debug Methods Reference

```javascript
// Token Monitoring
debugConsole.logTokenSet(type, token, expiryTime, metadata)
debugConsole.logTokenRead(type, token, metadata)
debugConsole.logTokenExpiry(type, expiresAt)

// Cookie Monitoring
debugConsole.logCookiesReceived(endpoint, cookies)
debugConsole.logCookiesSent(endpoint, cookieNames)

// API Tracking
debugConsole.startRequest(endpoint, config)
debugConsole.endRequest(requestId, endpoint, status, responseTime)
debugConsole.logRequestError(requestId, endpoint, error)
debugConsole.logRetryRequest(endpoint, attemptNumber)

// Auth Flow
debugConsole.logLogin(email, successful)
debugConsole.logLogout(reason)
debugConsole.logAutoRefresh(condition, timestamp)
debugConsole.logRefreshAttempt(endpoint, attemptNumber)
debugConsole.logRefreshSuccess(tokenInfo)
debugConsole.logRefreshFailure(status, message)
debugConsole.logSessionVerification(endpoint, success, metadata)

// Query & Export
debugConsole.search(keyword)
debugConsole.printTable(filterType)
debugConsole.printSummary()
debugConsole.exportAsJSON()
debugConsole.exportAsCSV()
debugConsole.downloadLogs()
debugConsole.getRawLogs()

// Debugging
debugConsole.getCurrentTokenInfo()
debugConsole.getAllCookies()
debugConsole.getMemoryStats()
debugConsole.getNetworkStatus()
```

---

## Troubleshooting the Debug Console

**Q: I don't see `DEBUG` in the console**
- A: Make sure useDebugAuth() is added to App.jsx
- Refresh the page and check for initialization message

**Q: Logs are empty**
- A: The app hasn't performed any auth operations yet
- Try logging in again
- Check if App.jsx properly imported useDebugAuth

**Q: I see errors when opening DevTools**
- A: This is normal if the app hasn't initialized yet
- Just try the DEBUG commands again after a few seconds

**Q: How do I clear the logs?**
- A: Close and reopen the browser tab
- Logs are stored in memory and will persist during a session

---

## Next Steps After Testing

1. **If session persists past 18 minutes:** ✅ Issue is FIXED!
   - The cookie path change resolved the problem
   - You can remove debug tools if desired

2. **If still redirected to login at ~18 minutes:** ❓ More investigation needed
   - Upload the downloaded logs
   - Check for patterns in the API/AUTH events
   - Look for any failed cookie transmissions

3. **Expected behavior with the fix:**
   - Access token auto-refreshes at 14:30 (before 15-min expiry)
   - Refresh token cookie is sent with every `/api/auth` request
   - Page refresh at 18+ minutes succeeds
   - No login redirects for 7 days (until refresh token expires)

---

## File Locations

- Debug Console: `admin/src/utils/debugConsole.js` (459 lines)
- Debug Hook: `admin/src/hooks/useDebugAuth.js` (39 lines)
- API Integration: `admin/src/services/apiServiceDebugIntegration.js` (reference)

---

## Quick Command Reference

```javascript
// In browser console, after app loads:

// Check if debug console initialized
typeof DEBUG !== 'undefined' ? 'Debug console ready' : 'Not yet initialized'

// View everything
DEBUG.printSummary()

// Filter by event type
DEBUG.printTable('TOKEN')    // Token events
DEBUG.printTable('AUTH')     // Auth events
DEBUG.printTable('API')      // API requests
DEBUG.printTable('COOKIE')   // Cookie events
DEBUG.printTable('NETWORK')  // Network status

// Search for specific issues
DEBUG.search('401')          // Find auth failures
DEBUG.search('refresh')      // Find refresh attempts
DEBUG.search('error')        // Find errors

// Get detailed state
DEBUG.getCurrentTokenInfo()  // Current token state
DEBUG.getAllCookies()        // Browser cookies
DEBUG.getMemoryStats()       // Memory usage

// Export data
DEBUG.downloadLogs()         // Download JSON file
DEBUG.printChart()           // View as table
```

---

## Progress Tracking

- [x] Backend fix applied (cookie path `/api/auth` → `/`)
- [x] Configuration updated (COOKIE_SECURE=false)
- [x] Debug console created
- [ ] **YOU ARE HERE** → Backend restarted
- [ ] Cookies cleared
- [ ] useDebugAuth() added to App.jsx
- [ ] 18-minute test completed
- [ ] Results analyzed

