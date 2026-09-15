
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import useConfirmation from '../hooks/useConfirmation';
import {
  ChevronLeft,
  Printer,
  Copy,
  User,
  Truck,
  CreditCard,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  FileText,
  Package,
  ShieldCheck,
  Cpu,
  MessageSquare,
  PhoneCall,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  PackageCheck,
  ExternalLink,
  AlertTriangle,
  Download
} from 'lucide-react';
import { orderApi, orderHistoryApi } from '../services/apiService';
import { formatCurrency, formatDate } from '../utils/formatters';
import StatusBadge from '../components/StatusBadge';
import OrderStatusControl from '../components/OrderStatusControl';
import OrderTimeline from '../components/OrderTimeline';
import ShipmentTracking from '../components/ShipmentTracking';
import InvoiceModal from '../components/InvoiceModal';
import Can from '../components/Can';
import ResourceError from '../components/ResourceError';
import { useAuthorization } from '../contexts/AuthorizationContext';
import './OrderDetailPage.css';

function OrderDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuthorization();
  const canUpdateStatus = can('orders.status.update');
  const canManageShipment = can('orders.shipment.manage');
  const [order, setOrder] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false); // Changed from 'updating'
  const { confirm, ConfirmationDialog } = useConfirmation(); // Destructured useConfirmation
  const [error, setError] = useState(null);
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [deliveryType, setDeliveryType] = useState('home');
  const [prepaidAmount, setPrepaidAmount] = useState(0);
  const [showPrepaymentDialog, setShowPrepaymentDialog] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false); // Added for shipping modal
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const extractNumericId = (orderNumber) => {
    if (!orderNumber) return null;
    const match = orderNumber.toString().match(/ORD-(\d+)/);
    return match ? parseInt(match[1], 10) : orderNumber;
  };

  useEffect(() => {
    const numericId = extractNumericId(id);
    if (numericId) {
      loadOrderDetails(numericId);
    } else {
      setError(t('orders.detail.invalidId', { id }));
      setLoading(false);
    }
  }, [id]);

  const loadOrderDetails = async (orderId) => {
    setLoading(true);
    setError(null);
    try {
      const [orderRes, timelineRes] = await Promise.all([
        orderApi.getById(orderId),
        orderHistoryApi.getOrderTimeline(orderId)
      ]);

      const loadedOrder = orderRes.data || orderRes;
      setOrder(loadedOrder);

      // Set delivery type from order if available
      if (loadedOrder.delivery_type) {
        setDeliveryType(loadedOrder.delivery_type);
      } else {
        setDeliveryType('home'); // Default to home delivery
      }

      const sortedTimeline = Array.isArray(timelineRes)
        ? timelineRes.sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
        : [];
      setTimeline(sortedTimeline);
    } catch (error) {
      console.error('Failed to load order details:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus, notes) => {
    setStatusUpdating(true); // Changed from 'setUpdating'
    try {
      const numericId = extractNumericId(id);
      await orderApi.updateStatus(numericId, newStatus, notes);
      await loadOrderDetails(numericId);
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error(`${t('orders.detail.updateStatusFailed')}: ${error.message}`);
    } finally {
      setStatusUpdating(false); // Changed from 'setUpdating'
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleViewInvoice = () => {
    setIsInvoiceOpen(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handlePhoneConfirmation = async (status) => {
    setConfirming(true);
    try {
      const numericId = extractNumericId(id);
      await orderApi.confirmPhone(numericId, status, confirmationNotes);
      setConfirmationNotes('');
      await loadOrderDetails(numericId);
      toast.success(t(`orders.detail.phoneConfirm.${status}Success`));
    } catch (error) {
      console.error('Failed to confirm phone:', error);
      toast.error(t('orders.detail.phoneConfirm.failed') + ': ' + error.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleCreateShipment = async () => {
    // Calculate if prepayment is needed (Guepex COD limit: 150,000 DA)
    const GUEPEX_MAX_COD = 150000;
    const orderTotal = order.total_amount || 0;
    const minimumPrepayment = orderTotal > GUEPEX_MAX_COD ? orderTotal - GUEPEX_MAX_COD : 0;

    if (minimumPrepayment > 0) {
      setPrepaidAmount(minimumPrepayment);
      setShowPrepaymentDialog(true);
    } else {
      setPrepaidAmount(0);
      confirmCreateShipment(0);
    }
  };

  const confirmCreateShipment = async (prepaid) => {
    setShowPrepaymentDialog(false);
    // Replaced window.confirm with useConfirmation hook
    if (!await confirm({
      title: t('orders.detail.shipping.title'),
      message: t('orders.detail.shipping.confirmCreate'),
      confirmText: t('common.create'),
    })) return;

    setCreatingShipment(true);
    try {
      const numericId = extractNumericId(id);
      const response = await orderApi.createShipment(numericId, deliveryType, prepaid);
      await loadOrderDetails(numericId);
      toast.success(t('orders.detail.shipping.createSuccess') + ' ' +
        t('orders.detail.shipping.trackingNumber') + ': ' + response.data.tracking_number);
    } catch (error) {
      console.error('Failed to create shipment:', error);
      toast.error(t('orders.detail.shipping.createFailed') + ': ' + error.message);
    } finally {
      setCreatingShipment(false);
    }
  };

  if (loading) return (
    <div className="order-detail-page">
      <div className="loading">
        <Clock className="rotate" size={24} />
        <span>{t('orders.detail.loading')}</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="order-detail-page">
      <ResourceError
        error={error}
        onRetry={() => loadOrderDetails(extractNumericId(id))}
      />
    </div>
  );

  if (!order) return (
    <div className="order-detail-page">
      <div className="not-found">{t('orders.detail.notFound')}</div>
    </div>
  );

  return (
    <div className="order-detail-page">
      <div className="page-header no-print">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/orders')} title={t('orders.detail.backToOrders')}>
            <ChevronLeft size={20} />
          </button>
          <div className="title-group">
            <h1>
              {t('orders.detail.title', { orderNumber: order.orderNumber })}
              <Copy
                size={18}
                className="copy-icon"
                onClick={() => copyToClipboard(order.orderNumber)}
                title={t('orders.detail.copyOrderId')}
              />
            </h1>
            <p className="page-subtitle">{t('orders.detail.placedOn', { date: formatDate(order.createdAt || order.date) })}</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleViewInvoice}>
            <FileText size={18} />
            {t('invoice.viewInvoice')}
          </button>
          <button className="btn-secondary" onClick={handleViewInvoice}>
            <Download size={18} />
            {t('invoice.downloadPdf')}
          </button>
          <StatusBadge status={order.status} type="order" />
        </div>
      </div>

      <div className="order-content">
        <div className="main-column">
          {/* Phone Confirmation Card (if awaiting_confirmation or phone_confirmation_status is pending) */}
          {canUpdateStatus && (order.status === 'awaiting_confirmation' || order.phone_confirmation_status === 'pending') && (
            <div className="card phone-confirmation-card" style={{ borderLeft: '4px solid var(--warning-color)', backgroundColor: 'var(--warning-bg, #fffbeb)' }}>
              <div className="card-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PhoneCall size={20} color="var(--warning-color)" />
                  {t('orders.detail.phoneConfirm.title')}
                </h2>
                <AlertCircle size={18} color="var(--warning-color)" />
              </div>
              <div style={{ padding: '16px' }}>
                <p style={{ marginBottom: '12px', color: 'var(--gray-600)' }}>
                  {t('orders.detail.phoneConfirm.description')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '12px', backgroundColor: 'white', borderRadius: '8px' }}>
                  <Phone size={18} color="var(--primary-color)" />
                  <a href={`tel:${order.customerPhone || order.customer?.phone}`} style={{ fontSize: '18px', fontWeight: '600', color: 'var(--primary-color)', textDecoration: 'none' }}>
                    {order.customerPhone || order.customer?.phone}
                  </a>
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>{t('orders.detail.phoneConfirm.notes')}</label>
                  <textarea
                    value={confirmationNotes}
                    onChange={(e) => setConfirmationNotes(e.target.value)}
                    placeholder={t('orders.detail.phoneConfirm.notesPlaceholder')}
                    rows={3}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontFamily: 'inherit' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="btn-primary"
                    onClick={() => handlePhoneConfirmation('confirmed')}
                    disabled={confirming}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <CheckCircle2 size={18} />
                    {confirming ? t('common.processing') : t('orders.detail.phoneConfirm.confirm')}
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handlePhoneConfirmation('failed')}
                    disabled={confirming}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <XCircle size={18} />
                    {t('orders.detail.phoneConfirm.reject')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Phone Confirmation Status (if confirmed/failed) */}
          {(order.status === 'awaiting_confirmation' || order.status === 'pending') && order.phone_confirmation_status && order.phone_confirmation_status !== 'pending' && (
            <div className={`card ${order.phone_confirmation_status === 'confirmed' ? 'success-card' : 'danger-card'}`} style={{ borderLeft: `4px solid var(${order.phone_confirmation_status === 'confirmed' ? '--success-color' : '--danger-color'})` }}>
              <div className="card-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {order.phone_confirmation_status === 'confirmed' ? (
                    <CheckCircle2 size={20} color="var(--success-color)" />
                  ) : (
                    <XCircle size={20} color="var(--danger-color)" />
                  )}
                  {t(`orders.detail.phoneConfirm.status.${order.phone_confirmation_status}`)}
                </h2>
              </div>
              <div style={{ padding: '16px' }}>
                <div className="info-grid">
                  <div className="info-item">
                    <label>{t('orders.detail.phoneConfirm.confirmedAt')}</label>
                    <div className="value">{formatDate(order.phone_confirmed_at)}</div>
                  </div>
                  {order.confirmation_notes && (
                    <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                      <label>{t('orders.detail.phoneConfirm.notes')}</label>
                      <div className="value" style={{ fontStyle: 'italic' }}>"{order.confirmation_notes}"</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Guepex Shipping Card */}
          {order.status === 'pending' && (order.tracking_number || canManageShipment) && (
            <div className="card shipping-card">
              <div className="card-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PackageCheck size={20} color="var(--primary-color)" />
                  {t('orders.detail.shipping.title')}
                </h2>
                <Truck size={18} color="var(--gray-400)" />
              </div>
              <div style={{ padding: '16px' }}>
                {order.tracking_number ? (
                  <>
                    {/* Tracking Number Section */}
                    <div style={{ backgroundColor: 'var(--success-bg, #f0fdf4)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--success-color, #22c55e)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {t('orders.detail.shipping.trackingNumber')}
                        </span>
                        <span className="badge" style={{ backgroundColor: 'var(--success-color)', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
                          {order.shipment_status || t('common.active')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--gray-900)', fontFamily: 'monospace', letterSpacing: '1px' }}>
                          {order.tracking_number}
                        </span>
                        <Copy
                          size={20}
                          style={{ cursor: 'pointer', color: 'var(--primary-color)', flexShrink: 0 }}
                          onClick={() => copyToClipboard(order.tracking_number)}
                          title={t('orders.detail.shipping.copyTracking')}
                        />
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                        <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                        {t('orders.detail.shipping.created')}: {order.guepex_created_at ? new Date(order.guepex_created_at).toLocaleString() : formatDate(order.created_at)}
                      </div>
                    </div>

                    {/* Payment Details Section */}
                    {(order.prepaid_amount > 0 || order.cod_amount > 0) && (
                      <div style={{ backgroundColor: 'var(--gray-50)', padding: '14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', textTransform: 'uppercase', marginBottom: '10px' }}>
                          {t('orders.detail.shipping.paymentDetails')}
                        </div>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {order.prepaid_amount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                                <CheckCircle size={14} style={{ display: 'inline', marginRight: '4px', color: 'var(--success-color)' }} />
                                {t('orders.detail.shipping.prepaid')}
                              </span>
                              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--success-color)' }}>
                                {formatCurrency(order.prepaid_amount)}
                              </span>
                            </div>
                          )}
                          {order.cod_amount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                                <CreditCard size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                {t('orders.detail.shipping.cashOnDelivery')}
                              </span>
                              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary-color)' }}>
                                {formatCurrency(order.cod_amount)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {order.guepex_label_url && (
                        <a
                          href={order.guepex_label_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary"
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
                        >
                          <Printer size={18} />
                          {t('orders.detail.shipping.downloadLabel')}
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        className="btn-secondary"
                        onClick={() => window.open(`https://guepex.com/track/${order.tracking_number}`, '_blank')}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <MapPin size={18} />
                        {t('orders.detail.shipping.trackGuepex')}
                        < ExternalLink size={14} />
                      </button >
                    </div >

                    {/* Shipment Status Timeline */}
                    {
                      order.shipment_status && (
                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', textTransform: 'uppercase', marginBottom: '12px' }}>
                            {t('orders.detail.shipping.shipmentStatus')}
                          </div>
                          <div style={{ fontSize: '14px', color: 'var(--gray-700)', lineHeight: '1.6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success-color)' }}></div>
                              <span style={{ fontWeight: '600' }}>{order.shipment_status}</span>
                            </div>
                            {order.shipment_status_reason && (
                              <div style={{ marginLeft: '16px', fontSize: '13px', color: 'var(--gray-500)' }}>
                                {order.shipment_status_reason}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }
                  </>
                ) : (
                  <>
                    <p style={{ marginBottom: '16px', color: 'var(--gray-600)' }}>
                      {t('orders.detail.shipping.description')}
                    </p>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label>{t('orders.detail.shipping.deliveryType')}</label>
                      <select
                        value={deliveryType}
                        onChange={(e) => setDeliveryType(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontFamily: 'inherit' }}
                      >
                        <option value="home">{t('orders.detail.shipping.types.home')}</option>
                        <option value="stopdesk">{t('orders.detail.shipping.types.stopdesk')}</option>
                      </select>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={handleCreateShipment}
                      disabled={creatingShipment}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <PackageCheck size={18} />
                      {creatingShipment ? t('common.processing') : t('orders.detail.shipping.createButton')}
                    </button>
                  </>
                )}
              </div >
            </div >
          )}

          {/* Shipment Tracking Timeline */}
          {order.tracking_number && <ShipmentTracking order={order} />}

          {/* Status Update Control */}
          <Can permission="orders.status.update">
            <div className="no-print">
              <OrderStatusControl
                currentStatus={order.status}
                onUpdateStatus={handleUpdateStatus}
                loading={statusUpdating}
              />
            </div>
          </Can>

          {/* Items Table Card */}
          <div className="card">
            <div className="card-header">
              <h2>{t('orders.detail.itemsTitle')}</h2>
              <span className="badge-count">{t('orders.detail.itemsCount', { count: order.items?.length || 0 })}</span>
            </div>
            <table className="items-table">
              <thead>
                <tr>
                  <th>{t('table.product')}</th>
                  <th className="text-right">{t('table.price')}</th>
                  <th className="text-right">{t('table.qty')}</th>
                  <th className="text-right">{t('orders.detail.summary.totalAmount')}</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <div className="product-cell">
                       {item.image ? (
                          <img
                            src={item.image}
                            alt={item.productName}
                            className="product-image"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <div
                          className="product-image-fallback"
                          style={{ display: item.image ? 'none' : 'flex', width: '48px', height: '48px', minWidth: '48px', backgroundColor: 'var(--gray-100)', borderRadius: '6px', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}
                        >
                          📦
                        </div>
                        <div>
                          <div className="product-name">
                            {item.productName}
                            {item.variantName && (
                              <span className="text-gray-500 text-sm ml-2" style={{ marginLeft: '8px', fontSize: '13px', color: '#6b7280', fontWeight: 'normal' }}>
                                ({item.variantName})
                              </span>
                            )}
                          </div>
                          <div className="sku">{t('orders.detail.sku')}: {item.skuSnapshot || item.sku || t('common.na')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right">{formatCurrency(item.price)}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right font-bold">{formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="order-summary">
              <div className="summary-row">
                <span>{t('orders.detail.summary.subtotal')}</span>
                <span>{formatCurrency(order.subtotal || 0)}</span>
              </div>
              <div className="summary-row">
                <span>{t('orders.detail.summary.shipping')}</span>
                <span>{formatCurrency(order.shipping || 0)}</span>
              </div>
              <div className="summary-row">
                <span>{t('orders.detail.summary.tax')}</span>
                <span>{formatCurrency(order.tax || 0)}</span>
              </div>
              <div className="summary-row total-row">
                <span>{t('orders.detail.summary.totalAmount')}</span>
                <span>{formatCurrency(order.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* Activity Timeline Card */}
          <OrderTimeline timeline={timeline} />
        </div >

        <div className="side-column">
          {/* Customer Info Card */}
          <div className="card">
            <div className="card-header">
              <h2>{t('orders.detail.customerDetails')}</h2>
              <User size={18} color="var(--gray-400)" />
            </div>
            <div className="info-grid">
              <div className="info-item">
                <label>{t('orders.detail.fullName')}</label>
                <div className="value">{order.customerName || order.customer?.name || t('common.guest')}</div>
              </div>
              <div className="info-item">
                <label>{t('orders.detail.emailAddress')}</label>
                <div className="value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={14} color="var(--gray-400)" />
                  {order.customerEmail || order.customer?.email || t('common.na')}
                </div>
              </div>
              <div className="info-item">
                <label>{t('orders.detail.phoneNumber')}</label>
                <div className="value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={14} color="var(--gray-400)" />
                  {order.customerPhone || order.customer?.phone || t('common.na')}
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address Card */}
          <div className="card">
            <div className="card-header">
              <h2>{t('orders.detail.shippingAddress')}</h2>
              <Truck size={18} color="var(--gray-400)" />
            </div>
            <div className="address-box">
              {order.shippingAddress ? (
                <>
                  <div className="addr-line">{order.shippingAddress.street}</div>
                  <div className="addr-line">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</div>
                  <div className="addr-line country">{order.shippingAddress.country || t('orders.detail.algeria')}</div>
                </>
              ) : (
                <div className="empty" style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>{t('orders.detail.noShippingAddress')}</div>
              )}
            </div>
          </div>

          {/* Payment Info Card */}
          <div className="card">
            <div className="card-header">
              <h2>{t('orders.detail.paymentMethod')}</h2>
              <CreditCard size={18} color="var(--gray-400)" />
            </div>
            <div className="info-grid">
              <div className="info-item">
                <label>{t('orders.detail.method')}</label>
                <div className="value">{order.paymentMethod || t('orders.detail.creditCard')}</div>
              </div>
              <div className="info-item">
                <label>{t('orders.detail.paymentStatus')}</label>
                <div className="value">
                  <StatusBadge status={order.paymentStatus || 'paid'} type="payment" />
                </div>
              </div>
            </div>
          </div>

          {/* Order Notes Card */}
          {order.notes && (
            <div className="card">
              <div className="card-header">
                <h2>{t('orders.detail.customerNote')}</h2>
                <FileText size={18} color="var(--gray-400)" />
              </div>
              <div className="customer-note">
                "{order.notes}"
              </div>
            </div>
          )}
        </div>
      </div >

      {/* Prepayment Dialog */}
      {
        canManageShipment && showPrepaymentDialog && (
          <div className="modal-overlay" onClick={() => setShowPrepaymentDialog(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={24} color="var(--warning-color)" />
                  {t('orders.detail.prepayment.title')}
                </h2>
              </div>
              <div className="modal-body">
                <div style={{ padding: '20px', background: 'var(--warning-bg)', border: '1px solid var(--warning-color)', borderRadius: '8px', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 600, color: 'var(--warning-dark)' }}>
                    ⚠️ {t('orders.detail.prepayment.limitExceeded')}
                  </p>
                  <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.6' }}>
                    {t('orders.detail.prepayment.limitDesc', { total: formatCurrency(order.total_amount) })}
                    <br /><br />
                    <strong>{t('orders.detail.prepayment.requiredDesc')}</strong>
                  </p>
                </div>

                <div className="info-grid" style={{ marginBottom: '20px' }}>
                  <div className="info-item">
                    <label>{t('orders.detail.prepayment.total')}</label>
                    <div className="value" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                      {formatCurrency(order.total_amount)}
                    </div>
                  </div>
                  <div className="info-item">
                    <label>{t('orders.detail.prepayment.codLimit')}</label>
                    <div className="value" style={{ color: 'var(--danger-color)' }}>
                      150 000 DA
                    </div>
                  </div>
                  <div className="info-item">
                    <label>{t('orders.detail.prepayment.minimum')}</label>
                    <div className="value" style={{ color: 'var(--warning-color)', fontWeight: 'bold' }}>
                      {formatCurrency(Math.max(0, order.total_amount - 150000))}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="prepaidAmount" style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                    {t('orders.detail.prepayment.paidAmount')}
                  </label>
                  <input
                    type="number"
                    id="prepaidAmount"
                    value={prepaidAmount}
                    onChange={(e) => setPrepaidAmount(parseFloat(e.target.value) || 0)}
                    min={0}
                    max={order.total_amount}
                    step={1000}
                    className="form-input"
                    style={{ width: '100%', padding: '12px', fontSize: '16px', fontWeight: 'bold' }}
                    placeholder="Ex: 400000"
                  />
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--gray-600)' }}>
                    💡 {t('orders.detail.prepayment.hint')}
                  </p>
                </div>

                <div style={{ padding: '16px', background: 'var(--success-bg)', border: '1px solid var(--success-color)', borderRadius: '8px', marginTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>{t('orders.detail.prepayment.prepaidAmount')}</span>
                    <strong style={{ color: 'var(--success-color)' }}>{formatCurrency(prepaidAmount)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--success-color)' }}>
                    <span>{t('orders.detail.prepayment.codCollect')}</span>
                    <strong style={{ fontSize: '18px', color: order.total_amount - prepaidAmount <= 150000 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                      {formatCurrency(Math.max(0, order.total_amount - prepaidAmount))}
                      {order.total_amount - prepaidAmount > 150000 && ' ⚠️'}
                    </strong>
                  </div>
                </div>

                {order.total_amount - prepaidAmount > 150000 && (
                  <div style={{ marginTop: '12px', padding: '12px', background: 'var(--danger-bg)', border: '1px solid var(--danger-color)', borderRadius: '6px' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--danger-dark)' }}>
                      ❌ {t('orders.detail.prepayment.tooHigh')}
                    </p>
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  className="btn-secondary"
                  onClick={() => setShowPrepaymentDialog(false)}
                  style={{ padding: '10px 24px' }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className="btn-primary"
                  onClick={() => confirmCreateShipment(prepaidAmount)}
                  disabled={order.total_amount - prepaidAmount > 150000}
                  style={{ padding: '10px 24px' }}
                >
                  <PackageCheck size={18} />
                  {t('orders.detail.prepayment.createShipment')}
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Confirmation Modal */}
      <ConfirmationDialog />

      {/* Invoice Modal */}
      <InvoiceModal
        order={order}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
      />
    </div >
  );
}

export default OrderDetailPage;
