import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Search, Download, Filter, Calendar, FileText, ChevronRight, Plus } from 'lucide-react';
import { orderApi } from '../services/apiService';
import { formatCurrency } from '../utils/formatters';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Can from '../components/Can';
import ResourceError from '../components/ResourceError';
import './OrdersListPage.css';

function OrdersListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    search: '',
    dateFrom: '',
    dateTo: ''
  });

  const statusTabsList = useMemo(() => [
    { id: 'all', label: t('orders.list.tabs.all') },
    { id: 'needs_confirmation', label: t('orders.list.tabs.needsConfirmation') || '⚠️ Needs Confirmation', special: true },
    { id: 'pending', label: t('status.pending') },
    { id: 'processing', label: t('status.processing') },
    { id: 'shipped', label: t('status.shipped') },
    { id: 'delivered', label: t('status.delivered') },
    { id: 'cancelled', label: t('status.cancelled') }
  ], [t]);

  useEffect(() => {
    loadOrders();
  }, [filters, activeTab]);

  useEffect(() => {
    // Load all orders on mount for tab counts
    loadAllOrdersForCounts();
  }, []);

  const loadAllOrdersForCounts = async () => {
    try {
      const response = await orderApi.getAll({});
      const ordersData = Array.isArray(response) ? response : (response.data || []);
      setAllOrders(ordersData);
    } catch (error) {
      console.error('Failed to load all orders for counts:', error);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let ordersData;

      // Special handling for needs_confirmation tab
      if (activeTab === 'needs_confirmation') {
        const response = await orderApi.needsConfirmation();
        ordersData = Array.isArray(response) ? response : (response.data || []);
      } else {
        const filterParams = {
          ...filters,
          status: activeTab !== 'all' ? activeTab : undefined
        };
        const response = await orderApi.getAll(filterParams);
        ordersData = Array.isArray(response) ? response : (response.data || []);
      }

      setOrders(ordersData);
      // Update allOrders if we're on 'all' tab with no filters
      if (activeTab === 'all' && !filters.search && !filters.dateFrom && !filters.dateTo) {
        setAllOrders(ordersData);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSort = (key, direction) => {
    const sorted = [...orders].sort((a, b) => {
      let valA = a[key];
      let valB = b[key];

      if (key === 'createdAt' || key === 'date') {
        valA = new Date(a.createdAt || a.date).getTime();
        valB = new Date(b.createdAt || b.date).getTime();
      }

      if (direction === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });
    setOrders(sorted);
  };

  const handleRowClick = (order) => {
    navigate(`/orders/${order.id}`);
  };

  const handleExport = async () => {
    try {
      const filterParams = {
        ...filters,
        status: activeTab !== 'all' ? activeTab : undefined
      };
      const blob = await orderApi.exportCSV(filterParams);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export orders:', error);
      toast.error(t('orders.list.exportFailed'));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('common.na');
    const locale = i18n.language === 'ar' ? 'ar-DZ' : 'fr-DZ';
    return new Date(dateString).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusCounts = () => {
    return statusTabsList.map(tab => {
      if (tab.id === 'all') {
        return { ...tab, count: allOrders.length };
      } else if (tab.id === 'needs_confirmation') {
        return {
          ...tab,
          count: allOrders.filter(order => order.status === 'awaiting_confirmation').length
        };
      } else {
        return { ...tab, count: allOrders.filter(order => order.status === tab.id).length };
      }
    });
  };

  const columns = [
    {
      key: 'orderNumber',
      label: t('table.order_id'),
      sortable: true,
      width: '140px',
      render: (value) => <span className="order-number">{value}</span>
    },
    {
      key: 'createdAt',
      label: t('table.placed_on'),
      sortable: true,
      width: '180px',
      render: (value, row) => formatDate(value || row.date)
    },
    {
      key: 'customerName',
      label: t('table.customer'),
      sortable: true,
      render: (value, row) => (
        <div className="customer-cell">
          <div className="customer-name">{value || row.customer?.name || t('common.guest')}</div>
          <div className="customer-email">{row.customerEmail || row.customer?.email || ''}</div>
        </div>
      )
    },
    {
      key: 'itemCount',
      label: t('table.items'),
      width: '100px',
      render: (value, row) => value || row.items?.length || 0
    },
    {
      key: 'total',
      label: t('table.amount'),
      sortable: true,
      width: '140px',
      render: (value) => <span className="order-total">{formatCurrency(value)}</span>
    },
    {
      key: 'status',
      label: t('table.status'),
      width: '140px',
      render: (value) => <StatusBadge status={value} type="order" />
    },
    {
      key: 'action_icon',
      label: '',
      width: '50px',
      render: () => <ChevronRight size={18} color="var(--gray-400)" />
    }
  ];

  return (
    <div className="orders-list-page">
      <div className="page-header">
        <div>
          <h1>{t('orders.list.title')}</h1>
          <p className="page-subtitle">{t('orders.list.subtitle')}</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
          <Can permission="orders.export">
            <button className="btn-secondary" onClick={handleExport}>
              <Download size={18} />
              {t('orders.list.export')}
            </button>
          </Can>
          <Can permission="orders.create_manual">
            <button className="btn-primary" onClick={() => navigate('/orders/new')}>
              <Plus size={18} />
              {t('orders.list.create_new', 'Create Order')}
            </button>
          </Can>
        </div>
      </div>

      <div className="status-tabs">
        {getStatusCounts().map(tab => (
          <button
            key={tab.id}
            className={`status-tab ${activeTab === tab.id ? 'active' : ''} ${tab.special ? 'special-tab' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={tab.special ? { backgroundColor: 'var(--warning-bg, #fffbeb)', borderColor: 'var(--warning-color)' } : {}}
          >
            <span className="tab-label">{tab.label}</span>
            <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="filters-section">
        <div className="filters-header">
          <h3 className="filters-title">{t('common.filters')}</h3>
          <button
            className="clear-filters"
            onClick={() => setFilters({ search: '', dateFrom: '', dateTo: '' })}
          >
            {t('common.clear')}
          </button>
        </div>

        <div className="input-group" style={{ maxWidth: '280px', marginBottom: '16px' }}>
          <div className="input-group-icon"><Search size={16} /></div>
          <input
            type="text"
            placeholder={t('orders.list.searchPlaceholder') || 'Search order #, customer name, or email...'}
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">{t('orders.list.dateFrom')}</label>
            <input
              type="date"
              className="form-input"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">{t('orders.list.dateTo')}</label>
            <input
              type="date"
              className="form-input"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="table-actions">
        <div className="results-count">
          {t('orders.list.showing', { count: orders.length })}
        </div>
      </div>

      {loadError ? <ResourceError error={loadError} onRetry={loadOrders} /> : <DataTable
        columns={columns}
        data={orders}
        onSort={handleSort}
        onRowClick={handleRowClick}
        loading={loading}
        emptyMessage={t('orders.list.empty')}
      />}
    </div>
  );
}

export default OrdersListPage;
