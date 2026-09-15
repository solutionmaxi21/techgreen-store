/**
 * ADVANCED DEBUG CONSOLE - Token & Auth Monitoring
 * 
 * This utility provides comprehensive logging for authentication flows
 * Inject this into your frontend to monitor token lifecycle and API requests
 * 
 * Usage: 
 *   1. Save this as: admin/src/utils/debugConsole.js
 *   2. Import in admin/src/App.jsx at the top
 *   3. Call: initDebugConsole() in your app initialization
 *   4. Open browser console to see all debug messages
 */

export class DebugConsole {
  constructor() {
    this.logs = [];
    this.maxLogs = 500;
    this.startTime = Date.now();
    this.requestIdCounter = 0;
    this.filterLevel = 'DEBUG'; // DEBUG, INFO, WARN, ERROR
    this.enableFileExport = true;
  }

  /**
   * Get elapsed time since initialization
   */
  getElapsed() {
    return Math.round(Date.now() - this.startTime);
  }

  /**
   * Format timestamp
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  }

  /**
   * Core logging function
   */
  log(level, category, message, data = null) {
    const timestamp = Date.now();
    const elapsed = this.getElapsed();
    
    const logEntry = {
      timestamp,
      time: this.formatTime(timestamp),
      elapsed: `+${elapsed}ms`,
      level,
      category,
      message,
      data,
      url: typeof window !== 'undefined' ? window.location.href : 'N/A',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
    };

    // Store in memory
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Format console output
    const prefix = `[${logEntry.time}] [${elapsed}ms] [${category}]`;
    const colors = {
      'DEBUG': '#888888',
      'INFO': '#0066cc',
      'WARN': '#ff8800',
      'ERROR': '#cc0000'
    };
    const color = colors[level] || '#000000';

    // Console output with styling
    if (data) {
      console.log(
        `%c${prefix} ${message}`,
        `color: ${color}; font-weight: bold;`,
        data
      );
    } else {
      console.log(
        `%c${prefix} ${message}`,
        `color: ${color}; font-weight: bold;`
      );
    }

    return logEntry;
  }

  // ============================================
  // PUBLIC LOGGING METHODS
  // ============================================

  debug(category, message, data = null) {
    return this.log('DEBUG', category, message, data);
  }

  info(category, message, data = null) {
    return this.log('INFO', category, message, data);
  }

  warn(category, message, data = null) {
    return this.log('WARN', category, message, data);
  }

  error(category, message, data = null) {
    return this.log('ERROR', category, message, data);
  }

  // ============================================
  // TOKEN MONITORING
  // ============================================

  logTokenSet(tokenType, tokenValue, expiryTime, attributes = {}) {
    const shortToken = tokenValue ? `${tokenValue.substring(0, 20)}...` : 'NONE';
    const expiresIn = expiryTime ? Math.round((expiryTime - Date.now()) / 1000) : 'N/A';
    
    this.info('TOKEN', `${tokenType} token SET`, {
      tokenPreview: shortToken,
      expiresIn: `${expiresIn}s`,
      attributes
    });
  }

  logTokenRead(tokenType, tokenValue, attributes = {}) {
    const shortToken = tokenValue ? `${tokenValue.substring(0, 20)}...` : 'NONE';
    
    this.debug('TOKEN', `${tokenType} token READ`, {
      tokenFound: !!tokenValue,
      tokenPreview: shortToken,
      attributes
    });
  }

  logTokenExpiry(tokenType, timeRemaining) {
    const minutes = Math.round(timeRemaining / 60000);
    const seconds = Math.round((timeRemaining % 60000) / 1000);
    
    if (timeRemaining < 0) {
      this.warn('TOKEN', `${tokenType} token EXPIRED!`, {
        expiredBy: `${Math.abs(seconds)}s`
      });
    } else if (timeRemaining < 60000) {
      this.warn('TOKEN', `${tokenType} token expiring soon`, {
        timeRemaining: `${seconds}s`
      });
    } else {
      this.debug('TOKEN', `${tokenType} token still valid`, {
        timeRemaining: `${minutes}m ${seconds}s`
      });
    }
  }

  // ============================================
  // COOKIE MONITORING
  // ============================================

