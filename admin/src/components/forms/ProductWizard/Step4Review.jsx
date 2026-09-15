import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './Step4Review.css';
import { metadataApi } from '../../../services/apiService';
import { normalizeImageUrl } from '../../../utils/imageUrl';

import { getLocalizedText } from '../../../utils/localization';

// Helper to get localized name from bilingual object or string
const getLocalizedName = (value) => getLocalizedText(value);

const toSafeInt = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumVariantStock = (variants = []) => {
  return variants.reduce((total, variant) => total + toSafeInt(variant?.stock ?? variant?.totalStock ?? variant?.total_stock), 0);
};

/**
 * Step 4: Review & Submit
 * Display comprehensive summary of all entered data with edit options
 */
const Step4Review = ({ formData, onEdit }) => {
  const { t, i18n } = useTranslation();
  const [metadata, setMetadata] = useState({
    categories: [],
    suppliers: [],
    warehouses: []
  });

  useEffect(() => {
    loadReviewData();
  }, []);

  const loadReviewData = async () => {
    try {
      const [categoriesData, suppliersData, warehousesData] = await Promise.all([
        metadataApi.getCategories(),
        metadataApi.getSuppliers(),
        metadataApi.getWarehouses()
      ]);

      setMetadata({
        categories: categoriesData,
        suppliers: suppliersData,
        warehouses: warehousesData
      });
    } catch (error) {
      console.error('Error loading review data:', error);
    }
  };

  // Helper functions to get names from IDs
  const getCategoryName = (id) => {
    const category = metadata.categories.find(c => c.category_id === id);
    return category?.category_name ? getLocalizedName(category.category_name) : t('common.unknown');
  };

  const getSupplierName = (id) => {
    const supplier = metadata.suppliers.find(s => s.supplier_id === id);
    return supplier?.supplier_name || t('common.unknown');
  };

  const getWarehouseName = (id) => {
    const warehouse = metadata.warehouses.find(w => w.warehouse_id === id);
    return warehouse?.warehouse_name || t('common.unknown');
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === '') return '—';
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-DZ' : 'fr-DZ', {
      style: 'currency',
      currency: 'DZD'
    }).format(price);
  };

  const calculateLandedCost = () => (parseFloat(formData.costPrice) || 0) + (parseFloat(formData.productFees) || 0);

  const calculateProfitMargin = () => {
    const cost = parseFloat(formData.costPrice) || 0;
    const current = parseFloat(formData.currentPrice) || 0;
    const landedCost = calculateLandedCost();
    if (landedCost === 0 || current === 0) return 0;
    return (((current - landedCost) / landedCost) * 100).toFixed(2);
  };

  const hasVariants = formData.hasVariants && Array.isArray(formData.variants) && formData.variants.length > 0;
  const reviewStock = hasVariants ? sumVariantStock(formData.variants) : toSafeInt(formData.stock);

  return (
    <div className="wizard-step step4-review">
      <div className="step-title">
        <h2>{t('wizard.review.title')}</h2>
        <p>{t('wizard.review.subtitle')}</p>
      </div>

      {/* Basic Information Section */}
      <div className="review-section">
        <div className="section-header">
          <h3>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('wizard.review.sections.basic')}
          </h3>
          <button className="btn-edit" onClick={() => onEdit(1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('wizard.review.edit')}
          </button>
        </div>
        <dl className="review-list">
          <div className="review-item">
            <dt>{t('wizard.review.labels.name')}:</dt>
            <dd className="highlight">{getLocalizedName(formData.name) || '—'}</dd>
          </div>
          <div className="review-item">
            <dt>{t('wizard.review.labels.sku')}:</dt>
            <dd><code className="sku-badge">{formData.sku || '—'}</code></dd>
          </div>
          <div className="review-item">
            <dt>{t('wizard.review.labels.brand')}:</dt>
            <dd>{formData.brand || '—'}</dd>
          </div>
          <div className="review-item">
            <dt>{t('wizard.review.labels.model')}:</dt>
            <dd>{formData.modelNumber || '—'}</dd>
          </div>
          <div className="review-item">
            <dt>{t('wizard.review.labels.category')}:</dt>
            <dd>{formData.categoryId ? getCategoryName(formData.categoryId) : '—'}</dd>
          </div>
          <div className="review-item">
            <dt>{t('wizard.review.labels.supplier')}:</dt>
            <dd>{formData.supplierId ? getSupplierName(formData.supplierId) : '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Pricing & Inventory Section */}
      <div className="review-section">
        <div className="section-header">
          <h3>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('wizard.review.sections.pricing')}
          </h3>
          <button className="btn-edit" onClick={() => onEdit(2)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('wizard.review.edit')}
          </button>
        </div>

        <div className="pricing-summary">
          <div className="price-card cost">
            <div className="price-label">{t('wizard.review.labels.cost')}</div>
            <div className="price-value">{formatPrice(formData.costPrice)}</div>
          </div>
          <div className="price-card cost">
            <div className="price-label">{t('products.detail.productFees')}</div>
            <div className="price-value">{formatPrice(formData.productFees || 0)}</div>
          </div>
          <div className="price-card current">
            <div className="price-label">{t('products.detail.totalCost')}</div>
            <div className="price-value">{formatPrice(calculateLandedCost())}</div>
          </div>
          {formData.wholesalePrice && (
            <div className="price-card wholesale">
              <div className="price-label">{t('products.detail.wholesalePrice')}</div>
              <div className="price-value">{formatPrice(formData.wholesalePrice)}</div>
            </div>
          )}
          <div className="price-card current">
            <div className="price-label">{t('wizard.review.labels.current')}</div>
            <div className="price-value">{formatPrice(formData.currentPrice)}</div>
          </div>
          {formData.salePrice && (
            <div className="price-card sale">
              <div className="price-label">{t('wizard.review.labels.sale')}</div>
              <div className="price-value">{formatPrice(formData.salePrice)}</div>
            </div>
          )}
          <div className="price-card profit">
            <div className="price-label">{t('wizard.review.labels.margin')}</div>
            <div className="price-value">{calculateProfitMargin()}%</div>
          </div>
        </div>

        <dl className="review-list">
          <div className="review-item">
            <dt>{t('wizard.review.labels.warehouse')}:</dt>
            <dd>{formData.warehouseId ? getWarehouseName(formData.warehouseId) : '—'}</dd>
          </div>
          <div className="review-item">
            <dt>{t('wizard.review.labels.stock')}:</dt>
            <dd>
              <span className={`stock-badge ${reviewStock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                {reviewStock} {t('wizard.review.stats.stock')}
              </span>
            </dd>
          </div>
          <div className="review-item">
            <dt>{t('wizard.review.labels.reorder')}:</dt>
            <dd>{formData.reorderLevel || 0} {t('wizard.review.stats.stock')}</dd>
          </div>
          <div className="review-item">
            <dt>{t('products.detail.productFees')}:</dt>
            <dd>{formatPrice(formData.productFees || 0)}</dd>
          </div>
          <div className="review-item">
            <dt>{t('wizard.review.labels.weight')}:</dt>
            <dd>{formData.weight ? `${formData.weight} kg` : '—'}</dd>
          </div>
          <div className="review-item">
            <dt>{t('wizard.review.labels.warranty')}:</dt>
            <dd>{formData.warrantyMonths ? `${formData.warrantyMonths} ${t('products.months')}` : '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Details & Media Section */}
      <div className="review-section">
        <div className="section-header">
          <h3>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('wizard.review.sections.details')}
          </h3>
          <button className="btn-edit" onClick={() => onEdit(3)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('wizard.review.edit')}
          </button>
        </div>

        {/* Images Preview */}
        {formData.images && formData.images.length > 0 && (
          <div className="review-subsection">
            <h4>{t('wizard.review.sections.images')} ({formData.images.length})</h4>
            <div className="review-image-gallery">
              {formData.images.map((image, index) => (
                <div key={index} className="review-image-card">
                  <img src={normalizeImageUrl(image.url)} alt={image.altText || t('wizard.review.labels.name')} />
                  {index === 0 && <span className="primary-badge">{t('wizard.step3.images_primary')}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Descriptions */}
        <div className="review-subsection">
          <h4>{t('wizard.review.sections.desc')}</h4>
          {formData.shortDescription && (
            <div className="description-preview">
              <strong>{t('wizard.review.labels.short_desc')}:</strong>
              <p>{getLocalizedName(formData.shortDescription)}</p>
            </div>
          )}
          {formData.fullDescription && (
            <div className="description-preview">
              <strong>{t('wizard.review.labels.full_desc')}:</strong>
              <p className="full-desc">{getLocalizedName(formData.fullDescription)}</p>
            </div>
          )}
          {!formData.shortDescription && !formData.fullDescription && (
            <p className="empty-note">{t('wizard.review.values.no_desc')}</p>
          )}
        </div>

        {/* Specifications */}
        {formData.attributes && formData.attributes.length > 0 && (
          <div className="review-subsection">
            <h4>{t('wizard.review.sections.specs')} ({formData.attributes.length})</h4>
            <dl className="specs-list">
              {formData.attributes.map((attr, index) => (
                <div key={index} className="spec-item">
                  <dt>{getLocalizedName(attr.name)}:</dt>
                  <dd>{attr.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Tags */}
        {formData.tags && formData.tags.length > 0 && (
          <div className="review-subsection">
            <h4>{t('wizard.review.sections.tags')} ({formData.tags.length})</h4>
            <div className="review-tags">
              {formData.tags.map((tag, index) => (
                <span key={index} className="review-tag">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* SEO Metadata */}
        {(formData.metaTitle || formData.metaDescription) && (
          <div className="review-subsection">
            <h4>{t('wizard.review.sections.seo')}</h4>
            <dl className="review-list">
              {formData.metaTitle && (
                <div className="review-item">
                  <dt>{t('wizard.review.labels.meta_title')}:</dt>
                  <dd>{formData.metaTitle}</dd>
                </div>
              )}
              {formData.metaDescription && (
                <div className="review-item">
                  <dt>{t('wizard.review.labels.meta_desc')}:</dt>
                  <dd>{formData.metaDescription}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Product Settings */}
        <div className="review-subsection">
          <h4>{t('wizard.review.sections.settings')}</h4>
          <div className="settings-badges">
            <span className={`status-badge ${formData.isActive ? 'active' : 'inactive'}`}>
              {formData.isActive ? `✓ ${t('wizard.review.labels.active')}` : `✕ ${t('wizard.review.labels.inactive')}`}
            </span>
            {formData.featured && (
              <span className="status-badge featured">
                ★ {t('wizard.review.labels.featured')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Variants Section */}
      {formData.hasVariants && formData.variants && formData.variants.length > 0 && (
        <div className="review-section">
          <div className="section-header">
            <h3>
              <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('wizard.review.sections.variants', 'Product Variants')}
            </h3>
            <button className="btn-edit" onClick={() => onEdit(2)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('wizard.review.edit')}
            </button>
          </div>

          <div className="variants-review-grid">
            {formData.variants.map((variant, index) => (
              <div key={variant.id || index} className={`variant-review-card ${variant.is_default ? 'is-default' : ''}`}>
                <div className="variant-review-header">
                  <span className="variant-review-badge">#{index + 1}</span>
                  <span className="variant-review-name">{variant.variant_name || '—'}</span>
                  {variant.is_default && (
                    <span className="variant-review-default">★ {t('common.default', 'Default')}</span>
                  )}
                </div>
                <dl className="variant-review-details">
                  {variant.sku && (
                    <div className="variant-review-item">
                      <dt>SKU</dt>
                      <dd><code>{variant.sku}</code></dd>
                    </div>
                  )}
                  <div className="variant-review-item">
                    <dt>{t('wizard.review.labels.current', 'Price')}</dt>
                    <dd>{variant.current_price ? formatPrice(variant.current_price) : '—'}</dd>
                  </div>
                  {variant.stock !== undefined && variant.stock !== '' && (
                    <div className="variant-review-item">
                      <dt>{t('wizard.review.labels.stock', 'Stock')}</dt>
                      <dd>{variant.stock}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="review-stats">
        <div className="stat-card">
          <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="stat-value">{formData.images?.length || 0}</div>
          <div className="stat-label">{t('wizard.review.stats.images')}</div>
        </div>
        <div className="stat-card">
          <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="stat-value">{formData.attributes?.length || 0}</div>
          <div className="stat-label">{t('wizard.review.stats.specs')}</div>
        </div>
        <div className="stat-card">
          <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="stat-value">{formData.tags?.length || 0}</div>
          <div className="stat-label">{t('wizard.review.stats.tags')}</div>
        </div>
        <div className="stat-card">
          <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="stat-value">{reviewStock}</div>
          <div className="stat-label">{t('wizard.review.stats.stock')}</div>
        </div>
      </div>

      <div className="submit-notice">
        <svg className="notice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p>
          <strong>{t('wizard.review.notice.title')}</strong>
          {t('wizard.review.notice.message')}
        </p>
      </div>
    </div>
  );
};

export default Step4Review;
