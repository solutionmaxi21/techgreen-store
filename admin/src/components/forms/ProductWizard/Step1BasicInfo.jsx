import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { metadataApi, supplierApi } from '../../../services/apiService';
import { useSkuValidation } from '../../../hooks/useSkuValidation';
import { BarcodeManager } from '../../BarcodeManager';
import './Step1BasicInfo.css';

// Helper to get localized name from bilingual object or string
const getLocalizedName = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return value.fr || value.ar || '';
  return value;
};

/**
 * Step 1: Basic Information & Categorization
 * Captures core product identity and classification
 */
const Step1BasicInfo = ({ formData, updateFormData, errors, clearError, setStepValid, productId, barcode, onBarcodeUpdate }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const { isChecking, isValid, message, validateSku } = useSkuValidation();

  // Load metadata
  useEffect(() => {
    loadMetadata();
  }, []);

  // Validate step whenever form data changes
  useEffect(() => {
    validateStep();
  }, [formData.name, formData.sku, formData.categoryId, formData.serialNumber, isValid]);

  // FIX: Trigger validation on mount if SKU exists (e.g. coming back from Resume)
  useEffect(() => {
    if (formData.sku && formData.sku.length >= 3) {
      validateSku(formData.sku, productId ? { excludeProductId: productId } : undefined);
    }
  }, []); // Run once on mount

  const loadMetadata = async () => {
    try {
      const [categoriesData, suppliersData] = await Promise.all([
        metadataApi.getCategories(),
        supplierApi.getAll()
      ]);

      // Transform API response to match expected format
      // Backend returns: category_id, category_name, parent_category_id, level, category_slug
      const transformedCategories = (categoriesData || []).map(cat => ({
        category_id: cat.category_id ?? cat.id,
        category_name: cat.category_name ?? cat.name,
        parent_category_id: cat.parent_category_id ?? cat.parentId,
        level: cat.level,
        category_slug: cat.category_slug ?? cat.slug
      }));

      setCategories(transformedCategories);
      setSuppliers(suppliersData || []);
    } catch (error) {
      console.error('Failed to load metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateStep = () => {
    const isNameValid = formData.name.trim().length >= 2 && formData.name.trim().length <= 200;
    // Allow step to be valid if SKU is structurally valid, even if server validation is pending/failed (optional choice)
    // or strictly require isValid === true. Here keeping strict:
    const isSkuValid = formData.sku.trim().length >= 3 && /^[A-Za-z0-9-_]+$/.test(formData.sku) && (isValid === true || isValid === null);
    const isCategoryValid = formData.categoryId !== null && formData.categoryId > 0;
    const stepIsValid = isNameValid && isSkuValid && isCategoryValid;
    setStepValid(stepIsValid);
  };

  const handleChange = (field, value) => {
    updateFormData(field, value);
    clearError(field);

    // Trigger SKU validation
    if (field === 'sku') {
      validateSku(value, productId ? { excludeProductId: productId } : undefined);
    }
  };

  const generateSku = () => {
    const brand = formData.brand || 'PROD';
    // FIX: Changed 'c.id' to 'c.category_id' to match the transformed data structure
    const category = categories.find(c => c.category_id === formData.categoryId);
    const categoryName = getLocalizedName(category?.category_name);
    const categoryPart = categoryName ? categoryName.substring(0, 3).toUpperCase() : 'CAT';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newSku = `${brand.substring(0, 4).toUpperCase()}-${categoryPart}-${random}`;
    handleChange('sku', newSku);
  };

  const getSkuStatusClass = () => {
    if (!formData.sku || formData.sku.length < 3) return '';
    if (isChecking) return 'checking';
    if (isValid === true) return 'valid';
    if (isValid === false) return 'invalid';
    return '';
  };

  // Group categories by parent
  const getCategoriesHierarchy = () => {
    const rootCategories = categories.filter(c => !c.parent_category_id && !c.deleted_at);
    const childCategories = categories.filter(c => c.parent_category_id && !c.deleted_at);

    return rootCategories.map(parent => ({
      ...parent,
      children: childCategories.filter(child => child.parent_category_id === parent.category_id)
    }));
  };

  if (loading) {
    return (
      <div className="step-loading">
        <div className="spinner-large"></div>
        <p>{t('wizard.step1.loading')}</p>
      </div>
    );
  }

  const hierarchicalCategories = getCategoriesHierarchy();

  return (
    <div className="wizard-step step1-basic-info">
      <div className="step-title">
        <h2>{t('wizard.step1.title')}</h2>
        <p>{t('wizard.step1.subtitle')}</p>
      </div>

      <div className="form-grid">
        {/* Product Name */}
        <div className="form-group full-width">
          <label htmlFor="name" className="required">
            {t('wizard.step1.name_label')}
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={errors.name ? 'error' : ''}
            placeholder={t('wizard.step1.name_placeholder')}
            maxLength={200}
          />
          <div className="field-meta">
            <span className="char-count">{formData.name.length}/200</span>
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>
        </div>

        {/* SKU */}
        <div className="form-group">
          <label htmlFor="sku" className="required">
            {t('wizard.step1.sku_label')}
          </label>
          <div className="input-with-button">
            <input
              id="sku"
              type="text"
              value={formData.sku}
              onChange={(e) => handleChange('sku', e.target.value)}
              className={`${errors.sku ? 'error' : ''} ${getSkuStatusClass()}`}
              placeholder={t('wizard.step1.sku_placeholder')}
              maxLength={50}
            />
            <button
              type="button"
              className="btn-icon-action"
              onClick={generateSku}
              title={t('wizard.step1.sku_generate')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }} />
              </svg>
            </button>
          </div>
          <div className="field-meta">
            {isChecking && <span className="sku-status checking">{t('wizard.step1.sku_checking')}</span>}
            {!isChecking && message && (
              <span className={`sku-status ${isValid ? 'valid' : 'invalid'}`}>
                {message}
              </span>
            )}
            {errors.sku && <span className="error-message">{errors.sku}</span>}
          </div>
          <div className="field-hint">
            {t('wizard.step1.sku_hint')}
          </div>
        </div>

        {/* Serial Number */}
        <div className="form-group">
          <label htmlFor="serialNumber">
            {t('wizard.step1.serial_number_label', 'Serial Number')}
          </label>
          <input
            id="serialNumber"
            type="text"
            value={formData.serialNumber || ''}
            onChange={(e) => handleChange('serialNumber', e.target.value)}
            placeholder={t('wizard.step1.serial_number_placeholder', 'Enter serial number')}
            maxLength={100}
          />
        </div>

        {/* Model Number */}
        <div className="form-group">
          <label htmlFor="modelNumber">
            {t('wizard.step1.model_label')}
          </label>
          <input
            id="modelNumber"
            type="text"
            value={formData.modelNumber}
            onChange={(e) => handleChange('modelNumber', e.target.value)}
            placeholder={t('wizard.step1.model_placeholder')}
            maxLength={50}
          />
        </div>

        {/* Barcode - Shared line with Model Number */}
        <div className="form-group">
          <label>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginInlineEnd: '4px' }}>
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M6 6V4M10 6V4M14 6V4M18 6V4M6 18v2M10 18v2M14 18v2M18 18v2" />
            </svg>
            {t('Barcode')}
          </label>
          {productId ? (
            <BarcodeManager
              productId={productId}
              currentBarcode={barcode}
              sku={formData.sku}
              productName={formData.name}
              sellingPrice={formData.currentPrice ?? formData.price ?? formData.current_price ?? formData.salePrice ?? formData.sale_price}
              onBarcodeUpdate={onBarcodeUpdate}
              compact={true}
              hideInternalLabel={true} // I should add this prop
            />
          ) : (
            <div className="barcode-placeholder compact">
              <div className="barcode-hint-text">
                {t('wizard.step1.barcode_after_creation', 'Available after creation')}
              </div>
            </div>
          )}
        </div>

        {/* Brand */}
        <div className="form-group">
          <label htmlFor="brand">
            {t('wizard.step1.brand_label')}
          </label>
          <input
            id="brand"
            type="text"
            value={formData.brand}
            onChange={(e) => handleChange('brand', e.target.value.toUpperCase())}
            placeholder={t('wizard.step1.brand_placeholder', 'Enter brand')}
            maxLength={100}
            style={{ textTransform: 'uppercase' }}
          />
        </div>

        {/* Category - Hierarchical */}
        <div className="form-group">
          <label htmlFor="categoryId" className="required">
            {t('wizard.step1.category_label')}
          </label>
          <select
            id="categoryId"
            value={formData.categoryId || ''}
            onChange={(e) => handleChange('categoryId', parseInt(e.target.value))}
            className={errors.categoryId ? 'error' : ''}
          >
            <option value="">{t('wizard.step1.category_placeholder')}</option>
            {hierarchicalCategories.map(parent => (
              <optgroup key={parent.category_id} label={getLocalizedName(parent.category_name)}>
                <option value={parent.category_id}>
                  {getLocalizedName(parent.category_name)}
                </option>
                {parent.children.map(child => (
                  <option key={child.category_id} value={child.category_id}>
                    └─ {getLocalizedName(child.category_name)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {errors.categoryId && <span className="error-message">{errors.categoryId}</span>}
        </div>

        {/* Supplier */}
        <div className="form-group full-width">
          <label htmlFor="supplierId">
            {t('wizard.step1.supplier_label')}
          </label>
          <select
            id="supplierId"
            value={formData.supplierId || ''}
            onChange={(e) => {
              const value = e.target.value;
              handleChange('supplierId', value ? parseInt(value, 10) : null);
            }}
            className={errors.supplierId ? 'error' : ''}
          >
            <option value="">{t('wizard.step1.supplier_placeholder')}</option>
            {suppliers.map(supplier => (
              <option key={supplier.supplier_id} value={supplier.supplier_id}>
                {supplier.name} {supplier.address && `- ${supplier.address}`}
              </option>
            ))}
          </select>
          {errors.supplierId && <span className="error-message">{errors.supplierId}</span>}
        </div>
      </div>

      <div className="step-info-box">
        <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <path d="M12 16v-4M12 8h.01" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div><strong>{t('wizard.navigation.tip')}:</strong> {t('wizard.navigation.sku_tip')}</div>
      </div>

      <style>{`
        .barcode-placeholder {
          padding: 0.75rem;
          background: #f8f9fa;
          border: 1px solid #e1e4e8;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .barcode-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 13px;
          font-weight: 500;
          color: #24292e;
          min-width: 90px;
        }

        .barcode-label svg {
          color: #0366d6;
        }

        .barcode-hint-text {
          flex: 1;
          font-size: 12px;
          color: #666;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default Step1BasicInfo;