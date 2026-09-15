import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  RefreshCcw,
  Lock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  Activity,
  Clock,
  Eye,
  Download,
  Filter,
  Moon,
  Sun,
  Database,
  Upload,
  HardDrive,
  Loader,
  Trash2
} from 'lucide-react';
import { productApi, orderApi, userApi, reviewApi, databaseApi } from '../services/apiService';
import useConfirmation from '../hooks/useConfirmation';
import { useAuthorization } from '../contexts/AuthorizationContext';
import ResourceError from '../components/ResourceError';
import './SettingsPage.css';

const databaseToolsEnabled = import.meta.env.VITE_SHOW_DATABASE_ADMIN_TOOLS !== 'false';

const SettingsPage = ({ theme, onToggleTheme }) => {
  const { t } = useTranslation();
  const authorization = useAuthorization();
  const canReadProducts = authorization.can('products.read');
  const canReadOrders = authorization.can('orders.read');
  const canReadCustomers = authorization.can('customers.read');
  const canReadReviews = authorization.can('reviews.read');
  const showInventoryTab = canReadProducts;
  const showActivityTab = canReadProducts && canReadOrders;
  const showCustomersTab = canReadCustomers && canReadOrders && canReadReviews;
  const showDatabaseAdminTools = databaseToolsEnabled && authorization.isSuperAdmin;
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    users: 0,
    reviews: 0
  });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [customerActivity, setCustomerActivity] = useState([]);
  const [statsError, setStatsError] = useState(null);
  const [lowStockError, setLowStockError] = useState(null);
  const [activityError, setActivityError] = useState(null);
  const [customerActivityError, setCustomerActivityError] = useState(null);

  // Database import/export state
  const [dbStats, setDbStats] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbMessage, setDbMessage] = useState('');
  const [exportProgress, setExportProgress] = useState('');
  const [importProgress, setImportProgress] = useState('');
  const [selectedDeleteTables, setSelectedDeleteTables] = useState([]);
  const [deleteReason, setDeleteReason] = useState('');
  const fileInputRef = useRef(null);
  const { confirm, prompt, ConfirmationDialog } = useConfirmation();

  const getList = (payload, keys = []) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    for (const key of keys) {
      if (Array.isArray(payload?.[key])) return payload[key];
    }
    return [];
  };

  const getCount = (payload, keys = []) => {
    const total = Number(payload?.total ?? payload?.data?.total ?? payload?.totalCount ?? payload?.count);
    if (Number.isFinite(total)) return total;
    return getList(payload, keys).length;
  };

  const fetchAllPages = async (api, keys = [], pageSize = 200, extraParams = {}) => {
    const first = await api.getAll({ ...extraParams, page: 1, limit: pageSize });
    const items = getList(first, keys);
    const total = Number(first?.total ?? first?.data?.total ?? first?.totalCount ?? first?.count);

    if (!Number.isFinite(total) || items.length >= total) {
      return items;
    }

    const totalPages = Math.ceil(total / pageSize);
    const requests = [];
    for (let page = 2; page <= totalPages; page += 1) {
      requests.push(api.getAll({ ...extraParams, page, limit: pageSize }));
    }

    const results = await Promise.all(requests);
    return results.reduce((acc, res) => acc.concat(getList(res, keys)), items);
  };

  useEffect(() => {
    loadStats();
    if (showInventoryTab) loadLowStockProducts();
    if (showActivityTab) loadActivityLogs();
    if (showCustomersTab) loadCustomerActivity();
    if (showDatabaseAdminTools && activeTab === 'database') {
      loadDatabaseStats();
    }
  }, [activeTab, showInventoryTab, showActivityTab, showCustomersTab, showDatabaseAdminTools]);

  useEffect(() => {
    if (!showDatabaseAdminTools && activeTab === 'database') {
      setActiveTab('overview');
    }
  }, [activeTab, showDatabaseAdminTools]);

  const loadStats = async () => {
    setStatsError(null);
    try {
      const [productsData, ordersData, usersData, reviewsData] = await Promise.all([
        canReadProducts ? productApi.getAll() : null,
        canReadOrders ? orderApi.getAll() : null,
        canReadCustomers ? userApi.getAll() : null,
        canReadReviews ? reviewApi.getAll() : null,
      ]);

      setStats({
        products: productsData ? getCount(productsData, ['products']) : 0,
        orders: ordersData ? getCount(ordersData, ['orders']) : 0,
        users: usersData ? getCount(usersData, ['users']) : 0,
        reviews: reviewsData ? getCount(reviewsData, ['reviews']) : 0,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStatsError(error);
    }
  };

  const loadLowStockProducts = async () => {
    setLowStockError(null);
    try {
      // Fetch all products from API
      const products = await fetchAllPages(productApi, ['products']);

      // Filter for low stock (< 10 units) and sort by quantity ascending
      const lowStock = products
        .map((product) => {
          const rawQuantity = product.quantity ?? product.stock ?? product.totalStock ?? product.total_stock;
          const quantity = Number(rawQuantity);
          return { ...product, quantity };
        })
        .filter(p => Number.isFinite(p.quantity) && p.quantity < 10)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 8);

      setLowStockProducts(lowStock);
    } catch (error) {
      console.error('Failed to load low stock products:', error);
      setLowStockError(error);
    }
  };

  const loadActivityLogs = async () => {
    setActivityError(null);
    try {
      // Fetch recent orders to use as activity logs
      const ordersData = await orderApi.getAll();
      const orders = getList(ordersData, ['orders']);

      // Also fetch recent products
      const productsData = await productApi.getAll();
      const products = getList(productsData, ['products']);

      // Create activity logs from recent data
      const logs = [];

      // Add recent orders as activity
      orders.slice(0, 3).forEach((order, idx) => {
        const statusLabel = order.status ? (t(`status.${order.status}`, { defaultValue: order.status }) || order.status) : '';
        logs.push({
          id: `order-${order.id}`,
          action: t('settings.activity.orderAction', { id: order.id, status: statusLabel }),
          user: t('settings.activity.user.system'),
          timestamp: new Date(order.createdAt || Date.now() - idx * 600000),
          type: 'order'
        });
      });

      // Add recent products as activity
      products.slice(0, 2).forEach((product, idx) => {
        logs.push({
          id: `product-${product.id}`,
          action: t('settings.activity.productAction', { name: product.name }),
          user: t('settings.activity.user.admin'),
          timestamp: new Date(product.createdAt || Date.now() - (3 + idx) * 600000),
          type: 'update'
        });
      });

      // Sort by timestamp descending (newest first)
      logs.sort((a, b) => b.timestamp - a.timestamp);
      setActivityLogs(logs.slice(0, 8));
    } catch (error) {
      console.error('Failed to load activity logs:', error);
      setActivityError(error);
    }
  };

  const loadCustomerActivity = async () => {
    setCustomerActivityError(null);
    try {
      // Fetch orders for customer activity
      const ordersData = await orderApi.getAll();
      const orders = getList(ordersData, ['orders']);

      // Fetch users
      const users = await fetchAllPages(userApi, ['users']);

      // Fetch reviews
      const reviewsData = await reviewApi.getAll();
      const reviews = getList(reviewsData, ['reviews']);

      const activity = [];

      // Add recent orders
      orders.slice(0, 3).forEach((order, idx) => {
        const userId = order.userId ?? order.customer?.id ?? order.user_id ?? order.customer_id;
        const user = users.find(u => u.id === userId);
        activity.push({
          id: `order-${order.id}`,
          name: user?.email?.split('@')[0] || t('settings.customers.userFallback', { id: userId ?? 'N/A' }),
          action: t('settings.customers.actions.completedPurchase'),
          product: order.items?.[0]?.productName || t('settings.customers.productFallback'),
          timestamp: new Date(order.createdAt || Date.now() - idx * 900000)
        });
      });

      // Add recent reviews
      reviews.slice(0, 2).forEach((review, idx) => {
        const userId = review.userId ?? review.user_id ?? review.customer_id;
        const user = users.find(u => u.id === userId);
        activity.push({
          id: `review-${review.id}`,
          name: user?.email?.split('@')[0] || t('settings.customers.userFallback', { id: userId ?? 'N/A' }),
          action: t('settings.customers.actions.leftReview'),
          product: review.productName || t('settings.customers.productFallback'),
          timestamp: new Date(review.createdAt || Date.now() - (3 + idx) * 1500000)
        });
      });

      // Sort by timestamp descending
      activity.sort((a, b) => b.timestamp - a.timestamp);
      setCustomerActivity(activity.slice(0, 8));
    } catch (error) {
      console.error('Failed to load customer activity:', error);
      setCustomerActivityError(error);
    }
  };

  const handleClearCache = () => {
    localStorage.clear();
    setMessage({ type: 'success', text: t('settings.maintenance.cacheCleared') });
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const formatDate = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('settings.activity.time.justNow');
    if (minutes < 60) return t('settings.activity.time.minutesAgo', { count: minutes });
    if (hours < 24) return t('settings.activity.time.hoursAgo', { count: hours });
    if (days < 7) return t('settings.activity.time.daysAgo', { count: days });
    return date.toLocaleDateString();
  };

  const getActivityColor = (type) => {
    const colors = {
      update: 'blue',
      order: 'green',
      inventory: 'orange',
      user: 'purple',
      delete: 'red'
    };
    return colors[type] || 'gray';
  };

  // Database Import/Export Functions
  const loadDatabaseStats = async () => {
    try {
      setDbLoading(true);
      const response = await databaseApi.getStats();
      if (response.success) {
        setDbStats({
          ...response.stats,
          truncation: response.truncation || null,
        });
      }
    } catch (error) {
      console.error('Failed to load database stats:', error);
      setDbMessage({ type: 'error', text: t('settings.database.messages.loadFailed') });
    } finally {
      setDbLoading(false);
    }
  };

  const handleExportDatabase = async () => {
    try {
      setDbLoading(true);
      setExportProgress(t('settings.database.messages.preparingExport'));
      setDbMessage('');

      const response = await databaseApi.exportDatabase();

      if (response.success) {
        setExportProgress(t('settings.database.messages.creatingFile'));

        // Create and download the file
        const dataStr = JSON.stringify(response.export, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `database-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExportProgress('');
        setDbMessage({
          type: 'success',
          text: t('settings.database.messages.exportSuccess', { records: response.export.metadata.totalRecords, tables: response.export.metadata.tableCount })
        });
      } else {
        throw new Error(response.message || t('settings.database.messages.exportFailed'));
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportProgress('');
      setDbMessage({ type: 'error', text: error.message || t('settings.database.messages.exportFailed') });
    } finally {
      setDbLoading(false);
    }
  };

  const handleImportDatabase = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setDbLoading(true);
      setImportProgress(t('settings.database.messages.readingFile'));
      setDbMessage('');

      // Read the file
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      setImportProgress(t('settings.database.messages.parsingData'));
      const importData = JSON.parse(fileContent);

      if (!importData.data || typeof importData.data !== 'object') {
        throw new Error(t('settings.database.messages.invalidFile'));
      }

      setImportProgress(t('settings.database.messages.importing'));
      const response = await databaseApi.importDatabase(importData.data, {
        truncate: false,
        skipErrors: true
      });

      if (response.success) {
        setImportProgress('');
        setDbMessage({
          type: 'success',
          text: t('settings.database.messages.importSuccess', { records: response.results.summary.totalRecordsImported, tables: response.results.summary.tablesProcessed })
        });

        // Reload stats
        await loadDatabaseStats();
        await loadStats();
      } else {
        throw new Error(response.message || t('settings.database.messages.importFailed'));
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportProgress('');
      setDbMessage({ type: 'error', text: error.message || t('settings.database.messages.importFailed') });
    } finally {
      setDbLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateBackup = async () => {
    try {
      setDbLoading(true);
      setDbMessage('');

      const response = await databaseApi.createBackup();

      if (response.success) {
        // Download backup file
        const dataStr = JSON.stringify(response.backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `database-backup-${new Date().toISOString().replace(/:/g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setDbMessage({
          type: 'success',
          text: t('settings.database.messages.backupSuccess', { records: response.backup.metadata.totalRecords })
        });
      } else {
        throw new Error(response.message || t('settings.database.messages.backupFailed'));
      }
    } catch (error) {
      console.error('Backup error:', error);
      setDbMessage({ type: 'error', text: error.message || t('settings.database.messages.backupFailed') });
    } finally {
      setDbLoading(false);
    }
  };

  const toggleDeleteTableSelection = (tableName) => {
    setSelectedDeleteTables((prev) => {
      if (prev.includes(tableName)) {
        return prev.filter((name) => name !== tableName);
      }
      return [...prev, tableName];
    });
  };

  const handleTruncateSelectedTables = async () => {
    if (selectedDeleteTables.length === 0) {
      setDbMessage({ type: 'error', text: t('settings.database.messages.selectTable') });
      return;
    }

    const reason = deleteReason.trim();
    if (reason.length < 10) {
      setDbMessage({ type: 'error', text: t('settings.database.messages.reasonLength') });
      return;
    }

    const password = await prompt({
      title: t('settings.database.messages.verifyPassword'),
      message: t('settings.database.messages.passwordPrompt'),
      confirmText: t('settings.database.messages.verify'),
      cancelText: t('common.cancel'),
      type: 'danger',
      isDangerous: true,
      placeholder: t('settings.database.messages.currentPassword'),
      inputType: 'password',
    });

    if (password === null) {
      return;
    }

    const normalizedTables = [...selectedDeleteTables].sort((a, b) => a.localeCompare(b));
    const expectedText = normalizedTables.join(',');

    const typedConfirmation = await prompt({
      title: t('settings.database.messages.typeConfirmation'),
      message: t('settings.database.messages.typeExactly', { text: expectedText }),
      confirmText: t('settings.database.messages.continue'),
      cancelText: t('common.cancel'),
      type: 'danger',
      isDangerous: true,
      placeholder: expectedText,
    });

    if (typedConfirmation === null) {
      return;
    }

    if ((typedConfirmation || '').trim() !== expectedText) {
      setDbMessage({ type: 'error', text: t('settings.database.messages.confirmationMismatch') });
      return;
    }

    const finalConfirmation = await confirm({
      title: t('settings.database.messages.finalConfirmation'),
      message: t('settings.database.messages.finalWarning'),
      confirmText: t('settings.database.messages.deleteSelected'),
      cancelText: t('common.cancel'),
      isDangerous: true,
      type: 'danger',
    });

    if (!finalConfirmation) {
      return;
    }

    try {
      setDbLoading(true);
      setDbMessage('');

      const verification = await databaseApi.verifyDeletePassword(password);
      if (!verification?.success || !verification?.reauthToken) {
        throw new Error(t('settings.database.messages.passwordFailed'));
      }

      const response = await databaseApi.truncateSelectedTables({
        tables: normalizedTables,
        reason,
        confirmationText: expectedText,
        reauthToken: verification.reauthToken,
      });

      if (!response?.success) {
        throw new Error(response?.message || t('settings.database.messages.deleteFailed'));
      }

      if (response.backup) {
        const dataStr = JSON.stringify(response.backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `database-pre-delete-backup-${new Date().toISOString().replace(/:/g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setDbMessage({
        type: 'success',
        text: t('settings.database.messages.deleteSuccess', { count: response.results?.summary?.tablesProcessed || normalizedTables.length }),
      });

      setSelectedDeleteTables([]);
      setDeleteReason('');
      await loadDatabaseStats();
      await loadStats();
    } catch (error) {
      console.error('Truncate selected tables error:', error);
      setDbMessage({ type: 'error', text: error.message || t('settings.database.messages.deleteFailed') });
    } finally {
      setDbLoading(false);
    }
  };

  const deletableTables = (dbStats?.tables || []).filter((table) => table.deletable);
  const maxTablesPerRequest = dbStats?.truncation?.maxTablesPerRequest || 10;

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1>{t('settings.title')}</h1>
          <p className="page-subtitle">{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="settings-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <TrendingUp size={16} />
          {t('settings.tabs.overview')}
        </button>
        {showInventoryTab && <button
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <AlertTriangle size={16} />
          {t('settings.tabs.inventory')}
        </button>}
        {showActivityTab && <button
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <Activity size={16} />
          {t('settings.tabs.activity')}
        </button>}
        {showCustomersTab && <button
          className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          <UserIcon size={16} />
          {t('settings.tabs.customers')}
        </button>}
        {showDatabaseAdminTools && (
          <button
            className={`tab-btn ${activeTab === 'database' ? 'active' : ''}`}
            onClick={() => setActiveTab('database')}
          >
            <Database size={16} />
            {t('settings.tabs.database')}
          </button>
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="settings-grid-layout">
          <div className="settings-main">
            {/* Quick Stats */}
            <div className="card quick-stats-card">
              <div className="card-header-pro">
                <div className="header-title">
                  <TrendingUp size={20} />
                  <h2>{t('settings.overview.title')}</h2>
                </div>
              </div>
              <div className="card-body-pro">
                {statsError ? (
                  <ResourceError error={statsError} onRetry={loadStats} />
                ) : <div className="quick-stats-grid">
                  <div className="quick-stat">
                    <div className="stat-label">{t('settings.stats.products')}</div>
                    <div className="stat-value">{stats.products}</div>
                  </div>
                  <div className="quick-stat">
                    <div className="stat-label">{t('settings.stats.orders')}</div>
                    <div className="stat-value">{stats.orders}</div>
                  </div>
                  <div className="quick-stat">
                    <div className="stat-label">{t('settings.stats.accounts')}</div>
                    <div className="stat-value">{stats.users}</div>
                  </div>
                </div>}
              </div>
            </div>

            {/* Maintenance */}
            <div className="card settings-section premium-section">
              <div className="card-header-pro">
                <div className="header-title">
                  <RefreshCcw size={20} />
                  <h2>{t('settings.maintenance.title')}</h2>
                </div>
              </div>
              <div className="card-body-pro">
                <div className="settings-item premium-item">
                  <div className="item-info">
                    <div className="item-title">{t('settings.maintenance.clearCacheTitle')}</div>
                    <div className="item-desc">{t('settings.maintenance.clearCacheDesc')}</div>
                  </div>
                  <button onClick={handleClearCache} className="btn-action-primary">
                    <RefreshCcw size={16} />
                    {t('settings.maintenance.clearCacheButton')}
                  </button>
                </div>

                {message && (
                  <div className={`settings-alert premium-alert ${message.type}`}>
                    <div className="alert-icon">
                      {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                    </div>
                    <span className="alert-text">{message.text}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Appearance */}
            <div className="card settings-section premium-section">
              <div className="card-header-pro">
                <div className="header-title">
                  {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                  <h2>{t('settings.appearance.title')}</h2>
                </div>
              </div>
              <div className="card-body-pro">
                <div className="settings-item premium-item toggle-item">
                  <div className="item-info">
                    <div className="item-title">{t('settings.appearance.darkModeTitle')}</div>
                    <div className="item-desc">
                      {theme === 'dark'
                        ? t('settings.appearance.darkModeEnabled')
                        : t('settings.appearance.darkModeDisabled')}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle-switch"
                    checked={theme === 'dark'}
                    onChange={onToggleTheme}
                    aria-label={t('settings.appearance.toggleDarkMode')}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="settings-side">
            {/* Admin Profile */}
            <div className="card premium-profile-card dark-card">
              <div className="premium-profile-header">
                <div className="profile-avatar-large">
                  <UserIcon size={40} />
                </div>
                <span className="status-badge online">{t('settings.profile.statusOnline')}</span>
              </div>
              <div className="card-body-pro">
                <div className="profile-info">
                  <div className="auth-name">{t('settings.profile.name')}</div>
                  <div className="auth-email">admin@maxistore.com</div>
                  <div className="auth-role">
                    <Shield size={12} />
                    {t('settings.profile.role')}
                  </div>
                </div>
                <button className="btn-primary-full">
                  <Lock size={16} />
                  {t('settings.profile.updateSecurity')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Tab */}
      {activeTab === 'inventory' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header-pro">
              <div className="header-title">
                <AlertTriangle size={20} />
                  <h2>{t('settings.lowStock.title')}</h2>
              </div>
              <p className="section-desc">{t('settings.lowStock.subtitle')}</p>
            </div>
            <div className="card-body-pro">
              {lowStockError ? (
                <ResourceError error={lowStockError} onRetry={loadLowStockProducts} />
              ) : lowStockProducts.length > 0 ? (
                <div className="data-table">
                  <div className="table-header">
                    <div className="col-name">{t('settings.lowStock.table.productName')}</div>
                    <div className="col-qty">{t('settings.lowStock.table.stock')}</div>
                    <div className="col-sku">{t('settings.lowStock.table.sku')}</div>
                    <div className="col-action">{t('settings.lowStock.table.action')}</div>
                  </div>
                  {lowStockProducts.map((product) => (
                    <div key={product.id} className="table-row">
                      <div className="col-name">{product.name}</div>
                      <div className="col-qty">
                        <span className={`qty-badge ${product.quantity < 5 ? 'critical' : 'warning'}`}>
                          {product.quantity} {t('settings.lowStock.units')}
                        </span>
                      </div>
                      <div className="col-sku">{product.sku || t('common.na')}</div>
                      <div className="col-action">
                        <button className="link-btn">{t('settings.lowStock.reorder')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <CheckCircle2 size={32} />
                  <p>{t('settings.lowStock.empty')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header-pro">
              <div className="header-title">
                <Activity size={20} />
                  <h2>{t('settings.activity.title')}</h2>
              </div>
              <p className="section-desc">{t('settings.activity.subtitle')}</p>
            </div>
            <div className="card-body-pro">
              {activityError ? (
                <ResourceError error={activityError} onRetry={loadActivityLogs} />
              ) : activityLogs.length > 0 ? (
                <div className="activity-timeline">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="timeline-item">
                      <div className={`timeline-marker ${getActivityColor(log.type)}`}></div>
                      <div className="timeline-content">
                        <div className="log-header">
                          <span className="log-action">{log.action}</span>
                          <span className="log-time">{formatDate(log.timestamp)}</span>
                        </div>
                        <div className="log-user">{t('settings.activity.by', { user: log.user })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Clock size={32} />
                  <p>{t('settings.activity.empty')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="tab-content">
          <div className="card">
            <div className="card-header-pro">
              <div className="header-title">
                <UserIcon size={20} />
                  <h2>{t('settings.customers.title')}</h2>
              </div>
              <p className="section-desc">{t('settings.customers.subtitle')}</p>
            </div>
            <div className="card-body-pro">
              {customerActivityError ? (
                <ResourceError error={customerActivityError} onRetry={loadCustomerActivity} />
              ) : customerActivity.length > 0 ? (
                <div className="customer-activity-list">
                  {customerActivity.map((activity) => (
                    <div key={activity.id} className="activity-card">
                      <div className="activity-avatar">{activity.name.charAt(0)}</div>
                      <div className="activity-details">
                        <div className="activity-header">
                          <span className="customer-name">{activity.name}</span>
                          <span className="activity-time">{formatDate(activity.timestamp)}</span>
                        </div>
                        <div className="activity-action">{activity.action}</div>
                        <div className="activity-product">{activity.product}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Eye size={32} />
                  <p>{t('settings.customers.empty')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Database Tab */}
      {showDatabaseAdminTools && activeTab === 'database' && (
        <div className="settings-grid-layout">
          <div className="settings-main">
            {/* Database Statistics */}
            <div className="card premium-section">
              <div className="card-header-pro">
                <div className="header-title">
                  <HardDrive size={20} />
                  <h2>{t('settings.database.statistics')}</h2>
                </div>
                {dbLoading && (
                  <div className="loading-indicator">
                    <Loader size={16} className="spinner" />
                    <span>{t('common.loading')}</span>
                  </div>
                )}
              </div>
              <div className="card-body-pro">
                {dbStats && (
                  <div className="db-stats-grid">
                    <div className="db-stat-card">
                      <div className="db-stat-icon">
                        <Database size={24} />
                      </div>
                      <div className="db-stat-info">
                        <div className="db-stat-label">{t('settings.database.size')}</div>
                        <div className="db-stat-value">{dbStats.databaseSize}</div>
                      </div>
                    </div>
                    <div className="db-stat-card">
                      <div className="db-stat-icon">
                        <HardDrive size={24} />
                      </div>
                      <div className="db-stat-info">
                        <div className="db-stat-label">{t('settings.database.records')}</div>
                        <div className="db-stat-value">{dbStats.totalRecords.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="db-stat-card">
                      <div className="db-stat-icon">
                        <Activity size={24} />
                      </div>
                      <div className="db-stat-info">
                        <div className="db-stat-label">{t('settings.database.tables')}</div>
                        <div className="db-stat-value">{dbStats.tables.length}</div>
                      </div>
                    </div>
                  </div>
                )}

                {dbStats && dbStats.tables && (
                  <div className="db-tables-list">
                    <h3>{t('settings.database.overview')}</h3>
                    <div className="db-tables-grid">
                      {dbStats.tables.slice(0, 10).map((table) => (
                        <div key={table.name} className="db-table-item">
                          <div className="db-table-name">{table.name}</div>
                          <div className="db-table-meta">
                            <span className="db-table-count">{t('settings.database.rowCount', { count: table.rowCount.toLocaleString() })}</span>
                            <span className="db-table-size">{table.size}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Export Database */}
            <div className="card premium-section">
              <div className="card-header-pro">
                <div className="header-title">
                  <Download size={20} />
                  <h2>{t('settings.database.exportTitle')}</h2>
                </div>
              </div>
              <div className="card-body-pro">
                <div className="settings-item premium-item">
                  <div className="item-info">
                    <div className="item-title">{t('settings.database.exportAll')}</div>
                    <div className="item-desc">
                      {t('settings.database.exportDesc')}
                    </div>
                  </div>
                  <button
                    onClick={handleExportDatabase}
                    className="btn-action-primary"
                    disabled={dbLoading}
                  >
                    <Download size={16} />
                    {t('settings.database.exportButton')}
                  </button>
                </div>
                {exportProgress && (
                  <div className="progress-message">
                    <Loader size={16} className="spinner" />
                    {exportProgress}
                  </div>
                )}
              </div>
            </div>

            {/* Import Database */}
            <div className="card premium-section">
              <div className="card-header-pro">
                <div className="header-title">
                  <Upload size={20} />
                  <h2>{t('settings.database.importTitle')}</h2>
                </div>
              </div>
              <div className="card-body-pro">
                <div className="settings-item premium-item">
                  <div className="item-info">
                    <div className="item-title">{t('settings.database.importData')}</div>
                    <div className="item-desc">
                      {t('settings.database.importDesc')}
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportDatabase}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-action-secondary"
                    disabled={dbLoading}
                  >
                    <Upload size={16} />
                    {t('settings.database.importButton')}
                  </button>
                </div>
                {importProgress && (
                  <div className="progress-message">
                    <Loader size={16} className="spinner" />
                    {importProgress}
                  </div>
                )}
              </div>
            </div>

            {/* Create Backup */}
            <div className="card premium-section">
              <div className="card-header-pro">
                <div className="header-title">
                  <Shield size={20} />
                  <h2>{t('settings.database.backupTitle')}</h2>
                </div>
              </div>
              <div className="card-body-pro">
                <div className="settings-item premium-item">
                  <div className="item-info">
                    <div className="item-title">{t('settings.database.createBackup')}</div>
                    <div className="item-desc">
                      {t('settings.database.backupDesc')}
                    </div>
                  </div>
                  <button
                    onClick={handleCreateBackup}
                    className="btn-action-success"
                    disabled={dbLoading}
                  >
                    <Shield size={16} />
                    {t('settings.database.backupButton')}
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone - Delete Table Data */}
            <div className="card premium-section danger-zone-card">
              <div className="card-header-pro">
                <div className="header-title danger-title">
                  <Trash2 size={20} />
                  <h2>{t('settings.database.dangerTitle')}</h2>
                </div>
              </div>
              <div className="card-body-pro">
                <div className="danger-zone-description">
                  {t('settings.database.dangerDesc')}
                </div>

                <div className="danger-zone-meta">
                  <span>{t('settings.database.maxTables', { count: maxTablesPerRequest })}</span>
                </div>

                {deletableTables.length > 0 ? (
                  <div className="truncate-table-selector">
                    {deletableTables.map((table) => (
                      <label key={table.name} className="truncate-table-option">
                        <input
                          type="checkbox"
                          checked={selectedDeleteTables.includes(table.name)}
                          onChange={() => toggleDeleteTableSelection(table.name)}
                          disabled={
                            dbLoading ||
                            (!selectedDeleteTables.includes(table.name) && selectedDeleteTables.length >= maxTablesPerRequest)
                          }
                        />
                        <span className="truncate-table-name">{table.name}</span>
                        <span className="truncate-table-count">{t('settings.database.rowCount', { count: table.rowCount.toLocaleString() })}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>{t('settings.database.noTables')}</p>
                  </div>
                )}

                <div className="truncate-reason-block">
                  <label htmlFor="truncate-reason" className="truncate-reason-label">
                    {t('settings.database.reason')}
                  </label>
                  <textarea
                    id="truncate-reason"
                    className="truncate-reason-input"
                    value={deleteReason}
                    onChange={(event) => setDeleteReason(event.target.value)}
                    placeholder={t('settings.database.reasonPlaceholder')}
                    rows={3}
                    maxLength={500}
                    disabled={dbLoading}
                  />
                </div>

                <div className="danger-actions">
                  <button
                    onClick={handleTruncateSelectedTables}
                    className="btn-action-danger"
                    disabled={dbLoading || selectedDeleteTables.length === 0 || deleteReason.trim().length < 10}
                  >
                    <Trash2 size={16} />
                    {t('settings.database.deleteSelected')}
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            {dbMessage && (
              <div className={`settings-alert premium-alert ${dbMessage.type}`}>
                <div className="alert-icon">
                  {dbMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                </div>
                <span className="alert-text">{dbMessage.text}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmationDialog />
    </div>
  );
};

export default SettingsPage;
