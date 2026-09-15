import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import useConfirmation from '../hooks/useConfirmation';
import Can from '../components/Can';
import ResourceError from '../components/ResourceError';
import {
  Star,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  Filter,
  MoreVertical,
  ThumbsUp,
  MessageSquare,
  AlertCircle,
  Package,
  User as UserIcon,
  Calendar,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { reviewApi } from '../services/apiService';
import { formatDate } from '../utils/formatters';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import './ReviewsPage.css';

function ReviewsPage() {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const { confirm, prompt, ConfirmationDialog } = useConfirmation();

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    rating: ''
  });
  const [selectedReviews, setSelectedReviews] = useState([]);

  useEffect(() => {
    loadReviews();
  }, [filters]);

  const loadReviews = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await reviewApi.getAll(filters);
      const reviewsData = Array.isArray(response) ? response : (response.data || []);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Failed to load reviews:', error);
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSort = (key, direction) => {
    const sorted = [...reviews].sort((a, b) => {
      let valA = a[key];
      let valB = b[key];

      if (key === 'createdAt' || key === 'date') {
        valA = new Date(a.createdAt || a.date).getTime();
        valB = new Date(b.createdAt || b.date).getTime();
      }

      if (direction === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });
    setReviews(sorted);
  };

  const handleApprove = async (reviewId) => {
    if (!await confirm({
      title: t('reviews.approve'),
      message: t('reviews.prompts.approve'),
      confirmText: t('common.approve'),
      type: 'success'
    })) {
      return;
    }

    try {
      await reviewApi.approve(reviewId);
      loadReviews();
    } catch (error) {
      console.error('Failed to approve review:', error);
      toast.error(`${t('common.error')}: ${error.message}`);
    }
  };

  const handleReject = async (reviewId) => {
    const reason = await prompt({
      title: t('reviews.reject'),
      message: t('reviews.prompts.reject'),
      confirmText: t('common.reject'),
      isDangerous: true,
      placeholder: t('reviews.rejectionReason') || 'Reason...'
    });

    if (reason === null) { // User cancelled
      return;
    }
    if (reason.trim().length < 5) {
      toast.error(t('reviews.prompts.rejectError'));
      return;
    }

    try {
      await reviewApi.reject(reviewId, reason.trim());
      loadReviews();
    } catch (error) {
      console.error('Failed to reject review:', error);
      toast.error(`${t('common.error')}: ${error.message}`);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!await confirm({
      title: t('common.delete'),
      message: t('reviews.prompts.delete'),
      confirmText: t('common.delete'),
      isDangerous: true
    })) {
      return;
    }

    try {
      await reviewApi.delete(reviewId);
      loadReviews();
    } catch (error) {
      console.error('Failed to delete review:', error);
      toast.error(`${t('common.error')}: ${error.message}`);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedReviews.length === 0) return;
    try {
      await reviewApi.bulkApprove(selectedReviews);
      setSelectedReviews([]);
      loadReviews();
    } catch (error) {
      console.error('Bulk approval failed:', error);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="stars-wrapper">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={14}
            fill={s <= rating ? "var(--warning-500)" : "none"}
            color={s <= rating ? "var(--warning-500)" : "var(--gray-300)"}
          />
        ))}
      </div>
    );
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const columns = [
    {
      key: 'productName',
      label: t('reviews.columns.product'),
      sortable: true,
      render: (value, row) => (
        <div className="product-summary-cell">
          <div className="product-icon-box">
            <Package size={16} />
          </div>
          <div>
            <div className="p-name">{value}</div>
            <div className="p-id">{t('common.id')}: {row.productId}</div>
          </div>
        </div>
      )
    },
    {
      key: 'userName',
      label: t('reviews.columns.customer'),
      sortable: true,
      width: '180px',
      render: (value, row) => (
        <div className="customer-review-cell">
          <div className={`c-avatar color-${(row.id % 5) + 1}`}>
            {getInitials(value)}
          </div>
          <div className="c-info">
            <div className="c-name">{value || t('reviews.anonymous')}</div>
            {row.verifiedPurchase && (
              <div className="verified-tag">
                <ShieldCheck size={10} />
                {t('reviews.verified')}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'rating',
      label: t('reviews.columns.rating'),
      sortable: true,
      width: '140px',
      render: (value) => renderStars(value)
    },
    {
      key: 'comment',
      label: t('reviews.columns.comment'),
      render: (value, row) => (
        <div className="review-content-cell">
          <p className="review-text">{value}</p>
          {row.editCount > 0 && <span className="edited-hint">{t('reviews.edits', { count: row.editCount })}</span>}
        </div>
      )
    },
    {
      key: 'createdAt',
      label: t('reviews.columns.date'),
      sortable: true,
      width: '140px',
      render: (value) => (
        <div className="review-date">
          <Calendar size={12} />
          {formatDate(value)}
        </div>
      )
    },
    {
      key: 'status',
      label: t('reviews.columns.status'),
      width: '130px',
      render: (value, row) => (
        <div className="status-col">
          <StatusBadge status={value} type="review" />
          {row.moderatedBy && <div className="moderator-hint">{t('reviews.moderatedBy', { name: row.moderatedBy })}</div>}
        </div>
      )
    },
    {
      key: 'actions',
      label: '',
      width: '150px',
      render: (_, row) => (
        <div className="review-actions">
          <Can permission="reviews.moderate">
            <>
              {row.status !== 'approved' && (
                <button className="btn-icon-s approve" onClick={() => handleApprove(row.id)} title={t('common.confirm')}>
                  <CheckCircle size={16} />
                </button>
              )}
              {row.status !== 'rejected' && (
                <button className="btn-icon-s reject" onClick={() => handleReject(row.id)} title={t('common.cancel')}>
                  <XCircle size={16} />
                </button>
              )}
            </>
          </Can>
          <Can permission="reviews.delete">
            <button className="btn-icon-s delete" onClick={() => handleDelete(row.id)} title={t('common.delete')}>
              <Trash2 size={16} />
            </button>
          </Can>
        </div>
      )
    }
  ];

  const stats = useMemo(() => {
    const list = Array.isArray(reviews) ? reviews : [];
    return {
      pending: list.filter(r => r.status === 'pending').length,
      approved: list.filter(r => r.status === 'approved').length,
      rejected: list.filter(r => r.status === 'rejected').length,
      avg: list.length > 0 ? (list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1) : 0
    };
  }, [reviews]);

  return (
    <div className="reviews-page">
      <div className="page-header">
        <div>
          <h1>{t('reviews.title')}</h1>
          <p className="page-subtitle">{t('reviews.subtitle')}</p>
        </div>
        <div className="header-actions">
        </div>
      </div>

      <div className="stats-dashboard-row">
        <div className="review-stat-card pending">
          <label>{t('reviews.stats.pending')}</label>
          <div className="val">{stats.pending}</div>
          <div className="status-dot"></div>
        </div>
        <div className="review-stat-card approved">
          <label>{t('reviews.stats.approved')}</label>
          <div className="val">{stats.approved}</div>
          <div className="status-dot"></div>
        </div>
        <div className="review-stat-card rejected">
          <label>{t('reviews.stats.rejected')}</label>
          <div className="val">{stats.rejected}</div>
          <div className="status-dot"></div>
        </div>
        <div className="review-stat-card average">
          <label>{t('reviews.stats.avgRating')}</label>
          <div className="val-rating">
            <Star size={18} fill="var(--warning-500)" color="var(--warning-500)" />
            {stats.avg}
          </div>
        </div>
      </div>

      <div className="filters-section-pro">
        <div className="input-group" style={{ maxWidth: '280px' }}>
          <div className="input-group-icon"><Search size={16} /></div>
          <input
            type="text"
            placeholder={t('reviews.searchPlaceholder') || 'Search by product, customer, or review text...'}
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <label>{t('reviews.filterByStatus')}</label>
            <div className="select-container">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="pro-select-minimal"
              >
                <option value="">{t('common.all')}</option>
                <option value="pending">{t('reviews.stats.pending')}</option>
                <option value="approved">{t('reviews.stats.approved')}</option>
                <option value="rejected">{t('reviews.stats.rejected')}</option>
              </select>
              <ChevronDown size={14} className="select-icon" />
            </div>
          </div>

          <div className="filter-group">
            <label>{t('reviews.filterByRating')}</label>
            <div className="select-container">
              <select
                value={filters.rating}
                onChange={(e) => handleFilterChange('rating', e.target.value)}
                className="pro-select-minimal"
              >
                <option value="">{t('reviews.allRatings')}</option>
                <option value="5">{t('reviews.stars', { count: 5 })}</option>
                <option value="4">{t('reviews.stars', { count: 4 })}</option>
                <option value="3">{t('reviews.stars', { count: 3 })}</option>
                <option value="2">{t('reviews.stars', { count: 2 })}</option>
                <option value="1">{t('reviews.stars_one', { count: 1 })}</option>
              </select>
              <ChevronDown size={14} className="select-icon" />
            </div>
          </div>
        </div>
      </div>

      <div className="table-meta-bar">
        <span>{t('reviews.displaying', { count: reviews.length })}</span>
        {selectedReviews.length > 0 && (
          <div className="bulk-actions-minimal">
            <span>{t('common.selected', { count: selectedReviews.length })}</span>
            <button className="btn-bulk-s approve" onClick={handleBulkApprove}>{t('reviews.approveAll')}</button>
          </div>
        )}
      </div>

      {loadError ? <ResourceError error={loadError} onRetry={loadReviews} /> : <DataTable
        columns={columns}
        data={reviews}
        onSort={handleSort}
        loading={loading}
        emptyMessage={t('reviews.empty')}
      />}
      {/* Confirmation Modal */}
      <ConfirmationDialog />
    </div>
  );
}

export default ReviewsPage;
