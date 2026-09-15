import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';
import { metadataApi } from '../../../services/apiService';
import InlineVariantsManager from '../InlineVariantsManager';
import './Step2PricingInventory.css';

const toSafeInt = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumVariantStock = (variants = []) => {
  return variants.reduce((total, variant) => total + toSafeInt(variant?.stock ?? variant?.totalStock ?? variant?.total_stock), 0);
};

/**
 * Step 2: Pricing, Inventory & Stock Management
 * Define pricing strategy and inventory levels
 */
const Step2PricingInventory = ({ formData, updateFormData, errors, clearError, setStepValid, productId }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priceErrors, setPriceErrors] = useState({});

  // Load warehouses
  useEffect(() => {
    loadWarehouses();
  }, []);

  // Validate step whenever relevant fields change
  useEffect(() => {
    validateStep();
  }, [
    formData.costPrice,
    formData.wholesalePrice,
    formData.currentPrice,
    formData.salePrice,
    formData.productFees,
    formData.stock,
    formData.reorderLevel,
    formData.warehouseId,
    formData.hasVariants,
    formData.variants
  ]);

  const loadWarehouses = async () => {
    try {
      const data = await metadataApi.getWarehouses();
      setWarehouses(data.filter(w => !w.deleted_at));
    } catch (error) {
      console.error('Failed to load warehouses:', error);
      // Fallback warehouse
      setWarehouses([{
        warehouse_id: 1,
        warehouse_name: "Entrepôt Central Alger",
        location_address: "Zone Industrielle Rouiba, Alger 16012"
      }]);
    } finally {
      setLoading(false);
    }
  };

  const validateStep = () => {
    const newPriceErrors = {};

    const cost = parseFloat(formData.costPrice) || 0;
    const wholesale = parseFloat(formData.wholesalePrice) || 0;
    const current = parseFloat(formData.currentPrice) || 0;
    const sale = formData.salePrice ? parseFloat(formData.salePrice) : null;
    const fees = parseFloat(formData.productFees) || 0;
    const landedCost = cost + fees;
    const hasVariants = !!formData.hasVariants;
    const stock = hasVariants ? sumVariantStock(formData.variants) : parseInt(formData.stock);
    const reorder = parseInt(formData.reorderLevel);

    if (!formData.currentPrice || current <= 0) newPriceErrors.currentPrice = t('errors.current_price_req');
    if (!hasVariants && (formData.stock === '' || isNaN(stock) || stock < 0)) {
      newPriceErrors.stock = t('errors.stock_req');
    }

    if (cost > 0 && current > 0 && cost > current) {
      newPriceErrors.costPrice = t('errors.cost_exceed');
      newPriceErrors.currentPrice = t('errors.cost_exceed');
    }

    if (wholesale > 0 && current > 0 && wholesale > current) {
      newPriceErrors.wholesalePrice = t('errors.wholesale_exceed', 'Le prix de gros ne peut pas dépasser le prix de détail');
    }

    if (cost > 0 && wholesale > 0 && wholesale < cost) {
      newPriceErrors.wholesalePrice = t('errors.wholesale_min', 'Le prix de gros doit être supérieur au prix de coût');
    }

    if (sale !== null && sale > 0) {
      if (sale >= current) newPriceErrors.salePrice = t('errors.sale_less');
      if (landedCost > 0 && sale <= landedCost) newPriceErrors.salePrice = t('errors.sale_greater');
    }

    if (fees < 0) {
      newPriceErrors.productFees = t('errors.positive_number', 'La valeur doit être positive');
    }

    if (fees > 0 && landedCost > current && current > 0) {
      newPriceErrors.currentPrice = t('errors.cost_exceed');
    }

    if (!formData.warehouseId || formData.warehouseId <= 0) newPriceErrors.warehouseId = t('errors.warehouse_req');

    setPriceErrors(newPriceErrors);

    const hasValidStockInput = hasVariants || stock >= 0;
    const isValid = Object.keys(newPriceErrors).length === 0 &&
      current > 0 &&
      hasValidStockInput &&
      formData.warehouseId > 0;

    setStepValid(isValid);
  };

  const handleChange = (field, value) => {
    updateFormData(field, value);
    clearError(field);
    if (['costPrice', 'wholesalePrice', 'currentPrice', 'salePrice', 'productFees'].includes(field)) {
      setPriceErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const calculateLandedCost = () => (parseFloat(formData.costPrice) || 0) + (parseFloat(formData.productFees) || 0);

  const calculateProfitMargin = () => {
    const current = parseFloat(formData.currentPrice) || 0;
    const landedCost = calculateLandedCost();
    if (landedCost > 0 && current > landedCost) {
      return ((current - landedCost) / landedCost * 100).toFixed(1);
    }
    return null;
  };

  const getStockWarningLevel = () => {
    const stock = formData.hasVariants ? sumVariantStock(formData.variants || []) : parseInt(formData.stock) || 0;
    const reorder = parseInt(formData.reorderLevel) || 0;

    if (stock === 0) return { key: 'out-of-stock', label: t('wizard.step2.status_texts.out') };
    if (stock <= reorder) return { key: 'low-stock', label: t('wizard.step2.status_texts.low') };
    if (stock <= reorder * 2) return { key: 'moderate-stock', label: t('wizard.step2.status_texts.moderate') };
    return { key: 'good-stock', label: t('wizard.step2.status_texts.good') };
  };

  if (loading) {
    return (
      <div className="step-loading">
        <div className="spinner-large"></div>
        <p>{t('wizard.step1.loading')}</p>
      </div>
    );
  }

  const profitMargin = calculateProfitMargin();
  const stockLevel = getStockWarningLevel();
  const hasVariants = !!formData.hasVariants;
  const effectiveStock = hasVariants ? sumVariantStock(formData.variants) : (parseInt(formData.stock) || 0);

  return (
    <div className="wizard-step step2-pricing-inventory">
      <div className="step-title">
        <h2>{t('wizard.step2.title')}</h2>
        <p>{t('wizard.step2.subtitle')}</p>
      </div>

      {/* Pricing Section */}
      <div className="form-section">
        <h3 className="section-heading">
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('wizard.step2.pricing_section')}
        </h3>

        <div className="form-grid">
          {/* Cost Price */}
          <div className="form-group">
            <label htmlFor="costPrice">
              {t('wizard.step2.cost_label')}
            </label>
            <input
              id="costPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.costPrice}
              onChange={(e) => handleChange('costPrice', e.target.value)}
              className={priceErrors.costPrice ? 'error' : ''}
              placeholder={t('wizard.step2.cost_placeholder')}
            />
            {priceErrors.costPrice && (
              <span className="error-message">{priceErrors.costPrice}</span>
            )}
            <div className="field-hint">{t('wizard.step2.cost_hint')}</div>
          </div>

          {/* Wholesale Price */}
          <div className="form-group">
            <label htmlFor="wholesalePrice">
              {t('wizard.step2.wholesale_label', 'Prix de Gros')}
            </label>
            <input
              id="wholesalePrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.wholesalePrice}
              onChange={(e) => handleChange('wholesalePrice', e.target.value)}
              className={priceErrors.wholesalePrice ? 'error' : ''}
              placeholder={t('wizard.step2.wholesale_placeholder', 'Prix de gros (optionnel)')}
            />
            {priceErrors.wholesalePrice && (
              <span className="error-message">{priceErrors.wholesalePrice}</span>
            )}
            <div className="field-hint">{t('wizard.step2.wholesale_hint', 'Prix pour les achats en gros (optionnel)')}</div>
          </div>

          {/* Current Price */}
          <div className="form-group">
            <label htmlFor="currentPrice" className="required">
              {t('wizard.step2.current_label')}
            </label>
            <input
              id="currentPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.currentPrice}
              onChange={(e) => handleChange('currentPrice', e.target.value)}
              className={priceErrors.currentPrice ? 'error' : ''}
              placeholder={t('wizard.step2.current_placeholder')}
            />
            {priceErrors.currentPrice && (
              <span className="error-message">{priceErrors.currentPrice}</span>
            )}
            <div className="field-hint">{t('wizard.step2.current_hint')}</div>
          </div>

          {/* Sale Price */}
          <div className="form-group">
            <label htmlFor="salePrice">
              {t('wizard.step2.sale_label')}
            </label>
            <input
              id="salePrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.salePrice}
              onChange={(e) => handleChange('salePrice', e.target.value)}
              className={priceErrors.salePrice ? 'error' : ''}
              placeholder={t('wizard.step2.sale_placeholder')}
            />
            {priceErrors.salePrice && (
              <span className="error-message">{priceErrors.salePrice}</span>
            )}
            <div className="field-hint">{t('wizard.step2.sale_hint')}</div>
          </div>

          {/* Product Fees */}
          <div className="form-group">
            <label htmlFor="productFees">
              {t('wizard.step2.fees_label', 'Frais produit')}
            </label>
            <input
              id="productFees"
              type="number"
              step="0.01"
              min="0"
              value={formData.productFees}
              onChange={(e) => handleChange('productFees', e.target.value)}
              className={priceErrors.productFees ? 'error' : ''}
              placeholder={t('wizard.step2.fees_placeholder', 'Transport, dédouanage, handling…')}
            />
            {priceErrors.productFees && (
              <span className="error-message">{priceErrors.productFees}</span>
            )}
            <div className="field-hint">{t('wizard.step2.fees_hint', 'Total des frais annexes par unité (transport, dédouanage, assurance, etc.)')}</div>
          </div>
        </div>

        <div className="price-summary-card" style={{ marginTop: '1.5rem' }}>
          <h4>{t('wizard.step2.margin_label')}</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">{t('products.detail.productFees')}</span>
              <span className="summary-value success">
                {new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-DZ' : 'fr-DZ', {
                  style: 'currency',
                  currency: 'DZD'
                }).format(parseFloat(formData.productFees) || 0)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">{t('products.detail.totalCost')}</span>
              <span className="summary-value primary">
                {new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-DZ' : 'fr-DZ', {
                  style: 'currency',
                  currency: 'DZD'
                }).format(calculateLandedCost())}
              </span>
            </div>
            {profitMargin !== null && (
              <div className="summary-item">
                <span className="summary-label">{t('wizard.step2.margin_label')}</span>
                <span className="summary-value success">{profitMargin}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inventory Section */}
      <div className="form-section">
        <h3 className="section-heading">
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('wizard.step2.stock_section')}
        </h3>

        <div className="form-grid">
          {/* Warehouse */}
          <div className="form-group full-width">
            <label htmlFor="warehouseId" className="required">
              {t('wizard.step2.warehouse_label')}
            </label>
            <select
              id="warehouseId"
              value={formData.warehouseId || ''}
              onChange={(e) => handleChange('warehouseId', parseInt(e.target.value))}
              className={priceErrors.warehouseId ? 'error' : ''}
            >
              <option value="">{t('wizard.step2.warehouse_placeholder')}</option>
              {warehouses.map(warehouse => (
                <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                  {warehouse.warehouse_name} - {warehouse.location_address}
                </option>
              ))}
            </select>
            {priceErrors.warehouseId && (
              <span className="error-message">{priceErrors.warehouseId}</span>
            )}
          </div>

          {/* Stock Quantity */}
          <div className="form-group" style={{ display: formData.hasVariants ? 'none' : undefined }}>
            <label htmlFor="stock" className="required">
              {t('wizard.step2.quantity_label')}
            </label>
            <input
              id="stock"
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) => handleChange('stock', e.target.value)}
              className={priceErrors.stock ? 'error' : ''}
              placeholder={t('wizard.step2.quantity_placeholder')}
            />
            {priceErrors.stock && (
              <span className="error-message">{priceErrors.stock}</span>
            )}

            <div className={`stock-indicator ${stockLevel.key}`}>
              {stockLevel.key === 'out-of-stock' && `⚠️ ${t('wizard.step2.status_texts.out')}`}
              {stockLevel.key === 'low-stock' && `⚠️ ${t('wizard.step2.status_texts.low')}`}
              {stockLevel.key === 'moderate-stock' && `✓ ${t('wizard.step2.status_texts.moderate')}`}
              {stockLevel.key === 'good-stock' && `✓ ${t('wizard.step2.status_texts.good')}`}
            </div>
          </div>

          {formData.hasVariants && (
            <div className="form-group">
              <label>{t('wizard.step2.variant_stock_total', 'Total variant stock')}</label>
              <div className={`variant-stock-summary ${stockLevel.key}`}>
                <strong>{effectiveStock}</strong>
                <span>{t('products.units')}</span>
              </div>
              <div className="field-hint">
                {t('wizard.step2.variant_stock_count', {
                  count: formData.variants?.length || 0,
                  defaultValue: `${formData.variants?.length || 0} variants`
                })}
              </div>
            </div>
          )}

          {/* Reorder Level */}
          <div className="form-group">
            <label htmlFor="reorderLevel">
              {t('wizard.step2.reorder_label')}
            </label>
            <input
              id="reorderLevel"
              type="number"
              min="0"
              value={formData.reorderLevel}
              onChange={(e) => handleChange('reorderLevel', e.target.value)}
              placeholder={t('wizard.step2.reorder_placeholder')}
            />
            <div className="field-hint">{t('wizard.step2.reorder_hint')}</div>
          </div>
        </div>

        {/* Stock Threshold Visualization */}
        <div className="stock-threshold-viz">
          <div className="threshold-bar">
            <div
              className={`stock-fill ${stockLevel.key}`}
              style={{
                width: `${Math.min(effectiveStock / Math.max((parseInt(formData.reorderLevel) || 5) * 3, 1) * 100, 100)}%`
              }}
            >
              <span className="stock-count">{effectiveStock} {t('products.units')}</span>
            </div>
            <div
              className="reorder-marker"
              style={{
                [isRTL ? 'right' : 'left']: `${(parseInt(formData.reorderLevel) || 5) / Math.max((parseInt(formData.reorderLevel) || 5) * 3, 1) * 100}%`,
                [isRTL ? 'left' : 'right']: 'auto'
              }}
            >
              <span className="marker-label">{t('wizard.step2.reorder_marker', { count: formData.reorderLevel || 5 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Details Section */}
      <div className="form-section">
        <h3 className="section-heading">
          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('wizard.step2.specs_section')}
        </h3>

        <div className="form-grid">
          {/* Weight */}
          <div className="form-group">
            <label htmlFor="weight">
              {t('wizard.step2.weight_label')}
            </label>
            <input
              id="weight"
              type="number"
              step="0.1"
              min="0"
              value={formData.weight}
              onChange={(e) => handleChange('weight', e.target.value)}
              placeholder={t('wizard.step2.weight_placeholder')}
            />
            <div className="field-hint">{t('wizard.step2.weight_hint')}</div>
          </div>

          {/* Warranty */}
          <div className="form-group">
            <label htmlFor="warrantyMonths">
              {t('wizard.step2.warranty_label')}
            </label>
            <input
              id="warrantyMonths"
              type="number"
              min="0"
              value={formData.warrantyMonths}
              onChange={(e) => handleChange('warrantyMonths', e.target.value)}
              placeholder={t('wizard.step2.warranty_placeholder')}
            />
            <div className="field-hint">{t('wizard.step2.warranty_hint')}</div>
          </div>
        </div>

        {/* Dimensions Section */}
        <h4 style={{ marginTop: '2rem', marginBottom: '1rem' }}>
          📦 {t('wizard.step2.dimensions_section', 'Product Dimensions (for shipping)')}
        </h4>
        <div className="form-grid">
          {/* Length */}
          <div className="form-group">
            <label htmlFor="length">
              {t('wizard.step2.length_label', 'Length (cm)')}
            </label>
            <input
              id="length"
              type="number"
              step="0.1"
              min="0"
              value={formData.length || ''}
              onChange={(e) => handleChange('length', e.target.value)}
              placeholder={t('wizard.step2.length_placeholder', '30')}
            />
            <div className="field-hint">{t('wizard.step2.length_hint', 'Product length in cm')}</div>
          </div>

          {/* Width */}
          <div className="form-group">
            <label htmlFor="width">
              {t('wizard.step2.width_label', 'Width (cm)')}
            </label>
            <input
              id="width"
              type="number"
              step="0.1"
              min="0"
              value={formData.width || ''}
              onChange={(e) => handleChange('width', e.target.value)}
              placeholder={t('wizard.step2.width_placeholder', '20')}
            />
            <div className="field-hint">{t('wizard.step2.width_hint', 'Product width in cm')}</div>
          </div>

          {/* Height */}
          <div className="form-group">
            <label htmlFor="height">
              {t('wizard.step2.height_label', 'Height (cm)')}
            </label>
            <input
              id="height"
              type="number"
              step="0.1"
              min="0"
              value={formData.height || ''}
              onChange={(e) => handleChange('height', e.target.value)}
              placeholder={t('wizard.step2.height_placeholder', '10')}
            />
            <div className="field-hint">{t('wizard.step2.height_hint', 'Product height in cm')}</div>
          </div>
        </div>
      </div>

      {/* Product Variants Section */}
      <div className="form-section">
        <h3 className="section-heading">
          <Package size={20} className="section-icon" />
          {t('wizard.step2.variants_section', 'Product Variants')}
        </h3>

        <div className="variants-toggle-section">
          <div className="variants-toggle-row">
            <div className="variants-toggle-label">
              <Package size={18} />
              <div>
                <h4>{t('wizard.step2.variants_toggle', 'This product has variants')}</h4>
                <p>{t('wizard.step2.variants_toggle_hint', 'Enable to add size, color, or material options')}</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={formData.hasVariants || false}
                onChange={(e) => updateFormData('hasVariants', e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {formData.hasVariants && (
          <div style={{ marginTop: '1rem' }}>
            <InlineVariantsManager
              initialVariants={formData.variants || []}
              onChange={(variants) => updateFormData('variants', variants)}
              productId={productId}
              baseSku={formData.sku}
              basePrice={formData.currentPrice}
              baseCost={formData.costPrice}
              baseWeight={formData.weight}
              defaultWarehouseId={formData.warehouseId}
            />
          </div>
        )}
      </div>

      {/* Price Summary Card */}
      <div className="price-summary-card">
        <h4>{t('wizard.step2.summary_title')}</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">{t('wizard.step2.cost_label')}</span>
            <span className="summary-value">{parseFloat(formData.costPrice || 0).toLocaleString()} {t('common.currency')}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">{t('wizard.step2.current_label')}</span>
            <span className="summary-value primary">{parseFloat(formData.currentPrice || 0).toLocaleString()} {t('common.currency')}</span>
          </div>
          {formData.salePrice && parseFloat(formData.salePrice) > 0 && (
            <div className="summary-item">
              <span className="summary-label">{t('wizard.step2.sale_label')}</span>
              <span className="summary-value sale">{parseFloat(formData.salePrice).toLocaleString()} {t('common.currency')}</span>
            </div>
          )}
          {profitMargin !== null && (
            <div className="summary-item">
              <span className="summary-label">{t('wizard.step2.margin_label')}:</span>
              <span className="summary-value success">{profitMargin}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step2PricingInventory;
