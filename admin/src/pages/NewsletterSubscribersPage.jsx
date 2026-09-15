import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './NewsletterSubscribersPage.css';
import { apiRequest } from '../services/apiService';

export default function NewsletterSubscribersPage() {
  const { t } = useTranslation();
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('subscribed');
  const [sourceFilter, setSourceFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadSubscribers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.set('status', statusFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const response = await apiRequest(`/admin/newsletter/subscribers?${params}`);
      if (response.success) {
        setSubscribers(response.data);
        setTotalPages(response.pagination?.pages ?? 1);
        setTotal(response.pagination?.total ?? 0);
      } else {
        setError(t('newsletter.errors.loadSubscribers'));
      }
    } catch (err) {
      setError(err.message || t('newsletter.errors.loadSubscribers'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, sourceFilter, searchTerm, t]);

  useEffect(() => {
    loadSubscribers();
  }, [loadSubscribers]);

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const handleSourceChange = (newSource) => {
    setSourceFilter(newSource);
    setPage(1);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const exportSubscribers = () => {
    if (subscribers.length === 0) return;

    const csv = [
      [t('newsletter.email'), t('common.status'), t('newsletter.source'), t('newsletter.subscribedDate'), t('newsletter.lastBroadcast')].join(','),
      ...subscribers.map((s) =>
        [
          `"${s.email}"`,
          s.status,
          s.source,
          new Date(s.created_at).toLocaleDateString(),
          s.last_broadcast_sent_at
            ? new Date(s.last_broadcast_sent_at).toLocaleDateString()
            : t('teamAccess.never'),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getStatusBadgeClass = (status) => {
    const map = {
      subscribed: 'badge-subscribed',
      unsubscribed: 'badge-unsubscribed',
      bounced: 'badge-failed',
    };
    return map[status] || '';
  };

  return (
    <div className="newsletter-subscribers-page">
      <div className="page-header">
        <h1>
          {t('newsletter.subscribersTitle')}
          {total > 0 && (
            <span style={{ fontSize: '0.75em', fontWeight: 400, color: '#64748b', marginLeft: '0.5rem' }}>
              ({t('newsletter.total', { count: total.toLocaleString() })})
            </span>
          )}
        </h1>
        <button
          className="btn btn-primary"
          onClick={exportSubscribers}
          disabled={subscribers.length === 0}
        >
          {t('newsletter.exportCsv')}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters-container">
        <div className="filter-group">
          <label>{t('newsletter.searchEmailLabel')}</label>
          <input
            type="text"
            placeholder={t('newsletter.searchEmail')}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="input"
          />
        </div>

        <div className="filter-group">
          <label>{t('common.status')}:</label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="input"
          >
            <option value="">{t('common.all')}</option>
            <option value="subscribed">{t('newsletter.status.subscribed')}</option>
            <option value="unsubscribed">{t('newsletter.status.unsubscribed')}</option>
            <option value="bounced">{t('newsletter.status.bounced')}</option>
          </select>
        </div>

        <div className="filter-group">
          <label>{t('newsletter.source')}:</label>
          <select
            value={sourceFilter}
            onChange={(e) => handleSourceChange(e.target.value)}
            className="input"
          >
            <option value="">{t('common.all')}</option>
            <option value="public">{t('newsletter.sources.public')}</option>
            <option value="user">{t('newsletter.sources.user')}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">{t('newsletter.loadingSubscribers')}</div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('newsletter.email')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('newsletter.source')}</th>
                  <th>{t('newsletter.subscribedDate')}</th>
                  <th>{t('newsletter.lastBroadcast')}</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id}>
                    <td>{subscriber.email}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(subscriber.status)}`}>
                        {t(`newsletter.status.${subscriber.status}`, { defaultValue: subscriber.status })}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${subscriber.source}`}>
                        {t(`newsletter.sources.${subscriber.source}`, { defaultValue: subscriber.source })}
                      </span>
                    </td>
                    <td>{new Date(subscriber.created_at).toLocaleDateString()}</td>
                    <td>
                      {subscriber.last_broadcast_sent_at
                        ? new Date(subscriber.last_broadcast_sent_at).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {subscribers.length === 0 && !loading && !error && (
            <div className="empty-state">
              <p>{t('newsletter.noSubscribers')}</p>
            </div>
          )}

          <div className="pagination">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="btn btn-secondary"
            >
              {t('common.previous')}
            </button>
            <span className="pagination-info">
              {t('common.pageOf', { page, total: totalPages })}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="btn btn-secondary"
            >
              {t('common.next')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
