/**
 * Type definitions for Electron APIs exposed via preload script
 */

interface ElectronAPI {
    /**
     * Store authentication token securely in system keychain
     * @param token - The authentication token to store
     * @returns Promise resolving to true if successful, false otherwise
     */
    storeToken: (token: string) => Promise<boolean>;

    /**
     * Clear stored authentication token from system keychain
     * @returns Promise resolving to true if successful, false otherwise
     */
    clearToken: () => Promise<boolean>;

    /**
     * Retrieve stored authentication token from system keychain
     * @returns Promise resolving to the token string or null if not found
     */
    getToken: () => Promise<string | null>;

    /**
     * Get the application version
     * @returns The application version string (e.g., "1.0.0")
     */
    getAppVersion: () => string;

    /**
     * Get the platform information
     * @returns The platform string (e.g., "win32", "darwin", "linux")
     */
    getPlatform: () => string;

    /** Subscribe to validated admin account routes received from the operating system. */
    onAdminDeepLink: (callback: (route: string) => void) => () => void;
}

declare global {
    interface Window {
        /**
         * Electron APIs exposed via context bridge
         * Only available when running in Electron environment
         */
        electronAPI?: ElectronAPI;
    }
}

export { };