  logCookiesReceived(responseHeaders, cookieNames = []) {
    const setCookieHeaders = responseHeaders['set-cookie'] || [];
    const cookies = {};
    
    setCookieHeaders.forEach(header => {
      const parts = header.split(';');
      const [name, value] = parts[0].split('=');
      const attrs = {};
      
      parts.slice(1).forEach(part => {
        const [key, val] = part.trim().split('=');
        attrs[key] = val || true;
      });
      
      cookies[name.trim()] = {
        value: value ? `${value.substring(0, 15)}...` : 'EMPTY',
        attributes: attrs
      };
    });

    this.info('COOKIE', `Received ${setCookieHeaders.length} Set-Cookie header(s)`, cookies);
    return cookies;
  }

  logCookiesRead(cookieName, cookieValue) {
    const shortVal = cookieValue ? `${cookieValue.substring(0, 15)}...` : 'NOT_FOUND';
    
    this.debug('COOKIE', `Read cookie: ${cookieName}`, {
      found: !!cookieValue,
      value: shortVal
    });
  }

  logCookieSent(endpoint, cookieNames = []) {
    this.debug('COOKIE', `Cookies sent to ${endpoint}`, {
      count: cookieNames.length,
      cookies: cookieNames
    });
  }

  // ============================================
  // API REQUEST/RESPONSE MONITORING
  // ============================================

  startRequest(endpoint, options = {}) {
    const requestId = ++this.requestIdCounter;
    
    this.debug('API', `[${requestId}] REQUEST START: ${options.method || 'GET'} ${endpoint}`, {
      requestId,
      endpoint,
      method: options.method || 'GET',
      headers: options.headers
    });

    return requestId;
  }

  endRequest(requestId, endpoint, status, responseTime, responseData = null) {
    const statusColor = status >= 400 ? 'ERROR' : status >= 300 ? 'WARN' : 'INFO';
    const logMethod = statusColor === 'INFO' ? 'info' : statusColor === 'WARN' ? 'warn' : 'error';

    this[logMethod]('API', `[${requestId}] REQUEST END: ${endpoint} - Status ${status}`, {
      requestId,
      status,
      responseTime: `${responseTime}ms`,
      success: status < 400,
      dataKeys: responseData ? Object.keys(responseData) : []
    });
  }

  logRequestError(requestId, endpoint, error) {
    this.error('API', `[${requestId}] REQUEST ERROR: ${endpoint}`, {
      requestId,
      endpoint,
      errorType: error.constructor.name,
      errorMessage: error.message,
      stack: error.stack
    });
  }

  // ============================================
  // AUTH FLOW MONITORING
  // ============================================

  logLogin(email, success = true, errorMessage = null) {
    if (success) {
      this.info('AUTH', 'LOGIN ATTEMPT', { email });
    } else {
      this.error('AUTH', 'LOGIN FAILED', { email, error: errorMessage });
    }
  }

  logSessionVerification(endpoint, success, data = null) {
    if (success) {
      this.info('AUTH', `Session verification SUCCESS: ${endpoint}`, data);
    } else {
      this.warn('AUTH', `Session verification FAILED: ${endpoint}`, data);
    }
  }

  logAutoRefresh(trigger, startTime) {
    this.info('AUTH', 'AUTO-REFRESH TRIGGERED', {
      trigger,
      timestamp: this.formatTime(startTime)
    });
  }

  logRefreshAttempt(endpoint, attemptNumber = 1) {
    this.info('AUTH', `Refresh token attempt ${attemptNumber}`, {
      endpoint,
      attempt: attemptNumber
    });
  }

  logRefreshSuccess(newTokenPreview) {
    this.info('AUTH', 'REFRESH TOKEN SUCCESS', {
      newTokenPreview: `${newTokenPreview.substring(0, 20)}...`,
      newTokenLength: newTokenPreview.length
    });
  }

  logRefreshFailure(status, message) {
    this.error('AUTH', 'REFRESH TOKEN FAILED', {
      status,
      message,
      isTransient: status >= 500 || status === 429
    });
  }

  logRetryRequest(originalEndpoint, attempt) {
    this.debug('AUTH', `Retrying original request: ${originalEndpoint}`, {
      attempt,
      originalEndpoint
    });
  }

  logLogout(reason = 'User initiated') {
    this.info('AUTH', 'LOGOUT', { reason });
  }

  // ============================================
  // BROWSER STATE MONITORING
  // ============================================

  logPageVisibility(visible) {
    this.info('BROWSER', `Page visibility changed: ${visible ? 'VISIBLE' : 'HIDDEN'}`, {
      timestamp: this.formatTime(Date.now())
    });
  }

