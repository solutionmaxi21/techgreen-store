import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { returnApi } from '../services/apiService';
import { formatCurrency, formatDate } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';
import Can from '../components/Can';
import ResourceError from '../components/ResourceError';
import {
  CheckCircle,
  ChevronLeft,
  XCircle,
} from 'lucide-react';
import '../styles/layout.css';
import '../styles/forms.css';

function ReturnDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('ccp_transfer');
  const [refundNotes, setRefundNotes] = useState('');
  const [receiptConfirmed, setReceiptConfirmed] = useState(false);

  useEffect(() => {
    loadReturn();
  }, [id]);

  const loadReturn = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await returnApi.getById(id);
      setReturnData(data);
      setRefundAmount(data.refund_amount || '');
      setReceiptConfirmed(!!data.received_at);
    } catch (error) {
      setLoadError(error);
      toast.error(error.response?.data?.message || t('returns.detail.errors.load'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await returnApi.updateStatus(id, 'approved', adminNotes);
      toast.success(t('returns.detail.toasts.approved'));
      setAdminNotes('');
      await loadReturn();
    } catch (error) {
      toast.error(error.response?.data?.message || t('returns.detail.errors.approve'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await returnApi.updateStatus(id, 'rejected', adminNotes);
      toast.success(t('returns.detail.toasts.rejected'));
      setAdminNotes('');
      await loadReturn();
    } catch (error) {
      toast.error(error.response?.data?.message || t('returns.detail.errors.reject'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    setActionLoading(true);
    try {
      await returnApi.confirmReceipt(id);
      toast.success(t('returns.detail.toasts.received'));
      setReceiptConfirmed(true);
      await loadReturn();
    } catch (error) {
      toast.error(error.response?.data?.message || t('returns.detail.errors.receipt'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!refundAmount || Number(refundAmount) <= 0) {
      toast.error(t('returns.detail.errors.refundAmount'));
      return;
    }
    setActionLoading(true);
    try {
      await returnApi.processRefund(id, {
        refund_amount: Number(refundAmount),
        refund_method: refundMethod,
        notes: refundNotes,
      });
      toast.success(t('returns.detail.toasts.refunded'));
      await loadReturn();
    } catch (error) {
      toast.error(error.response?.data?.message || t('returns.detail.errors.refund'));
    } finally {
      setActionLoading(false);
    }
  };

  const getConditionBadgeClass = (condition) => {
    switch (condition) {
      case 'unopened': return 'badge-success';
      case 'opened': return 'badge-warning';
      case 'defective':
      case 'damaged': return 'badge-danger';
      default: return 'badge-warning';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner spinner-lg"></div>
        <p className="loading-text">{t('returns.detail.loading')}</p>
      </div>
    );
  }

  if (loadError) {
    return <ResourceError error={loadError} onRetry={loadReturn} />;
  }

  if (!returnData) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <h3 className="empty-state-title">{t('returns.detail.notFound')}</h3>
          <button className="btn-primary" onClick={() => navigate('/returns')}>
            {t('returns.detail.back')}
          </button>
        </div>
      </div>
    );
  }

  const renderActionsPanel = () => {
    const { status } = returnData;

    if (status === 'pending') {
      return (
        <Can permission="returns.status.update">
          <>
          <h3 className="section-title">{t('returns.detail.reviewReturn')}</h3>
          <div className="form-grid">
            <div className="form-group form-grid-full">
              <label className="form-label">{t('returns.detail.adminNotes')}</label>
              <textarea
                className="form-input"
                rows={4}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={t('returns.detail.notesPlaceholder')}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              className="btn-success"
              onClick={handleApprove}
              disabled={actionLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}
            >
              <CheckCircle size={16} />
              {actionLoading ? t('common.processing') : `✓ ${t('returns.detail.approve')}`}
            </button>
            <button
              className="btn-danger"
              onClick={handleReject}
              disabled={actionLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}
            >
              <XCircle size={16} />
              {actionLoading ? t('common.processing') : `✗ ${t('returns.detail.reject')}`}
            </button>
          </div>
          </>
        </Can>
      );
    }

    if (status === 'approved') {
      const isAutoReturn = returnData.return_reason?.startsWith('Delivery failure');
      return (
        <>
          <h3 className="section-title">{t('returns.detail.processReturn')}</h3>

          {isAutoReturn && (
            <div className="alert alert-info" style={{
              backgroundColor: 'hsl(33 100% 96%)',
              color: 'hsl(26 90% 37%)',
              border: '1px solid hsl(33 100% 80%)',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '12px',
              fontSize: '0.875rem'
            }}>
              ↩ <strong>{t('returns.detail.autoReturn')}</strong> — {t('returns.detail.autoReturnDesc')}
            </div>
          )}

          {!receiptConfirmed ? (
            <Can permission="returns.receipt.confirm">
            <>
              <div className="alert alert-warning">
                {isAutoReturn 
                  ? t('returns.detail.awaitingAutoReturn')
                  : t('returns.detail.awaitingReturn')}
              </div>
              <button
                className="btn-success"
                onClick={handleConfirmReceipt}
                disabled={actionLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center', marginTop: '12px' }}
              >
                <CheckCircle size={16} />
                {actionLoading ? t('returns.detail.confirming') : t('returns.detail.confirmReceipt')}
              </button>
            </>
            </Can>
          ) : (
            <Can permission="returns.refund">
            <>
              <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                <CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                {t('returns.detail.itemReceived')}
              </div>

              <div className="divider"></div>

              <h4 style={{ fontWeight: 600, marginBottom: '12px' }}>{t('returns.detail.processRefund')}</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">{t('returns.detail.refundAmountDa')}</label>
                  <input
                    type="number"
                    className="form-input"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('returns.detail.refundMethod')}</label>
                  <select
                    className="form-input"
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                  >
                    <option value="ccp_transfer">{t('returns.detail.refundMethods.ccp_transfer')}</option>
                    <option value="cash">{t('returns.detail.refundMethods.cash')}</option>
                    <option value="store_credit">{t('returns.detail.refundMethods.store_credit')}</option>
                  </select>
                </div>
                <div className="form-group form-grid-full">
                  <label className="form-label">{t('returns.detail.refundNotes')}</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={refundNotes}
                    onChange={(e) => setRefundNotes(e.target.value)}
                    placeholder={t('returns.detail.refundNotesPlaceholder')}
                  />
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={handleProcessRefund}
                disabled={actionLoading}
                style={{ width: '100%', marginTop: '12px' }}
              >
                {actionLoading ? t('common.processing') : t('returns.detail.processRefund')}
              </button>
            </>
            </Can>
          )}
        </>
      );
    }

    if (status === 'completed') {
      return (
        <>
          <h3 className="section-title">{t('returns.detail.returnCompleted')}</h3>
          <div className="alert alert-success">
            <CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
            {t('returns.detail.completedOn', { date: formatDate(returnData.processed_at) })}
          </div>
          <div className="form-grid" style={{ marginTop: '16px' }}>
            <div className="form-group">
              <label className="form-label">{t('returns.detail.refundAmount')}</label>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {formatCurrency(returnData.refund_amount)}
              </div>
            </div>
            {returnData.received_at && (
              <div className="form-group">
                <label className="form-label">{t('returns.detail.receivedDate')}</label>
                <div>{formatDate(returnData.received_at)}</div>
              </div>
            )}
          </div>
        </>
      );
    }

    if (status === 'rejected') {
      return (
        <>
          <h3 className="section-title">{t('returns.detail.returnRejected')}</h3>
          <div className="alert alert-danger" style={{ backgroundColor: 'hsl(0 84% 96%)', color: 'hsl(0 84% 40%)', border: '1px solid hsl(0 84% 85%)', padding: '12px 16px', borderRadius: '8px' }}>
            {t('returns.detail.rejectedDesc')}
            {returnData.notes && (
              <div style={{ marginTop: '8px' }}>
                <strong>{t('returns.detail.reason')}:</strong> {returnData.notes}
              </div>
            )}
          </div>
        </>
      );
    }

    if (status === 'cancelled') {
      return (
        <>
          <h3 className="section-title">{t('returns.detail.returnCancelled')}</h3>
          <div className="alert alert-danger" style={{ backgroundColor: 'hsl(0 84% 96%)', color: 'hsl(0 84% 40%)', border: '1px solid hsl(0 84% 85%)', padding: '12px 16px', borderRadius: '8px' }}>
            {t('returns.detail.cancelledDesc')}
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-left">
          <button onClick={() => navigate('/returns')} className="back-button" title={t('common.back')}>
            <ChevronLeft size={20} />
          </button>
          <div className="page-title-section">
            <h1 className="page-title">{t('returns.detail.title')}</h1>
            <p className="page-subtitle">
              {returnData.return_number}
              {' '}
              <StatusBadge status={returnData.status} />
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid-2">
        {/* Left Column - Return Information */}
        <div className="section">
          <h3 className="section-title">{t('returns.detail.infoTitle')}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">{t('returns.detail.returnNumber')}</label>
              <div style={{ fontWeight: 600 }}>{returnData.return_number}</div>
            </div>

            {returnData.return_reason?.startsWith('Delivery failure') && (
              <div className="form-group">
                <label className="form-label">{t('returns.detail.type')}</label>
                <span style={{
                  backgroundColor: 'hsl(33 100% 96%)',
                  color: 'hsl(26 90% 37%)',
                  border: '1px solid hsl(33 100% 80%)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  ↩ {t('returns.detail.autoReturnType')}
                </span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{t('returns.detail.orderNumber')}</label>
              <div>
                <span
                  style={{ fontWeight: 600, color: 'hsl(221 83% 53%)', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => navigate(`/orders/${returnData.order_id}`)}
                >
                  {returnData.order_number}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('returns.detail.customerName')}</label>
              <div style={{ fontWeight: 600 }}>{returnData.customer_name}</div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('returns.detail.email')}</label>
              <div>{returnData.customer_email}</div>
            </div>

            {returnData.customer_phone && (
              <div className="form-group">
                <label className="form-label">{t('returns.detail.phone')}</label>
                <div>{returnData.customer_phone}</div>
              </div>
            )}

            <div className="form-group form-grid-full">
              <label className="form-label">{t('returns.detail.returnReason')}</label>
              <div style={{ fontSize: '0.875rem' }}>{returnData.return_reason}</div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('returns.detail.requestedDate')}</label>
              <div>{formatDate(returnData.requested_at)}</div>
            </div>

            {returnData.processed_at && (
              <div className="form-group">
                <label className="form-label">{t('returns.detail.processedDate')}</label>
                <div>{formatDate(returnData.processed_at)}</div>
              </div>
            )}

            {returnData.notes && (
              <div className="form-group form-grid-full">
                <label className="form-label">{t('returns.detail.adminNotes')}</label>
                <div style={{ fontSize: '0.875rem', backgroundColor: 'hsl(220 14% 96%)', padding: '8px 12px', borderRadius: '6px' }}>
                  {returnData.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Actions Panel */}
        <div className="section">
          {renderActionsPanel()}
        </div>
      </div>

      {/* Items Table */}
      {returnData.items && returnData.items.length > 0 && (
        <div className="section">
          <h3 className="section-title">{t('returns.detail.itemsTitle')}</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('returns.detail.productName')}</th>
                  <th>{t('returns.detail.quantity')}</th>
                  <th>{t('returns.detail.unitPrice')}</th>
                  <th>{t('returns.detail.total')}</th>
                  <th>{t('returns.detail.condition')}</th>
                  <th>{t('returns.detail.notes')}</th>
                </tr>
              </thead>
              <tbody>
                {returnData.items.map((item) => (
                  <tr key={item.return_item_id}>
                    <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unit_price)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(item.total_price)}</td>
                    <td>
                      <span className={`badge ${getConditionBadgeClass(item.condition)}`}>
                        {t(`returns.detail.conditions.${item.condition}`, { defaultValue: item.condition })}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>{item.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReturnDetailPage;
