import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import useConfirmation from '../hooks/useConfirmation';
import Can from '../components/Can';
import ResourceError from '../components/ResourceError';
import { useAuthorization } from '../contexts/AuthorizationContext';
import { Search } from 'lucide-react';
import { promotionApi } from '../services/apiService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getLocalizedText } from '../utils/localization';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
// Using shared styles from /styles folder
import '../styles/layout.css';
import '../styles/forms.css';
//import '../styles/tables.css';

function PromotionsListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { can } = useAuthorization();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    discountType: ''
  });
  const [stats, setStats] = useState({ total: 0, active: 0, scheduled: 0, expired: 0 });
  const { confirm, ConfirmationDialog } = useConfirmation();

  useEffect(() => {
    loadPromotions();
    loadStats();
  }, [filters]);

  const loadPromotions = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await promotionApi.getAll(filters);
      setPromotions(data);
    } catch (error) {
      console.error('Failed to load promotions:', error);
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await promotionApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats({ total: 0, active: 0, scheduled: 0, expired: 0 });
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleRowClick = (promotion) => {
    navigate(`/promotions/${promotion.id}`);
  };

  const handleAddPromotion = () => {
    navigate('/promotions/new');
  };

  const handleDelete = async (promotionId, e) => {
    e.stopPropagation();
    if (await confirm({
      title: t('promotions.delete'),
      message: t('promotions.confirmDelete'),
      confirmText: t('common.delete'),
      isDangerous: true
    })) {
      try {
        await promotionApi.delete(promotionId);
        loadPromotions();
        loadStats();
      } catch (error) {
        console.error('Failed to delete promotion:', error);
        toast.error(t('common.error'));
      }
    }
  };

  const getStatusBadge = (promotion) => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);

    if (startDate > now) {
      return <StatusBadge status="scheduled" label={t('promotions.stats.scheduled')} />;
    } else if (endDate < now) {
      return <StatusBadge status="expired" label={t('promotions.stats.expired')} />;
    } else {
      return <StatusBadge status="active" label={t('status.active')} />;
    }
  };

  const getUsagePercentage = (promotion) => {
    if (!promotion.maxUses) return null;
    const percentage = (promotion.currentUses / promotion.maxUses) * 100;
    return Math.round(percentage);
  };

  const columns = [
    {
      key: 'code',
      label: t('promotions.columns.code'),
      sortable: true,
      render: (value) => <strong className="promo-code">{value}</strong>
    },
    {
      key: 'name',
      label: t('promotions.columns.name'),
      sortable: true,
      render: (value) => getLocalizedText(value, i18n.language)
    },
    {
      key: 'discountType',
      label: t('promotions.columns.discount'),
      render: (value, row) => (
        <div className="discount-info">
          {value === 'percentage' ? (
            <span className="discount-value">{row.discountValue}%</span>
          ) : (
            <span className="discount-value">{formatCurrency(row.discountValue)}</span>
          )}
          <span className="discount-type">
            {value === 'percentage' ? t('promotions.filters.percentage') : t('promotions.filters.fixed')}
          </span>
        </div>
      )
    },
    {
      key: 'minOrderAmount',
      label: t('promotions.columns.minOrder'),
      render: (value) => value > 0 ? formatCurrency(value) : t('promotions.noMinimum')
    },
    {
      key: 'startDate',
      label: t('promotions.columns.startDate'),
      sortable: true,
      render: (value) => formatDate(value)
    },
    {
      key: 'endDate',
      label: t('promotions.columns.endDate'),
      sortable: true,
      render: (value) => formatDate(value)
    },
    {
      key: 'currentUses',
      label: t('promotions.columns.usage'),
      render: (value, row) => {
        const percentage = getUsagePercentage(row);
        return (
          <div className="usage-info">
            <span>{value} / {row.maxUses || '∞'}</span>
            {percentage !== null && (
              <div className="usage-bar">
                <div
                  className="usage-fill"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      label: t('promotions.columns.status'),
      render: (_, row) => getStatusBadge(row)
    },
    {
      key: 'actions',
      label: t('promotions.columns.actions'),
      render: (_, row) => (
        <div className="action-buttons">
          <Can permission="promotions.update">
            <button
              className="btn-icon btn-edit"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/promotions/${row.id}`);
              }}
              title={t('common.edit')}
            >
              ✏️
            </button>
          </Can>
          <Can permission="promotions.delete">
            <button
              className="btn-icon btn-delete"
              onClick={(e) => handleDelete(row.id, e)}
              title={t('common.delete')}
            >
              🗑️
            </button>
          </Can>
        </div>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{t('promotions.title')}</h1>
          <p className="page-description">{t('promotions.subtitle')}</p>
        </div>
        <Can permission="promotions.create">
          <button className="btn-primary" onClick={handleAddPromotion}>
            {t('promotions.add')}
          </button>
        </Can>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
            {t('promotions.stats.total')}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--gray-900)' }}>
            {stats.total}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
            {t('promotions.stats.active')}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
            {stats.active}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
            {t('promotions.stats.scheduled')}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>
            {stats.scheduled}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
            {t('promotions.stats.expired')}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
            {stats.expired}
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="filters-header">
          <h3 className="filters-title">{t('common.filters')}</h3>
          <button
            className="clear-filters"
            onClick={() => setFilters({ search: '', status: '', discountType: '' })}
          >
            {t('common.clear')}
          </button>
        </div>

        <div className="input-group" style={{ maxWidth: '280px', marginBottom: '16px' }}>
          <div className="input-group-icon"><Search size={16} /></div>
          <input
            type="text"
            placeholder={t('promotions.searchPlaceholder') || 'Search by promo code or name...'}
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
              <option value="active">{t('promotions.stats.active')}</option>
              <option value="scheduled">{t('promotions.stats.scheduled')}</option>
              <option value="expired">{t('promotions.stats.expired')}</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">{t('promotions.form.type')}</label>
            <select
              className="form-select"
              value={filters.discountType}
              onChange={(e) => handleFilterChange('discountType', e.target.value)}
            >
              <option value="">{t('promotions.filters.allTypes')}</option>
              <option value="percentage">{t('promotions.filters.percentage')}</option>
              <option value="fixed">{t('promotions.filters.fixed')}</option>
            </select>
          </div>
        </div>
      </div>

      {loadError ? (
        <ResourceError error={loadError} onRetry={loadPromotions} />
      ) : (
        <DataTable
          columns={columns}
          data={promotions}
          loading={loading}
          onRowClick={can('promotions.update') ? handleRowClick : undefined}
          emptyMessage={t('promotions.empty')}
        />
      )}
      {/* Confirmation Modal */}
      <ConfirmationDialog />
    </div>
  );
}

export default PromotionsListPage;