  logNetworkStatus(online) {
    this.warn('BROWSER', `Network status: ${online ? 'ONLINE' : 'OFFLINE'}`, {
      timestamp: this.formatTime(Date.now())
    });
  }

  logMemoryUsage() {
    if (performance && performance.memory) {
      this.debug('BROWSER', 'Memory usage', {
        usedJSHeapSize: `${Math.round(performance.memory.usedJSHeapSize / 1048576)}MB`,
        jsHeapSizeLimit: `${Math.round(performance.memory.jsHeapSizeLimit / 1048576)}MB`,
        percentUsed: `${Math.round(performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit * 100)}%`
      });
    }
  }

  // ============================================
  // STORAGE & EXPORT
  // ============================================

  /**
   * Get all logs
   */
  getAllLogs() {
    return this.logs;
  }

  /**
   * Get logs by category
   */
  getLogs(category) {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Search logs
   */
  search(keyword) {
    return this.logs.filter(log => 
      log.message.includes(keyword) || 
      JSON.stringify(log.data).includes(keyword)
    );
  }

  /**
   * Export logs as JSON
   */
  exportAsJSON() {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Export logs as CSV
   */
  exportAsCSV() {
    const headers = ['Time', 'Elapsed', 'Level', 'Category', 'Message', 'Data'];
    const rows = this.logs.map(log => [
      log.time,
      log.elapsed,
      log.level,
      log.category,
      log.message,
      JSON.stringify(log.data)
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Download logs to file
   */
  downloadLogs(format = 'json') {
    const content = format === 'json' ? this.exportAsJSON() : this.exportAsCSV();
    const filename = `debug-logs-${Date.now()}.${format === 'json' ? 'json' : 'csv'}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    
    this.info('SYSTEM', 'Logs downloaded', { filename, format });
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
    this.info('SYSTEM', 'Logs cleared', {});
  }

  /**
   * Print summary
   */
  printSummary() {
    const summary = {
      totalLogs: this.logs.length,
      byLevel: {
        DEBUG: this.getLogsByLevel('DEBUG').length,
        INFO: this.getLogsByLevel('INFO').length,
        WARN: this.getLogsByLevel('WARN').length,
        ERROR: this.getLogsByLevel('ERROR').length
      },
      byCategory: {},
      uptime: `${Math.round(this.getElapsed() / 1000)}s`
    };

    const categories = new Set(this.logs.map(l => l.category));
    categories.forEach(cat => {
      summary.byCategory[cat] = this.logs.filter(l => l.category === cat).length;
    });

    console.group('%c📊 DEBUG CONSOLE SUMMARY', 'font-size: 14px; font-weight: bold; color: #0066cc;');
    console.table(summary);
    console.groupEnd();
  }

  /**
   * Print all logs in table format
   */
  printTable(filterCategory = null) {
    const logs = filterCategory 
      ? this.logs.filter(l => l.category === filterCategory)
      : this.logs;

    console.group(`%c📋 DEBUG LOGS (${logs.length} total)`, 'font-size: 14px; font-weight: bold; color: #0066cc;');
    console.table(logs.map(l => ({
      'Time': l.time,
      'Elapsed': l.elapsed,
      'Level': l.level,
      'Category': l.category,
      'Message': l.message,
      'Data': l.data ? JSON.stringify(l.data).substring(0, 50) + '...' : 'N/A'
    })));
    console.groupEnd();
  }
}

// Create global instance
const debugConsole = new DebugConsole();

// Make available globally for console access
if (typeof window !== 'undefined') {
  window.DEBUG = debugConsole;
}

export default debugConsole;

// ============================================
// CONSOLE COMMANDS REFERENCE
// ============================================
/*
 * Available Commands (in browser console):
 * 
 * DEBUG.getAllLogs()                    - Get all logs
 * DEBUG.getLogs('AUTH')                 - Get AUTH category logs
 * DEBUG.getLogsByLevel('ERROR')         - Get all ERROR logs
 * DEBUG.search('refresh')               - Search logs
 * DEBUG.exportAsJSON()                  - Export as JSON
 * DEBUG.exportAsCSV()                   - Export as CSV
 * DEBUG.downloadLogs('json')            - Download logs to file
 * DEBUG.clearLogs()                     - Clear all logs
 * DEBUG.printSummary()                  - Print summary table
 * DEBUG.printTable()                    - Print all logs table
 * DEBUG.printTable('API')               - Print API logs table
 */
