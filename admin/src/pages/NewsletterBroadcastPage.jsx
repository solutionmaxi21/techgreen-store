import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './NewsletterBroadcastPage.css';
import { sanitizeRichHtml } from '../utils/sanitizeHtml';
import { apiRequest } from '../services/apiService';
import useConfirmation from '../hooks/useConfirmation';
import Can from '../components/Can';

export default function NewsletterBroadcastPage() {
  const { t } = useTranslation();
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    segmentationFilter: 'all',
  });
  const { confirm, ConfirmationDialog } = useConfirmation();

  // Detail modal tab state
  const [detailTab, setDetailTab] = useState('overview');

  // Delivery logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsStatusFilter, setLogsStatusFilter] = useState('');
  const [logsSearch, setLogsSearch] = useState('');
  const [logsSearchInput, setLogsSearchInput] = useState('');

  const loadBroadcasts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (statusFilter) params.set('status', statusFilter);

      const response = await apiRequest(`/admin/newsletter/broadcasts?${params}`);
      if (response.success) {
        setBroadcasts(response.data);
        setTotalPages(response.pagination?.pages ?? 1);
      } else {
        setError(t('newsletter.errors.loadBroadcasts'));
      }
    } catch (err) {
      setError(err.message || t('newsletter.errors.loadBroadcasts'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, t]);

  useEffect(() => {
    loadBroadcasts();
  }, [loadBroadcasts]);

  const loadBroadcastLogs = useCallback(async (broadcastId) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ page: logsPage, limit: 20 });
      if (logsStatusFilter) params.set('status', logsStatusFilter);
      if (logsSearch) params.set('search', logsSearch);

      const response = await apiRequest(`/admin/newsletter/broadcast/${broadcastId}/logs?${params}`);
      if (response.success) {
        setLogs(response.data);
        setLogsTotalPages(response.pagination?.pages ?? 1);
        setLogsTotal(response.pagination?.total ?? 0);
      }
    } catch (err) {
      console.error('Failed to load broadcast logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [logsPage, logsStatusFilter, logsSearch]);

  // Load logs when the logs tab is active and a broadcast is selected
  useEffect(() => {
    if (selectedBroadcast && detailTab === 'logs') {
      loadBroadcastLogs(selectedBroadcast.id);
    }
  }, [selectedBroadcast, detailTab, loadBroadcastLogs]);

  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiRequest('/admin/newsletter/broadcast', {
        method: 'POST',
        idempotencyRequired: true,
        body: JSON.stringify(formData),
      });

      if (response.success) {
        setSuccess(
          t('newsletter.broadcastCreated', { count: response.data.recipientCount })
        );
        setFormData({ title: '', content: '', segmentationFilter: 'all' });
        setShowForm(false);
        loadBroadcasts();
      } else {
        setError(response.error || t('newsletter.errors.createBroadcast'));
      }
    } catch (err) {
      setError(err.message || t('newsletter.errors.createBroadcast'));
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  const handleDelete = async (broadcastId) => {
    if (!await confirm({
      title: t('newsletter.deleteTitle'),
      message: t('newsletter.deleteConfirm'),
      confirmText: t('newsletter.moveToTrash'),
      isDangerous: true
    })) return;

    try {
      setLoading(true);
      const response = await apiRequest(`/admin/newsletter/broadcast/${broadcastId}`, { method: 'DELETE' });
      if (response.success) {
        setSuccess(t('newsletter.movedToTrash'));
        loadBroadcasts();
      } else {
        setError(response.error || t('newsletter.errors.deleteBroadcast'));
      }
    } catch (err) {
      setError(err.message || t('newsletter.errors.deleteBroadcast'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (broadcastId) => {
    setDetailLoading(true);
    setSelectedBroadcast(null);
    setDetailTab('overview');
    // Reset logs state
    setLogs([]);
    setLogsPage(1);
    setLogsStatusFilter('');
    setLogsSearch('');
    setLogsSearchInput('');
    try {
      const response = await apiRequest(`/admin/newsletter/broadcast/${broadcastId}`);
      if (response.success) {
        setSelectedBroadcast(response.data);
      } else {
        setError(t('newsletter.errors.loadDetails'));
      }
    } catch (err) {
      setError(err.message || t('newsletter.errors.loadDetails'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLogsSearch = (e) => {
    e.preventDefault();
    setLogsSearch(logsSearchInput);
    setLogsPage(1);
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      draft: 'badge-draft',
      sending: 'badge-sending',
      sent: 'badge-sent',
      failed: 'badge-failed',
      paused: 'badge-draft',
      scheduled: 'badge-sending',
    };
    return statusMap[status] || 'badge-draft';
  };

  const getLogStatusBadgeClass = (status) => {
    const statusMap = {
      pending: 'badge-sending',
      sent: 'badge-sent',
      failed: 'badge-failed',
      bounced: 'badge-failed',
    };
    return statusMap[status] || 'badge-draft';
  };

  return (
    <div className="newsletter-broadcast-page">
      <div className="page-header">
        <h1>{t('newsletter.broadcastsTitle')}</h1>
        <Can permission="newsletter.broadcasts.send">
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowForm(!showForm);
              setError('');
              setSuccess('');
            }}
          >
            {showForm ? t('common.cancel') : t('newsletter.newBroadcast')}
          </button>
        </Can>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="form-container">
          <h2>{t('newsletter.createBroadcast')}</h2>
          <form onSubmit={handleCreateBroadcast} className="broadcast-form">
            <div className="form-group">
              <label htmlFor="title">{t('newsletter.subject')}</label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('newsletter.subjectPlaceholder')}
                className="input"
                required
                maxLength={255}
              />
            </div>

            <div className="form-group">
              <label htmlFor="content">{t('newsletter.content')}</label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={t('newsletter.contentPlaceholder')}
                className="input textarea"
                rows="10"
                required
                minLength={10}
              />
              <small>{t('newsletter.htmlHint')}</small>
            </div>

            <div className="form-group">
              <label htmlFor="segmentation">{t('newsletter.audience')}</label>
              <select
                id="segmentation"
                value={formData.segmentationFilter}
                onChange={(e) => setFormData({ ...formData, segmentationFilter: e.target.value })}
                className="input"
              >
                <option value="all">{t('newsletter.audiences.all')}</option>
                <option value="users-only">{t('newsletter.audiences.users')}</option>
                <option value="public-only">{t('newsletter.audiences.public')}</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting || loading}>
              {submitting ? t('newsletter.creating') : t('newsletter.createQueue')}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="filters-container" style={{ marginBottom: '1rem' }}>
        <div className="filter-group">
          <label>{t('newsletter.filterStatus')}</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input"
          >
            <option value="">{t('common.all')}</option>
            <option value="draft">{t('newsletter.status.draft')}</option>
            <option value="sending">{t('newsletter.status.sending')}</option>
            <option value="sent">{t('newsletter.status.sent')}</option>
            <option value="failed">{t('newsletter.status.failed')}</option>
            <option value="scheduled">{t('newsletter.status.scheduled')}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">{t('newsletter.loadingBroadcasts')}</div>
      ) : (
        <>
          <div className="broadcasts-grid">
            {broadcasts.map((broadcast) => (
              <div key={broadcast.id} className="broadcast-card">
                <div className="broadcast-header">
                  <h3>{broadcast.title}</h3>
                  <span className={`badge ${getStatusBadgeClass(broadcast.status)}`}>
                    {broadcast.status}
                  </span>
                </div>

                <div className="broadcast-stats">
                  <div className="stat">
                    <span className="label">{t('newsletter.recipients')}</span>
                    <span className="value">{broadcast.recipient_count ?? 0}</span>
                  </div>
                  <div className="stat">
                    <span className="label">{t('newsletter.failed')}</span>
                    <span className="value text-error">{broadcast.failed_count ?? 0}</span>
                  </div>
                  <div className="stat">
                    <span className="label">{t('newsletter.opens')}</span>
                    <span className="value">{broadcast.opened_count ?? 0}</span>
                  </div>
                </div>

                <div className="broadcast-info">
                  <p><strong>{t('newsletter.target')}</strong> {t(`newsletter.audienceValues.${broadcast.segmentation_filter}`, { defaultValue: broadcast.segmentation_filter })}</p>
                  <p><strong>{t('newsletter.created')}</strong> {new Date(broadcast.created_at).toLocaleString()}</p>
                  {broadcast.sent_at && (
                    <p><strong>{t('newsletter.sentAt')}</strong> {new Date(broadcast.sent_at).toLocaleString()}</p>
                  )}
                </div>

                <div className="broadcast-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleViewDetails(broadcast.id)}
                    disabled={detailLoading}
                    style={{ flex: 1 }}
                  >
                      {t('newsletter.viewDetails')}
                  </button>
                  <Can permission="newsletter.broadcasts.create">
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(broadcast.id)}
                      disabled={loading}
                    >
                        {t('common.delete')}
                    </button>
                  </Can>
                </div>
              </div>
            ))}
          </div>

          {broadcasts.length === 0 && !loading && !error && (
            <div className="empty-state">
              <p>{t('newsletter.noBroadcasts')}</p>
            </div>
          )}

          {/* Pagination */}
          <div className="pagination">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="btn btn-secondary"
            >
              {t('common.previous')}
            </button>
            <span className="pagination-info">{t('common.pageOf', { page, total: totalPages })}</span>
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

      {/* Detail Modal — tabbed with Overview + Delivery Logs */}
      {selectedBroadcast && (
        <div className="modal-overlay" onClick={() => setSelectedBroadcast(null)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedBroadcast.title}</h2>
              <button className="close-btn" onClick={() => setSelectedBroadcast(null)}>×</button>
            </div>

            {/* Tabs */}
            <div className="modal-tabs">
              <button
                className={`modal-tab ${detailTab === 'overview' ? 'active' : ''}`}
                onClick={() => setDetailTab('overview')}
              >
                {t('newsletter.overview')}
              </button>
              <button
                className={`modal-tab ${detailTab === 'logs' ? 'active' : ''}`}
                onClick={() => setDetailTab('logs')}
              >
                {t('newsletter.deliveryLogs')}
                {selectedBroadcast.logStats?.failed > 0 && (
                  <span className="tab-badge tab-badge-error">{selectedBroadcast.logStats.failed}</span>
                )}
              </button>
            </div>

            <div className="modal-content">
              {/* ===== OVERVIEW TAB ===== */}
              {detailTab === 'overview' && (
                <>
                  <div className="broadcast-info" style={{ marginBottom: '1rem' }}>
                    <p>
                      <strong>{t('common.status')}:</strong>{' '}
                      <span className={`badge ${getStatusBadgeClass(selectedBroadcast.status)}`}>
                        {t(`newsletter.status.${selectedBroadcast.status}`, { defaultValue: selectedBroadcast.status })}
                      </span>
                    </p>
                    <p><strong>{t('newsletter.targetSegment')}</strong> {t(`newsletter.audienceValues.${selectedBroadcast.segmentation_filter}`, { defaultValue: selectedBroadcast.segmentation_filter })}</p>
                    {selectedBroadcast.sent_at && (
                      <p><strong>{t('newsletter.sentAt')}</strong> {new Date(selectedBroadcast.sent_at).toLocaleString()}</p>
                    )}
                  </div>

                  <div className="stat-group">
                    <div className="stat">
                      <h4>{t('newsletter.totalRecipients')}</h4>
                      <p>{selectedBroadcast.logStats?.total ?? selectedBroadcast.recipient_count ?? 0}</p>
                    </div>
                    <div className="stat">
                      <h4>{t('newsletter.successfullySent')}</h4>
                      <p className="text-success">{selectedBroadcast.logStats?.sent ?? 0}</p>
                    </div>
                    <div className="stat">
                      <h4>{t('newsletter.status.failed')}</h4>
                      <p className="text-error">{selectedBroadcast.logStats?.failed ?? 0}</p>
                    </div>
                    <div className="stat">
                      <h4>{t('newsletter.status.pending')}</h4>
                      <p className="text-warning">{selectedBroadcast.logStats?.pending ?? 0}</p>
                    </div>
                    <div className="stat">
                      <h4>{t('newsletter.status.bounced')}</h4>
                      <p className="text-error">{selectedBroadcast.logStats?.bounced ?? 0}</p>
                    </div>
                  </div>

                  <div className="broadcast-content">
                    <h3>{t('newsletter.contentPreview')}</h3>
                    <div
                      className="content-preview"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(selectedBroadcast.content) }}
                    />
                  </div>
                </>
              )}

              {/* ===== DELIVERY LOGS TAB ===== */}
              {detailTab === 'logs' && (
                <div className="logs-section">
                  {/* Logs Filters */}
                  <div className="logs-filters">
                    <div className="logs-filter-group">
                      <label>{t('common.status')}:</label>
                      <select
                        value={logsStatusFilter}
                        onChange={(e) => { setLogsStatusFilter(e.target.value); setLogsPage(1); }}
                        className="input input-sm"
                      >
                        <option value="">{t('common.all')}</option>
                        <option value="sent">{t('newsletter.status.sent')}</option>
                        <option value="failed">{t('newsletter.status.failed')}</option>
                        <option value="pending">{t('newsletter.status.pending')}</option>
                        <option value="bounced">{t('newsletter.status.bounced')}</option>
                      </select>
                    </div>
                    <form onSubmit={handleLogsSearch} className="logs-filter-group logs-search-form">
                      <label>{t('newsletter.email')}:</label>
                      <input
                        type="text"
                        value={logsSearchInput}
                        onChange={(e) => setLogsSearchInput(e.target.value)}
                        placeholder={t('newsletter.searchEmail')}
                        className="input input-sm"
                      />
                      <button type="submit" className="btn btn-secondary btn-sm">{t('common.search')}</button>
                      {logsSearch && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setLogsSearch(''); setLogsSearchInput(''); setLogsPage(1); }}
                        >
                          {t('common.clear')}
                        </button>
                      )}
                    </form>
                    <div className="logs-count">
                      <span>{t('newsletter.logsCount', { count: logsTotal })}</span>
                    </div>
                  </div>

                  {/* Logs Table */}
                  {logsLoading ? (
                    <div className="loading">{t('newsletter.loadingLogs')}</div>
                  ) : logs.length === 0 ? (
                    <div className="empty-state">
                      <p>{t(logsStatusFilter || logsSearch ? 'newsletter.noLogsFiltered' : 'newsletter.noLogs')}</p>
                    </div>
                  ) : (
                    <>
                      <div className="logs-table-wrapper">
                        <table className="logs-table">
                          <thead>
                            <tr>
                              <th>{t('newsletter.subscriberEmail')}</th>
                              <th>{t('common.status')}</th>
                              <th>{t('newsletter.errorMessage')}</th>
                              <th>{t('newsletter.retries')}</th>
                              <th>{t('newsletter.sentAt')}</th>
                              <th>{t('newsletter.lastRetry')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {logs.map((log) => (
                              <tr key={log.id} className={log.status === 'failed' || log.status === 'bounced' ? 'log-row-error' : ''}>
                                <td className="log-email">{log.subscriber_email}</td>
                                <td>
                                  <span className={`badge badge-sm ${getLogStatusBadgeClass(log.status)}`}>
                                    {t(`newsletter.status.${log.status}`, { defaultValue: log.status })}
                                  </span>
                                </td>
                                <td className="log-error-cell">
                                  {log.error_message ? (
                                    <span className="log-error-text" title={log.error_message}>
                                      {log.error_message.length > 80
                                        ? log.error_message.substring(0, 80) + '…'
                                        : log.error_message}
                                    </span>
                                  ) : (
                                    <span className="log-empty">—</span>
                                  )}
                                </td>
                                <td className="log-retries">
                                  {log.retry_count > 0 ? (
                                    <span className="retry-badge">{log.retry_count}</span>
                                  ) : '0'}
                                </td>
                                <td className="log-date">
                                  {log.sent_at
                                    ? new Date(log.sent_at).toLocaleString()
                                    : <span className="log-empty">—</span>}
                                </td>
                                <td className="log-date">
                                  {log.last_retry_at
                                    ? new Date(log.last_retry_at).toLocaleString()
                                    : <span className="log-empty">—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Logs Pagination */}
                      <div className="pagination logs-pagination">
                        <button
                          onClick={() => setLogsPage(Math.max(1, logsPage - 1))}
                          disabled={logsPage === 1}
                          className="btn btn-secondary btn-sm"
                        >
                          {t('common.previous')}
                        </button>
                        <span className="pagination-info">
                          {t('common.pageOf', { page: logsPage, total: logsTotalPages })}
                        </span>
                        <button
                          onClick={() => setLogsPage(Math.min(logsTotalPages, logsPage + 1))}
                          disabled={logsPage === logsTotalPages}
                          className="btn btn-secondary btn-sm"
                        >
                          {t('common.next')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <ConfirmationDialog />
    </div>
  );
}
