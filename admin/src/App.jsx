import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from './layouts/AdminLayout';
import { authApi, broadcastAdminAuthEvent } from './services/apiService'; // Import API + broadcast

// Page Imports
import DashboardPage from './pages/DashboardPage';
import ProductsListPage from './pages/ProductsListPage';
import ProductFormPage from './pages/ProductFormPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import QuickReceiveProductsPage from './pages/QuickReceiveProductsPage';
import IncompleteProductsPage from './pages/IncompleteProductsPage';
import OrdersListPage from './pages/OrdersListPage';
import OrderFormPage from './pages/OrderFormPage'; // Import new page
import OrderDetailPage from './pages/OrderDetailPage';
import UsersListPage from './pages/UsersListPage';
import UserDetailPage from './pages/UserDetailPage';
import UserFormPage from './pages/UserFormPage';
import ReviewsPage from './pages/ReviewsPage';
import SettingsPage from './pages/SettingsPage';
import PromotionsListPage from './pages/PromotionsListPage';
import PromotionFormPage from './pages/PromotionFormPage';
import CategoriesListPage from './pages/CategoriesListPage';
import CategoryFormPage from './pages/CategoryFormPage';
import CategoryDetailPage from './pages/CategoryDetailPage';
import CollectionsListPage from './pages/CollectionsListPage';
import CollectionFormPage from './pages/CollectionFormPage';
import SuppliersListPage from './pages/SuppliersListPage';
import SupplierFormPage from './pages/SupplierFormPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import ReturnsListPage from './pages/ReturnsListPage';
import ReturnDetailPage from './pages/ReturnDetailPage';
import InventoryListPage from './pages/InventoryListPage';
import WarehousesListPage from './pages/WarehousesListPage';
import WarehouseFormPage from './pages/WarehouseFormPage';
import StockAdjustmentPage from './pages/StockAdjustmentPage';
import BarcodeScannerPage from './pages/BarcodeScannerPage';
import LoginPage from './pages/LoginPage';
import TrashPage from './pages/TrashPage';
import NotificationsPage from './pages/NotificationsPage';
import TeamAccessPage from './pages/TeamAccessPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import ForgotAdminPasswordPage from './pages/ForgotAdminPasswordPage';
import ResetAdminPasswordPage from './pages/ResetAdminPasswordPage';
import AccessDeniedPage from './pages/AccessDeniedPage';
import {
  getFirstPermittedPath,
  hasPermission,
  isAdminPanelUser,
  isSuperAdmin,
} from './utils/accessControl';
import { AuthorizationProvider } from './contexts/AuthorizationContext';

import NewsletterSubscribersPage from './pages/NewsletterSubscribersPage';
import NewsletterBroadcastPage from './pages/NewsletterBroadcastPage';

const PermissionRoute = ({ user, permission, superAdminOnly = false, children }) => {
  const allowed = superAdminOnly ? isSuperAdmin(user) : hasPermission(user, permission);
  return allowed ? children : <Navigate to="/access-denied" replace />;
};

