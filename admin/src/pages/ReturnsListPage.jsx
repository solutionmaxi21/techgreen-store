import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import { returnApi } from '../services/apiService';
import { formatCurrency, formatDate } from '../utils/formatters';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ResourceError from '../components/ResourceError';
// Using shared styles from /styles folder
import '../styles/layout.css';
import '../styles/forms.css';
//import '../styles/tables.css';

function ReturnsListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadReturns();
    loadStats();
  }, [filters]);

  const loadReturns = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await returnApi.getAll(filters);
      setReturns(data);
    } catch (error) {
      console.error('Failed to load returns:', error);
      setLoadError(error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load returns';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await returnApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Don't show alert for stats failure, just log it
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: '',
      startDate: '',
      endDate: ''
    });
  };

  const handleViewReturn = (returnId) => {
    navigate(`/returns/${returnId}`);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger',
      completed: 'primary'
    };
    return colors[status] || 'gray';
  };

  const columns = [
    {
      key: 'return_number',
      label: t('returns.list.columns.return_number'),
      sortable: true,
      render: (value, row) => (
        <div>
          <span className="font-semibold text-primary cursor-pointer" onClick={() => handleViewReturn(row.return_id)}>
            {value}
          </span>
          {row.return_reason?.startsWith('Delivery failure') && (
            <div style={{ fontSize: '11px', marginTop: '2px' }}>
              <span style={{
                backgroundColor: 'hsl(33 100% 96%)',
                color: 'hsl(26 90% 37%)',
                border: '1px solid hsl(33 100% 80%)',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600
              }}>
                ↩ {t('returns.detail.autoReturn')}
              </span>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'order_number',
      label: t('returns.list.columns.order_number'),
      sortable: true
    },
    {
      key: 'customer_name',
      label: t('returns.list.columns.customer'),
      sortable: true,
      render: (value, row) => (
        <div className="table-cell-user-info">
          <div className="table-cell-name">{row.customer_name || t('common.na')}</div>
          <div className="table-cell-email">{row.customer_email || t('common.na')}</div>
        </div>
      )
    },
    {
      key: 'return_reason',
      label: t('returns.list.columns.reason'),
      render: (value) => {
        const reason = value || t('common.na');
        return (
          <span className="text-sm truncate" title={reason}>
            {reason.length > 30 ? reason.substring(0, 30) + '...' : reason}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: t('returns.list.columns.status'),
      sortable: true,
      render: (value) => (
        <StatusBadge status={value} variant={getStatusColor(value)} />
      )
    },
    {
      key: 'refund_amount',
      label: t('returns.list.columns.refund_amount'),
      sortable: true,
      render: (value) => <span className="font-semibold">{formatCurrency(value)}</span>
    },
    {
      key: 'requested_at',
      label: t('returns.list.columns.requested_at'),
      sortable: true,
      render: (value) => formatDate(value)
    },
    {
      key: 'actions',
      label: t('returns.list.columns.actions'),
      render: (value, row) => (
        <div className="table-cell-actions">
          <button
            className="action-btn-icon view"
            onClick={() => handleViewReturn(row.return_id)}
            title={t('common.view')}
          >
            👁️
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>
            {t('returns.list.title')}
          </h1>
          <p className="page-subtitle">
            {t('returns.list.subtitle')}
            {stats && (
              <>
                <span className="stat-badge stat-badge-warning">{t('returns.list.stats.pending', { count: stats.pending })}</span>
                <span className="stat-badge stat-badge-success">{t('returns.list.stats.approved', { count: stats.approved })}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <p className="stat-label">{t('returns.list.stats.total')}</p>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <p className="stat-label">{t('returns.list.stats.pending', { count: '' }).replace(/^[0-9]+\s*/, '')}</p>
              <p className="stat-value">{stats.pending}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <p className="stat-label">{t('returns.list.stats.approved', { count: '' }).replace(/^[0-9]+\s*/, '')}</p>
              <p className="stat-value">{stats.approved}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <p className="stat-label">{t('returns.list.stats.totalRefunds')}</p>
              <p className="stat-value">{formatCurrency(stats.total_refund_amount)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-header">
          <h3 className="filters-title">{t('common.filters')}</h3>
          <button
            className="clear-filters"
            onClick={handleClearFilters}
          >
            {t('common.clear')}
          </button>
        </div>

        <div className="input-group" style={{ maxWidth: '280px', marginBottom: '16px' }}>
          <div className="input-group-icon"><Search size={16} /></div>
          <input
            type="text"
            placeholder={t('returns.list.searchPlaceholder') || 'Search return #, reason, or notes...'}
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">{t('common.status')}</label>
            <select
              className="form-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">{t('common.all')}</option>
              <option value="pending">{t('returns.list.stats.pending', { count: '' }).trim()}</option>
              <option value="approved">{t('returns.list.stats.approved', { count: '' }).trim()}</option>
              <option value="rejected">{t('status.cancelled')}</option>
              <option value="completed">{t('returns.list.stats.completed', { count: '' }).trim()}</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">{t('orders.list.dateFrom')}</label>
            <input
              type="date"
              className="form-input"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">{t('orders.list.dateTo')}</label>
            <input
              type="date"
              className="form-input"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="section">
        {loadError ? (
          <ResourceError error={loadError} onRetry={loadReturns} />
        ) : (
          <DataTable
            columns={columns}
            data={returns}
            loading={loading}
            emptyMessage={t('returns.list.empty')}
          />
        )}
      </div>
    </div>
  );
}

export default ReturnsListPage;
