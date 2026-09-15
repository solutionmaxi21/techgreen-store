import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { inventoryApi } from '../services/apiService';
import { ChevronLeft, Package, TrendingUp, TrendingDown, RefreshCw, AlertTriangle, History, Save } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import './StockAdjustmentPage.css';

const StockAdjustmentPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [stockItem, setStockItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Quick adjustment presets
  const quickAmounts = [10, 25, 50, 100, 500];

  useEffect(() => {
    loadStockItem();
  }, [id]);

  const loadStockItem = async () => {
    try {
      setLoading(true);
      const data = await inventoryApi.getById(id);
      setStockItem(data);
    } catch (error) {
      console.error('Error loading stock item:', error);
      toast.error(t('inventory.adjust.alerts.loadFailed'));
      navigate('/inventory');
    } finally {
      setLoading(false);
    }
  };

  const calculateNewQuantity = () => {
    if (!quantity || !stockItem) return stockItem?.quantity || 0;

    const current = stockItem.quantity || 0;
    const adj = parseInt(quantity) || 0;

    switch (adjustmentType) {
      case 'add':
        return current + adj;
      case 'remove':
        return Math.max(0, current - adj);
      case 'set':
        return adj;
      default:
        return current;
    }
  };

  const handleQuickAmount = (amount) => {
    setQuantity(amount.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!quantity || parseInt(quantity) <= 0) {
      toast.error(t('inventory.adjust.validation.quantity'));
      return;
    }

    if (!reason.trim()) {
      toast.error(t('inventory.adjust.validation.reason'));
      return;
    }

    try {
      setSubmitting(true);

      await inventoryApi.adjustStock(id, {
        adjustment: parseInt(quantity),
        type: adjustmentType,
        reason: reason.trim(),
        notes: notes.trim(),
      });

      toast.success(t('inventory.adjust.alerts.adjustSuccess'));
      navigate('/inventory');
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error(t('inventory.adjust.alerts.adjustFailed', { message: error.message }));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setQuantity('');
    setReason('');
    setNotes('');
    setAdjustmentType('add');
  };

  if (loading) {
    return (
      <div className="stock-adjustment-page">
        <div className="loading-state">
          <RefreshCw className="animate-spin" size={32} />
          <p>{t('inventory.adjust.loading')}</p>
        </div>
      </div>
    );
  }

  if (!stockItem) {
    return (
      <div className="stock-adjustment-page">
        <div className="error-state">
          <AlertTriangle size={48} />
          <p>{t('inventory.adjust.notFound')}</p>
          <button onClick={() => navigate('/inventory')} className="btn-primary">
            {t('inventory.adjust.backToInventory')}
          </button>
        </div>
      </div>
    );
  }

  const newQuantity = calculateNewQuantity();
  const difference = newQuantity - stockItem.quantity;

  return (
    <div className="stock-adjustment-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button onClick={() => navigate('/inventory')} className="back-button" title={t('inventory.adjust.backToInventory')}>
            <ChevronLeft size={20} />
          </button>
          <div className="header-content">
            <h1 className="page-title">{t('inventory.adjust.title')}</h1>
            <p className="page-subtitle">{t('inventory.adjust.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="adjustment-layout">
        {/* Left Column - Current Stock Info */}
        <div className="stock-info-section">
          <div className="card">
            <div className="card-header">
              <Package size={20} />
              <h2>{t('inventory.adjust.currentStock')}</h2>
            </div>
            <div className="card-body">
              <div className="product-info">
                <h3 className="product-name">
                  {stockItem.product_name}
                  {stockItem.variant_name && <span className="text-gray-500 text-sm ml-2" style={{ marginLeft: '8px', fontSize: '14px', color: '#6b7280' }}>({stockItem.variant_name})</span>}
                </h3>
                <p className="product-sku">{t('inventory.adjust.sku')}: {stockItem.variant_sku ? stockItem.variant_sku : stockItem.product_sku}</p>
                <p className="warehouse-info">
                  <strong>{t('inventory.adjust.warehouse')}:</strong> {stockItem.warehouse_name}
                  <br />
                  <span className="text-sm text-gray-500">{stockItem.warehouse_location}</span>
                </p>
              </div>

              <div className="stock-metrics">
                <div className="metric">
                  <label>{t('inventory.adjust.totalQuantity')}</label>
                  <div className="metric-value">{stockItem.quantity}</div>
                </div>
                <div className="metric">
                  <label>{t('inventory.adjust.reserved')}</label>
                  <div className="metric-value reserved">{stockItem.reserved_quantity || 0}</div>
                </div>
                <div className="metric">
                  <label>{t('inventory.adjust.available')}</label>
                  <div className="metric-value available">{stockItem.quantity_available}</div>
                </div>
                <div className="metric">
                  <label>{t('inventory.adjust.reorderLevel')}</label>
                  <div className="metric-value">{stockItem.reorder_level}</div>
                </div>
              </div>

              {stockItem.is_low_stock && (
                <div className="alert alert-warning">
                  <AlertTriangle size={16} />
                  <span>{t('inventory.adjust.lowStockAlert')}</span>
                </div>
              )}

              {stockItem.quantity === 0 && (
                <div className="alert alert-danger">
                  <AlertTriangle size={16} />
                  <span>{t('inventory.adjust.outOfStock')}</span>
                </div>
              )}

              {stockItem.last_restocked && (
                <div className="last-restocked">
                  <History size={14} />
                  <span>{t('inventory.adjust.lastRestocked', { date: formatDate(stockItem.last_restocked) })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Preview of Change */}
          {quantity && (
            <div className="card preview-card">
              <div className="card-header">
                <TrendingUp size={20} />
                <h2>{t('inventory.adjust.preview.title')}</h2>
              </div>
              <div className="card-body">
                <div className="preview-calculation">
                  <div className="preview-row">
                    <span>{t('inventory.adjust.preview.current')}</span>
                    <strong>{stockItem.quantity}</strong>
                  </div>
                  <div className="preview-row change">
                    <span>
                      {adjustmentType === 'set' ? t('inventory.adjust.preview.setTo') :
                        adjustmentType === 'add' ? t('inventory.adjust.preview.adding') : t('inventory.adjust.preview.removing')}
                    </span>
                    <strong className={difference > 0 ? 'positive' : difference < 0 ? 'negative' : ''}>
                      {adjustmentType === 'set' ? quantity :
                        `${difference > 0 ? '+' : ''}${difference}`}
                    </strong>
                  </div>
                  <div className="preview-divider"></div>
                  <div className="preview-row result">
                    <span>{t('inventory.adjust.preview.newTotal')}</span>
                    <strong className="new-quantity">{newQuantity}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Adjustment Form */}
        <div className="adjustment-form-section">
          <form onSubmit={handleSubmit} className="card">
            <div className="card-header">
              <RefreshCw size={20} />
              <h2>{t('inventory.adjust.form.title')}</h2>
            </div>
            <div className="card-body">
              {/* Adjustment Type */}
              <div className="form-group">
                <label className="form-label required">{t('inventory.adjust.form.adjustmentType')}</label>
                <div className="adjustment-type-tabs">
                  <button
                    type="button"
                    className={`type-tab ${adjustmentType === 'add' ? 'active' : ''}`}
                    onClick={() => setAdjustmentType('add')}
                  >
                    <TrendingUp size={18} />
                    <span>{t('inventory.adjust.form.addStock')}</span>
                  </button>
                  <button
                    type="button"
                    className={`type-tab ${adjustmentType === 'remove' ? 'active' : ''}`}
                    onClick={() => setAdjustmentType('remove')}
                  >
                    <TrendingDown size={18} />
                    <span>{t('inventory.adjust.form.removeStock')}</span>
                  </button>
                  <button
                    type="button"
                    className={`type-tab ${adjustmentType === 'set' ? 'active' : ''}`}
                    onClick={() => setAdjustmentType('set')}
                  >
                    <RefreshCw size={18} />
                    <span>{t('inventory.adjust.form.setTotal')}</span>
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="form-group">
                <label className="form-label required">
                  {adjustmentType === 'set' ? t('inventory.adjust.form.newTotalQuantity') : t('inventory.adjust.form.quantityToAdjust')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="form-control large"
                  placeholder={adjustmentType === 'set' ? t('inventory.adjust.form.placeholderNewTotal') : t('inventory.adjust.form.placeholderQuantity')}
                  required
                />

                {/* Quick Amount Buttons */}
                {adjustmentType !== 'set' && (
                  <div className="quick-amounts">
                    <span className="quick-label">{t('inventory.adjust.form.quick')}</span>
                    {quickAmounts.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => handleQuickAmount(amount)}
                        className="quick-btn"
                      >
                        +{amount}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="form-group">
                <label className="form-label required">{t('inventory.adjust.form.reason')}</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="form-control"
                  required
                >
                  <option value="">{t('inventory.adjust.form.selectReason')}</option>
                  <optgroup label={t('inventory.adjust.form.reasonGroups.receiving')}>
                    <option value="New shipment received">{t('inventory.adjust.form.reasons.newShipment')}</option>
                    <option value="Supplier delivery">{t('inventory.adjust.form.reasons.supplierDelivery')}</option>
                    <option value="Transfer from another warehouse">{t('inventory.adjust.form.reasons.transferFromAnotherWarehouse')}</option>
                  </optgroup>
                  <optgroup label={t('inventory.adjust.form.reasonGroups.removal')}>
                    <option value="Damaged goods">{t('inventory.adjust.form.reasons.damagedGoods')}</option>
                    <option value="Expired products">{t('inventory.adjust.form.reasons.expiredProducts')}</option>
                    <option value="Return to supplier">{t('inventory.adjust.form.reasons.returnToSupplier')}</option>
                    <option value="Transfer to another warehouse">{t('inventory.adjust.form.reasons.transferToAnotherWarehouse')}</option>
                  </optgroup>
                  <optgroup label={t('inventory.adjust.form.reasonGroups.correction')}>
                    <option value="Inventory count correction">{t('inventory.adjust.form.reasons.inventoryCountCorrection')}</option>
                    <option value="System error correction">{t('inventory.adjust.form.reasons.systemErrorCorrection')}</option>
                    <option value="Reconciliation">{t('inventory.adjust.form.reasons.reconciliation')}</option>
                  </optgroup>
                  <optgroup label={t('inventory.adjust.form.reasonGroups.other')}>
                    <option value="Other">{t('inventory.adjust.form.reasons.other')}</option>
                  </optgroup>
                </select>
              </div>

              {/* Additional Notes */}
              <div className="form-group">
                <label className="form-label">{t('inventory.adjust.form.notes')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-control"
                  rows="4"
                  placeholder={t('inventory.adjust.form.notesPlaceholder')}
                />
              </div>
            </div>

            <div className="card-footer">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
                disabled={submitting}
              >
                {t('inventory.adjust.form.reset')}
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || !quantity || !reason}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    {t('inventory.adjust.form.processing')}
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {t('inventory.adjust.form.confirm')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StockAdjustmentPage;