function App() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('admin-theme') || 'light';
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial check

  // Ref to track if we're currently verifying (prevents duplicate calls)
  const isVerifying = useRef(false);
  // Ref to invalidate in-flight session checks on manual login
  const authCheckId = useRef(0);
  const isAuthenticatedRef = useRef(false);

  // Verify session helper
  const verifySession = useCallback(async (showLoading = true) => {
    if (isVerifying.current) return;
    isVerifying.current = true;

    const checkId = ++authCheckId.current;

    if (showLoading) setIsLoading(true);

    try {
      const response = await authApi.checkSession();

      // If a newer auth change happened (e.g., manual login), ignore this result
      if (checkId !== authCheckId.current) {
        return;
      }

      if (response.success && response.user) {
        if (isAdminPanelUser(response.user)) {
          setIsAuthenticated(true);
          setCurrentUser(response.user);
          console.log("[App] Session verified, user:", response.user.email);
        } else {
          console.warn("Logged in user is not an admin");
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (err) {
      if (checkId !== authCheckId.current) {
        return;
      }
      console.log("[App] Session check failed:", err.message);

      // Don't force logout on transient errors (network, 429, 5xx)
      // Only logout if it's a clear auth failure (explicit session expiry)
      const isSessionExpired = err.message?.includes('Session expired') ||
        err.message?.includes('Please login again');
      const isTransient = !isSessionExpired && (
        err.message?.includes('temporarily') ||
        err.message?.includes('Too many') ||
        err.message?.includes('Connection failed') ||
        err.message?.includes('network') ||
        err.message?.includes('unavailable') ||
        err.message?.includes('try again'));

      if (isTransient && isAuthenticatedRef.current) {
        console.log("[App] Transient error during session check - keeping current auth state");
        // Don't change auth state - user stays logged in
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } finally {
      if (showLoading) setIsLoading(false);
      isVerifying.current = false;
    }
  }, []);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onAdminDeepLink?.((route) => {
      if (/^\/(?:accept-invite|reset-password)\?token=[A-Za-z0-9_-]{43}$/.test(route)) {
        if (route.startsWith('/reset-password')) {
          authCheckId.current += 1;
          setIsAuthenticated(false);
          setCurrentUser(null);
          authApi.logout().catch(() => {});
        }
        window.location.hash = route;
      }
    });

    return typeof unsubscribe === 'function' ? unsubscribe : undefined;
  }, []);

  // Check Session on App Load
  useEffect(() => {
    verifySession();
  }, [verifySession]);

  // Cross-tab authentication synchronization
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      return;
    }

    try {
      const channel = new BroadcastChannel('admin-auth-sync');

      channel.onmessage = (event) => {
        const { type } = event.data;
        console.log(`[App] Received cross-tab event: ${type}`);

        if (type === 'LOGOUT') {
          // Another admin tab logged out - sync this tab
          console.log('[App] Cross-tab logout detected - syncing...');
          setIsAuthenticated(false);
          setCurrentUser(null);
        }

        if (type === 'LOGIN') {
          // Another admin tab logged in - re-verify
          console.log('[App] Cross-tab login detected - re-verifying...');
          verifySession(false);
        }
      };

      return () => channel.close();
    } catch (err) {
      console.log('[App] BroadcastChannel error:', err);
    }
  }, [verifySession]);

  // Re-verify auth when tab becomes visible (user returns after inactivity)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastVerifyTime = Date.now();
    const MIN_VERIFY_INTERVAL = 5 * 60 * 1000; // 5 minutes

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        const timeSinceLastVerify = Date.now() - lastVerifyTime;

        if (timeSinceLastVerify < MIN_VERIFY_INTERVAL) {
          console.log('[App] Tab became visible but verified recently, skipping');
          return;
        }

        console.log('[App] Tab became visible - re-verifying session...');
        lastVerifyTime = Date.now();
        verifySession(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, verifySession]);

  useEffect(() => {
    // Set data-theme attribute on documentElement
    document.documentElement.setAttribute('data-theme', theme);

    // Persist to localStorage
    localStorage.setItem('admin-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Called by LoginPage on success
  const login = (user) => {
    // Invalidate any in-flight session check so it can't override login
    authCheckId.current += 1;
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  const logout = async () => {
    // MUST clear cookies BEFORE unmounting dashboard components
    // Otherwise, unmounting components' in-flight 401s trigger token refresh
    // which re-sets the cookies we're trying to clear
    try {
      await authApi.logout();
    } catch (e) {
      console.error("Backend logout failed (cookies may persist until expiry):", e);
    }

    // Clear React state AFTER cookies are cleared
    setIsAuthenticated(false);
    setCurrentUser(null);
  };
  const landingPath = getFirstPermittedPath(currentUser);

  // Show nothing or a spinner while checking authentication
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)'
      }}>
        {t('common.loadingAdmin')}
      </div>
    );
  }

  return (
    <Router>
      {!isAuthenticated ? (
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={login} theme={theme} onToggleTheme={toggleTheme} />} />
          <Route path="/forgot-password" element={<ForgotAdminPasswordPage />} />
          <Route path="/reset-password" element={<ResetAdminPasswordPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <AuthorizationProvider user={currentUser}>
          <AdminLayout
            theme={theme}
            onToggleTheme={toggleTheme}
            currentUser={currentUser}
            onLogout={logout}
          >
            <Routes>
            <Route path="/" element={landingPath === '/'
              ? <PermissionRoute user={currentUser} permission="dashboard.read"><DashboardPage /></PermissionRoute>
              : <Navigate to={landingPath} replace />} />
            <Route path="/products" element={<PermissionRoute user={currentUser} permission="products.read"><ProductsListPage /></PermissionRoute>} />
            <Route path="/products/add" element={<PermissionRoute user={currentUser} permission="products.create"><ProductFormPage /></PermissionRoute>} />
            <Route path="/products/quick-receive" element={<PermissionRoute user={currentUser} permission="products.bulk_receive"><QuickReceiveProductsPage /></PermissionRoute>} />
            <Route path="/products/incomplete" element={<PermissionRoute user={currentUser} permission="products.read"><IncompleteProductsPage /></PermissionRoute>} />
            <Route path="/products/:id/edit" element={<PermissionRoute user={currentUser} permission="products.update"><ProductFormPage /></PermissionRoute>} />
            <Route path="/products/:id" element={<PermissionRoute user={currentUser} permission="products.read"><ProductDetailsPage /></PermissionRoute>} />
            <Route path="/orders" element={<PermissionRoute user={currentUser} permission="orders.read"><OrdersListPage /></PermissionRoute>} />
            <Route path="/orders/new" element={<PermissionRoute user={currentUser} permission="orders.create_manual"><OrderFormPage /></PermissionRoute>} />
            <Route path="/orders/:id" element={<PermissionRoute user={currentUser} permission="orders.read"><OrderDetailPage /></PermissionRoute>} />
            <Route path="/users" element={<PermissionRoute user={currentUser} permission="customers.read"><UsersListPage /></PermissionRoute>} />
            <Route path="/users/add" element={<PermissionRoute user={currentUser} superAdminOnly><UserFormPage /></PermissionRoute>} />
            <Route path="/users/:id" element={<PermissionRoute user={currentUser} permission="customers.read"><UserDetailPage /></PermissionRoute>} />
            <Route path="/users/:id/edit" element={<PermissionRoute user={currentUser} permission="customers.update"><UserFormPage /></PermissionRoute>} />
            <Route path="/reviews" element={<PermissionRoute user={currentUser} permission="reviews.read"><ReviewsPage /></PermissionRoute>} />
            <Route path="/promotions" element={<PermissionRoute user={currentUser} permission="promotions.read"><PromotionsListPage /></PermissionRoute>} />
            <Route path="/promotions/new" element={<PermissionRoute user={currentUser} permission="promotions.create"><PromotionFormPage /></PermissionRoute>} />
            <Route path="/promotions/:id" element={<PermissionRoute user={currentUser} permission="promotions.update"><PromotionFormPage /></PermissionRoute>} />
            <Route path="/categories" element={<PermissionRoute user={currentUser} permission="categories.read"><CategoriesListPage /></PermissionRoute>} />
            <Route path="/categories/new" element={<PermissionRoute user={currentUser} permission="categories.create"><CategoryFormPage /></PermissionRoute>} />
            <Route path="/categories/edit/:id" element={<PermissionRoute user={currentUser} permission="categories.update"><CategoryFormPage /></PermissionRoute>} />
            <Route path="/categories/:id" element={<PermissionRoute user={currentUser} permission="categories.read"><CategoryDetailPage /></PermissionRoute>} />
            <Route path="/collections" element={<PermissionRoute user={currentUser} permission="collections.read"><CollectionsListPage /></PermissionRoute>} />
            <Route path="/collections/new" element={<PermissionRoute user={currentUser} permission="collections.create"><CollectionFormPage /></PermissionRoute>} />
            <Route path="/collections/edit/:id" element={<PermissionRoute user={currentUser} permission="collections.update"><CollectionFormPage /></PermissionRoute>} />
            <Route path="/suppliers" element={<PermissionRoute user={currentUser} permission="suppliers.read"><SuppliersListPage /></PermissionRoute>} />
            <Route path="/suppliers/new" element={<PermissionRoute user={currentUser} permission="suppliers.create"><SupplierFormPage /></PermissionRoute>} />
            <Route path="/suppliers/edit/:id" element={<PermissionRoute user={currentUser} permission="suppliers.update"><SupplierFormPage /></PermissionRoute>} />
            <Route path="/suppliers/:id" element={<PermissionRoute user={currentUser} permission="suppliers.read"><SupplierDetailPage /></PermissionRoute>} />
            <Route path="/returns" element={<PermissionRoute user={currentUser} permission="returns.read"><ReturnsListPage /></PermissionRoute>} />
            <Route path="/returns/:id" element={<PermissionRoute user={currentUser} permission="returns.read"><ReturnDetailPage /></PermissionRoute>} />
            <Route path="/inventory" element={<PermissionRoute user={currentUser} permission="inventory.read"><InventoryListPage /></PermissionRoute>} />
            <Route path="/inventory/warehouses" element={<PermissionRoute user={currentUser} permission="warehouses.read"><WarehousesListPage /></PermissionRoute>} />
            <Route path="/inventory/warehouses/new" element={<PermissionRoute user={currentUser} permission="warehouses.create"><WarehouseFormPage /></PermissionRoute>} />
            <Route path="/inventory/warehouses/edit/:id" element={<PermissionRoute user={currentUser} permission="warehouses.update"><WarehouseFormPage /></PermissionRoute>} />
            <Route path="/inventory/adjust/:id" element={<PermissionRoute user={currentUser} permission="inventory.adjust"><StockAdjustmentPage /></PermissionRoute>} />
            <Route path="/barcode-scanner" element={<PermissionRoute user={currentUser} permission="products.barcode.manage"><BarcodeScannerPage /></PermissionRoute>} />
            <Route path="/trash" element={<PermissionRoute user={currentUser} superAdminOnly><TrashPage /></PermissionRoute>} />
            <Route path="/notifications" element={<PermissionRoute user={currentUser} superAdminOnly><NotificationsPage /></PermissionRoute>} />
            <Route path="/newsletter/subscribers" element={<PermissionRoute user={currentUser} permission="newsletter.subscribers.read"><NewsletterSubscribersPage /></PermissionRoute>} />
            <Route path="/newsletter/broadcasts" element={<PermissionRoute user={currentUser} permission="newsletter.broadcasts.read"><NewsletterBroadcastPage /></PermissionRoute>} />
            <Route path="/settings" element={<PermissionRoute user={currentUser} permission="settings.read"><SettingsPage theme={theme} onToggleTheme={toggleTheme} /></PermissionRoute>} />
            <Route path="/team-access" element={<PermissionRoute user={currentUser} superAdminOnly><TeamAccessPage /></PermissionRoute>} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />
            <Route path="/accept-invite" element={<Navigate to={landingPath} replace />} />
            <Route path="/forgot-password" element={<Navigate to={landingPath} replace />} />
            <Route path="/reset-password" element={<Navigate to={landingPath} replace />} />
            <Route path="/login" element={<Navigate to={landingPath} replace />} />
            <Route path="*" element={<Navigate to={landingPath} replace />} />
          </Routes>
          </AdminLayout>
        </AuthorizationProvider>
      )}
    </Router>
  );
}
export default App;
