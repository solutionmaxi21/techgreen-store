import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import useConfirmation from '../hooks/useConfirmation';
import { Mail, Phone, MapPin, Package, ChevronLeft, Edit2, Trash2 } from 'lucide-react';
import { supplierApi, productApi } from '../services/apiService';
import { getLocalizedText } from '../utils/localization';
import { normalizeImageUrl } from '../utils/imageUrl';
import Can from '../components/Can';
import ResourceError from '../components/ResourceError';
import { useAuthorization } from '../contexts/AuthorizationContext';
import './SupplierDetailPage.css';

const SupplierDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { can } = useAuthorization();
  const canReadProducts = can('products.read');

  const [supplier, setSupplier] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { confirm, ConfirmationDialog } = useConfirmation();

  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productsError, setProductsError] = useState(null);

  // Helper function to safely render text that might be localized objects
  const renderText = useCallback((value, fallback = '') => {
    if (!value) return fallback;
    if (typeof value === 'object' && value !== null) {
      return getLocalizedText(value, i18n.language);
    }
    return String(value);
  }, [i18n.language]);

  const loadSupplierAndProducts = useCallback(async () => {
    let supplierLoaded = false;

    try {
      setIsLoading(true);
      setProductsLoading(true);
      setError(null);
      setProductsError(null);

      const supplierData = await supplierApi.getById(id);
      setSupplier(supplierData);
      supplierLoaded = true;
    } catch (err) {
      console.error('[SupplierDetail] Error loading supplier:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }

    if (!supplierLoaded || !canReadProducts) {
      setProductsLoading(false);
      return;
    }

    try {
      const supplierId = parseInt(id, 10);
      const productsResponse = await productApi.getAll({
        supplier_id: supplierId,
        limit: 1000,
        includeInactive: true
      });
      const productsArray = productsResponse?.products || productsResponse?.data || productsResponse;
      setProducts(Array.isArray(productsArray) ? productsArray : []);
    } catch (err) {
      console.error('[SupplierDetail] Error loading products:', err);
      setProductsError(err);
    } finally {
      setProductsLoading(false);
    }
  }, [canReadProducts, id]);

  useEffect(() => {
    if (id) {
      loadSupplierAndProducts();
    }
  }, [id, loadSupplierAndProducts]);

  const handleEdit = useCallback(() => {
    navigate(`/suppliers/edit/${id}`);
  }, [navigate, id]);

  const handleDelete = useCallback(async () => {
    if (!await confirm({
      title: t('suppliers.detail.delete'),
      message: t('suppliers.list.confirmDelete'),
      confirmText: t('common.delete'),
      isDangerous: true
    })) {
      return;
    }

    try {
      await supplierApi.delete(id);
      toast.success(t('suppliers.detail.deleted'));
      navigate('/suppliers');
    } catch (err) {
      toast.error(err.message || t('common.error'));
    }
  }, [id, t, navigate]);

  const formatPrice = useCallback((price) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-DZ' : 'fr-DZ', {
      style: 'currency',
      currency: 'DZD'
    }).format(price);
  }, [i18n.language]);

  // Memoize supplier name for performance
  const supplierName = useMemo(() => {
    const name = supplier?.name || supplier?.supplier_name || '';
    // Handle localized objects
    if (typeof name === 'object' && name !== null) {
      return getLocalizedText(name, i18n.language);
    }
    return String(name);
  }, [supplier, i18n.language]);

  if (isLoading) {
    return (
      <div className="supplier-detail-page">
        <div className="loading-state">{t('common.loading')}</div>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="supplier-detail-page">
        <button
          className="back-button"
          onClick={() => navigate('/suppliers')}
          title={t('common.back')}
          style={{ marginBottom: '20px' }}
        >
          <ChevronLeft size={20} />
        </button>
        <ResourceError error={error} onRetry={loadSupplierAndProducts} />
      </div>
    );
  }

  return (
    <div className="supplier-detail-page">
      {/* Back Button */}
      <button
        className="back-button"
        onClick={() => navigate('/suppliers')}
        title={t('common.back')}
      >
        <ChevronLeft size={20} />
      </button>

      {/* Header Section */}
      <div className="detail-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1 className="supplier-name">{supplierName}</h1>
            <p className="supplier-subtitle">{t('suppliers.list.title')}</p>
          </div>
          <div className="header-actions">
            <Can permission="suppliers.update">
              <button
                className="btn btn-primary btn-with-icon"
                onClick={handleEdit}
              >
                <Edit2 size={18} />
                {t('common.edit')}
              </button>
            </Can>
            <Can permission="suppliers.delete">
              <button
                className="btn btn-danger btn-with-icon"
                onClick={handleDelete}
              >
                <Trash2 size={18} />
                {t('common.delete')}
              </button>
            </Can>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="detail-content">
        {/* Supplier Information Card */}
        <div className="info-card">
          <h2 className="card-title">{t('suppliers.detail.information')}</h2>
          <div className="info-grid">
            {/* Email */}
            <div className="info-item">
              <div className="info-icon">
                <Mail size={20} />
              </div>
              <div className="info-content">
                <p className="info-label">{t('suppliers.form.email')}</p>
                <p className="info-value">
                  {supplier.contact_email ? (
                    <a href={`mailto:${String(supplier.contact_email)}`} className="info-link">
                      {String(supplier.contact_email)}
                    </a>
                  ) : (
                    '-'
                  )}
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="info-item">
              <div className="info-icon">
                <Phone size={20} />
              </div>
              <div className="info-content">
                <p className="info-label">{t('suppliers.form.phone')}</p>
                <p className="info-value">
                  {supplier.contact_phone ? (
                    <a href={`tel:${String(supplier.contact_phone)}`} className="info-link">
                      {String(supplier.contact_phone)}
                    </a>
                  ) : (
                    '-'
                  )}
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="info-item full-width">
              <div className="info-icon">
                <MapPin size={20} />
              </div>
              <div className="info-content">
                <p className="info-label">{t('suppliers.form.address')}</p>
                <p className="info-value">{renderText(supplier.address, '-')}</p>
              </div>
            </div>

            {canReadProducts && (
              <div className="info-item">
                <div className="info-icon">
                  <Package size={20} />
                </div>
                <div className="info-content">
                  <p className="info-label">{t('suppliers.detail.productCount')}</p>
                  <p className="info-value product-count-badge">{products.length}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Products Section */}
        {canReadProducts && <div className="products-section">
          <div className="section-header">
            <h2 className="section-title">
              <Package size={22} />
              {t('suppliers.detail.productsTitle')}
            </h2>
            <span className="product-count-label">{products.length} {t('suppliers.detail.products')}</span>
          </div>

          {productsError ? (
            <ResourceError error={productsError} onRetry={loadSupplierAndProducts} />
          ) : productsLoading ? (
            <div className="loading-state">{t('common.loading')}</div>
          ) : products.length > 0 ? (
            <div className="products-grid">
              {products.map((product) => {
                const productImageUrl = normalizeImageUrl(
                  product.images?.[0]?.image_url
                    || product.images?.[0]
                    || product.image
                    || product.image_url
                );
                return (
                <div
                  key={product.id || product.product_id}
                  className="product-card"
                  onClick={() => navigate(`/products/${product.id || product.product_id}`)}
                >
                  {/* Product Image */}
                  <div className="product-image-wrapper">
                    {productImageUrl ? (
                      <img
                        src={productImageUrl}
                        alt={getLocalizedText(product.name || product.product_name || product.productName, i18n.language)}
                        className="product-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="product-image-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8m-4-4h8"/></svg></div>';
                        }}
                      />
                    ) : (
                      <div className="product-image-placeholder">
                        <Package size={40} />
                      </div>
                    )}
                    {(product.stock !== undefined || product.total_stock !== undefined || product.totalStock !== undefined) && (
                      <div className={`stock-badge ${(product.stock || product.total_stock || product.totalStock || 0) > 0 ? 'in-stock' : 'out-of-stock'}`}>
                        {(product.stock || product.total_stock || product.totalStock || 0) > 0
                          ? `${product.stock || product.total_stock || product.totalStock} ${t('products.detail.inStock')}`
                          : t('products.detail.outOfStock')}
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="product-info">
                    <h3 className="product-name">
                      {getLocalizedText(product.name || product.product_name || product.productName, i18n.language)}
                    </h3>
                    {product.sku && (
                      <p className="product-sku">SKU: {product.sku}</p>
                    )}
                    {(product.price || product.current_price || product.currentPrice) && (
                      <p className="product-price">
                        {formatPrice(product.price || product.current_price || product.currentPrice)}
                      </p>
                    )}
                    {(product.category || product.category_name || product.categoryName) && (
                      <p className="product-category">
                        {renderText(product.category || product.category_name || product.categoryName)}
                      </p>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <Package size={48} />
              <p>{t('suppliers.detail.noProducts')}</p>
            </div>
          )}
        </div>}
      </div>
      {/* Confirmation Modal */}
      <ConfirmationDialog />
    </div>
  );
};

export default SupplierDetailPage;
