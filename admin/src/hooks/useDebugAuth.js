/**
 * useDebugAuth Hook
 * 
 * Integrates the debug console with your API service
 * Tracks all authentication operations and API calls
 * 
 * Usage:
 *   import { useDebugAuth } from './hooks/useDebugAuth';
 *   
 *   function MyComponent() {
 *     useDebugAuth();  // Call once in your app
 *     // ... rest of component
 *   }
 */

import { useEffect, useRef } from 'react';
import debugConsole from '../utils/debugConsole';

export const useDebugAuth = () => {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    console.group('%c🔍 DEBUG CONSOLE INITIALIZED', 'font-size: 16px; font-weight: bold; color: #0066cc; background: #e6f2ff; padding: 5px;');
    console.log('Advanced debugging enabled. Commands available in browser console:');
    console.log('  DEBUG.printSummary()     - Show summary');
    console.log('  DEBUG.printTable()       - Show all logs');
    console.log('  DEBUG.printTable("API")  - Show API logs');
    console.log('  DEBUG.downloadLogs()    - Download logs');
    console.log('  DEBUG.search("term")    - Search logs');
    console.groupEnd();

    debugConsole.info('SYSTEM', 'Debug Console Initialized', {
      version: '1.0.0',
      features: ['Token Monitoring', 'Cookie Tracking', 'API Request Logging', 'Auth Flow Tracking']
    });

    // Monitor page visibility
    const handleVisibilityChange = () => {
      debugConsole.logPageVisibility(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Monitor network status
    const handleOnline = () => debugConsole.logNetworkStatus(true);
    const handleOffline = () => debugConsole.logNetworkStatus(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor memory periodically
    const memoryInterval = setInterval(() => {
      debugConsole.logMemoryUsage();
    }, 30000); // Every 30 seconds

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(memoryInterval);
    };
  }, []);

  return debugConsole;
};

export default useDebugAuth;
