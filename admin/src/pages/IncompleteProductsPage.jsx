import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Edit, CheckCircle, AlertCircle, Package, Image, FileText, DollarSign } from 'lucide-react';
import { productApi } from '../services/apiService';
import Can from '../components/Can';
import ResourceError from '../components/ResourceError';
import './IncompleteProductsPage.css';

// Helper to extract string from bilingual object or return as-is
const getLocalizedValue = (value, locale = 'fr') => {
  if (!value) return 'N/A';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && (value.fr || value.ar)) {
    return value[locale] || value.fr || value.ar || 'N/A';
  }
  return String(value);
};

function IncompleteProductsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language === 'ar' ? 'ar' : 'fr';

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ total: 0, incomplete: 0 });
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    loadIncompleteProducts();
  }, []);

  const loadIncompleteProducts = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Fetch products where is_active = false (incomplete)
      const response = await productApi.getAll({
        is_active: false,
        page: 1,
        limit: 100
      });

      const productsArray = Array.isArray(response) ? response : (response.products || []);
      setProducts(productsArray);
      setStats({
        total: response.total || productsArray.length,
        incomplete: productsArray.length
      });
    } catch (error) {
      console.error('Failed to load incomplete products:', error);
      setLoadError(error);
      toast.error(t('incompleteProducts.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletion = (product) => {
    const fields = {
      sku: 10,
      name: 10,
      category_id: 10,
      current_price: 15,
      description: 20,
      short_description: 10,
      images: 15,
      supplier_id: 5,
      cost_price: 5
    };

    let completed = 0;
    let total = 0;

    Object.entries(fields).forEach(([field, weight]) => {
      total += weight;
      const value = product[field] || product[field.replace(/_/g, '')];

      if (field === 'images') {
        if (value && (Array.isArray(value) ? value.length > 0 : value)) {
          completed += weight;
        }
      } else if (field === 'current_price') {
        if (value && parseFloat(value) > 0) {
          completed += weight;
        }
      } else {
        if (value) {
          completed += weight;
        }
      }
    });

    return Math.round((completed / total) * 100);
  };

  const getMissingFields = (product) => {
    const missing = [];

    if (!product.current_price || parseFloat(product.current_price) === 0) {
      missing.push({ key: 'price', label: t('incompleteProducts.price'), icon: DollarSign });
    }
    if (!product.description) {
      missing.push({ key: 'description', label: t('incompleteProducts.description'), icon: FileText });
    }
    if (!product.short_description) {
      missing.push({ key: 'short_description', label: t('incompleteProducts.shortDescription'), icon: FileText });
    }
    if (!product.images || (Array.isArray(product.images) && product.images.length === 0)) {
      missing.push({ key: 'images', label: t('incompleteProducts.images'), icon: Image });
    }
    if (!product.supplier_id && !product.supplierId) {
      missing.push({ key: 'supplier', label: t('incompleteProducts.supplier'), icon: Package });
    }
    if (!product.cost_price && !product.costPrice) {
      missing.push({ key: 'cost_price', label: t('incompleteProducts.costPrice'), icon: DollarSign });
    }

    return missing;
  };

  const markAsComplete = async (productId) => {
    try {
      await productApi.update(productId, {
        isActive: true
      });

      toast.success(t('incompleteProducts.markedComplete'));
      loadIncompleteProducts();
    } catch (error) {
      console.error('Failed to mark product as complete:', error);
      toast.error(t('incompleteProducts.failedUpdate'));
    }
  };

  if (loading) {
    return <div className="loading-page">{t('common.loading')}...</div>;
  }
  if (loadError) {
    return <ResourceError error={loadError} onRetry={loadIncompleteProducts} />;
  }

  return (
    <div className="incomplete-products-page">
      <div className="page-header">
        <div className="header-content">
          <AlertCircle className="page-icon" size={32} />
          <div>
            <h1>{t('incompleteProducts.title')}</h1>
            <p className="page-description">
              {t('incompleteProducts.subtitle')}
            </p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-badge">
            {stats.incomplete} {t('incompleteProducts.incomplete')}
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={64} className="empty-icon" />
          <h2>{t('incompleteProducts.allComplete')}</h2>
          <p>{t('incompleteProducts.noIncomplete')}</p>
          <Can permission="products.bulk_receive">
            <button
              onClick={() => navigate('/products/quick-receive')}
              className="btn btn-primary"
            >
              {t('incompleteProducts.receiveNewProducts')}
            </button>
          </Can>
        </div>
      ) : (
        <div className="products-grid">
          {products.map(product => {
            const completion = calculateCompletion(product);
            const missingFields = getMissingFields(product);

            return (
              <div key={product.id} className="product-card">
                <div className="card-header">
                  <div className="product-info">
                    <h3 className="product-name">
                      {product.name || product.product_name}
                    </h3>
                    <p className="product-sku">SKU: {product.sku}</p>
                  </div>
                  <div className="completion-badge" data-level={completion >= 70 ? 'high' : completion >= 40 ? 'medium' : 'low'}>
                    {completion}%
                  </div>
                </div>

                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${completion}%` }}
                    data-level={completion >= 70 ? 'high' : completion >= 40 ? 'medium' : 'low'}
                  ></div>
                </div>

                <div className="missing-fields">
                  <h4>{t('incompleteProducts.missing')}:</h4>
                  {missingFields.length === 0 ? (
                    <p className="all-complete">{t('incompleteProducts.readyToActivate')}</p>
                  ) : (
                    <ul>
                      {missingFields.map(field => (
                        <li key={field.key}>
                          <field.icon size={16} />
                          {field.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="product-meta">
                  <span className="meta-item">
                    {t('incompleteProducts.category')}: {getLocalizedValue(product.category_name || product.categoryName, locale)}
                  </span>
                  <span className="meta-item">
                    {t('incompleteProducts.stock')}: {product.total_stock || product.stock || 0}
                  </span>
                </div>

                <div className="card-actions">
                  <Can permission="products.update">
                    <button
                      onClick={() => navigate(`/products/${product.id}/edit`)}
                      className="btn btn-secondary btn-full"
                    >
                      <Edit size={18} />
                      {t('incompleteProducts.completeDetails')}
                    </button>
                  </Can>
                  {missingFields.length === 0 && (
                    <Can permission="products.update">
                      <button
                        onClick={() => markAsComplete(product.id)}
                      className="btn btn-success btn-full"
                      >
                        <CheckCircle size={18} />
                        {t('incompleteProducts.markAsComplete')}
                      </button>
                    </Can>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default IncompleteProductsPage;
