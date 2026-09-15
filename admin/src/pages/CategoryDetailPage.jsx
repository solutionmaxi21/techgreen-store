import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import useConfirmation from '../hooks/useConfirmation';
import {
  Edit, Trash2, ChevronLeft, Package
} from 'lucide-react';
import { categoryApi, productApi } from '../services/apiService';
import { getLocalizedText } from '../utils/localization';
import { getPrimaryProductImageUrl, normalizeImageUrl } from '../utils/imageUrl';
import Can from '../components/Can';
import ResourceError from '../components/ResourceError';
import { useAuthorization } from '../contexts/AuthorizationContext';
import './CategoryDetailPage.css';

const CategoryDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { can } = useAuthorization();
  const canReadProducts = can('products.read');
  const [category, setCategory] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parentCategory, setParentCategory] = useState(null);
  const [subCategories, setSubCategories] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [relatedError, setRelatedError] = useState(null);
  const { confirm, ConfirmationDialog } = useConfirmation();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setRelatedError(null);
      const categoryData = await categoryApi.getById(id);
      setCategory(categoryData);

      if (canReadProducts) {
        try {
          const categoryId = parseInt(id, 10);
          const products = await productApi.getAll({
            category_id: categoryId,
            limit: 1000
          });
          const productsArray = products?.products || products?.data || products;
          setRelatedProducts(Array.isArray(productsArray) ? productsArray : []);
        } catch (err) {
          console.error('Error loading products:', err);
          setRelatedError(err);
        }
      }

      // Load parent category if exists
      if (categoryData.parent_category_id) {
        try {
          const parent = await categoryApi.getById(categoryData.parent_category_id);
          setParentCategory(parent);
        } catch (err) {
          console.error('Error loading parent category:', err);
        }
      }

      // Load all categories to find subcategories
      try {
        const allCategories = await categoryApi.getAll({});
        const subs = allCategories.filter(cat => cat.parent_category_id === parseInt(id));
        setSubCategories(subs);
      } catch (err) {
        console.error('Error loading subcategories:', err);
      }
    } catch (error) {
      console.error('Failed to load category:', error);
      setLoadError(error);
      toast.error(t('common.error') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/categories/edit/${id}`);
  };

  const handleDelete = async () => {
    if (await confirm({
      title: t('categories.delete'),
      message: t('categories.list.confirmDelete'),
      confirmText: t('common.delete'),
      isDangerous: true
    })) {
      try {
        await categoryApi.delete(id);
        toast.success(t('categories.list.deleted'));
        navigate('/categories');
      } catch (error) {
        console.error('Failed to delete category:', error);
        const errorMessage = error?.message || t('common.error');
        toast.error(errorMessage);
      }
    }
  };

  const getLocalizedName = (value) => {
    if (typeof value === 'object' && value !== null) {
      return getLocalizedText(value, i18n.language);
    }
    return value || '';
  };

  const getLocalizedDescription = (value) => {
    if (typeof value === 'object' && value !== null) {
      return getLocalizedText(value, i18n.language);
    }
    return value || '';
  };

  if (loading) {
    return (
      <div className="category-details-page">
        <div className="loading-state">{t('common.loading')}</div>
      </div>
    );
  }
  if (loadError) {
    return <ResourceError error={loadError} onRetry={loadData} />;
  }

  if (!category) {
    return (
      <div className="category-details-page">
        <button className="back-button" onClick={() => navigate('/categories')} title={t('common.back')}>
          <ChevronLeft size={20} />
        </button>
        <div className="error-state">{t('common.unknown_error')}</div>
      </div>
    );
  }

  const categoryImageUrl = normalizeImageUrl(category.image_url || category.imageUrl || category.image);

  return (
    <div className="category-details-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/categories')} title={t('common.back')}>
            <ChevronLeft size={20} />
          </button>
          <div className="header-info">
            <h1 className="page-title">{getLocalizedName(category.category_name)}</h1>
            <p className="page-subtitle">{category.category_slug}</p>
          </div>
        </div>
        <div className="header-actions">
          <Can permission="categories.update">
            <button onClick={handleEdit} className="btn btn-primary">
              <Edit size={18} /> {t('common.edit')}
            </button>
          </Can>
          <Can permission="categories.delete">
            <button
              onClick={handleDelete}
              className="btn btn-danger"
              disabled={(canReadProducts && relatedProducts.length > 0) || subCategories.length > 0}
              title={(canReadProducts && relatedProducts.length > 0) || subCategories.length > 0 ? t('categories.list.cannotDelete') : ''}
            >
              <Trash2 size={18} /> {t('common.delete')}
            </button>
          </Can>
        </div>
      </div>

      {/* Main Content */}
      <div className="detail-content">
        {/* Left Sidebar - Category Info */}
        <div className="detail-sidebar">
          {categoryImageUrl && (
            <div className="category-image">
              <img src={categoryImageUrl} alt={getLocalizedName(category.category_name)} />
            </div>
          )}

          <div className="info-card">
            <div className="info-row">
              <label>{t('categories.list.columns.level')}</label>
              <span className="badge">{category.level || 0}</span>
            </div>
            {canReadProducts && (
              <div className="info-row">
                <label>{t('categories.list.columns.products')}</label>
                <span>{relatedProducts.length}</span>
              </div>
            )}
            {subCategories.length > 0 && (
              <div className="info-row">
                <label>{t('categories.list.columns.subcategories')}</label>
                <span>{subCategories.length}</span>
              </div>
            )}
            {parentCategory && (
              <div className="info-row">
                <label>{t('categories.list.columns.parent')}</label>
                <button
                  className="btn-link"
                  onClick={() => navigate(`/categories/${parentCategory.category_id}`)}
                >
                  {getLocalizedName(parentCategory.category_name)}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Content - Details & Products */}
        <div className="detail-main">
          {/* Description Section */}
          {getLocalizedDescription(category.category_description) && (
            <div className="section">
              <h3>{t('common.description')}</h3>
              <p className="description">{getLocalizedDescription(category.category_description)}</p>
            </div>
          )}

          {/* Details Section */}
          <div className="section">
            <h3>{t('common.details')}</h3>
            <div className="details-grid">
              <div className="detail-item">
                <label>{t('categories.list.columns.slug')}</label>
                <code>{category.category_slug}</code>
              </div>
              <div className="detail-item">
                <label>{t('categories.list.columns.level')}</label>
                <span>{category.level || 0}</span>
              </div>
              {canReadProducts && (
                <div className="detail-item">
                  <label>{t('categories.list.columns.products')}</label>
                  <span>{relatedProducts.length}</span>
                </div>
              )}
              {subCategories.length > 0 && (
                <div className="detail-item">
                  <label>{t('categories.list.columns.subcategories')}</label>
                  <span>{subCategories.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Subcategories Section */}
          {subCategories.length > 0 && (
            <div className="section">
              <h3>{t('categories.list.columns.subcategories')} ({subCategories.length})</h3>
              <div className="subcategories-grid">
                {subCategories.map(subCat => {
                  const subCategoryImageUrl = normalizeImageUrl(subCat.image_url || subCat.imageUrl || subCat.image);
                  return (
                  <div
                    key={subCat.category_id}
                    className="subcat-card"
                    onClick={() => navigate(`/categories/${subCat.category_id}`)}
                  >
                    {subCategoryImageUrl && (
                      <div className="subcat-image">
                        <img src={subCategoryImageUrl} alt={getLocalizedName(subCat.category_name)} />
                      </div>
                    )}
                    <div className="subcat-info">
                      <h4>{getLocalizedName(subCat.category_name)}</h4>
                      <p className="slug">{subCat.category_slug}</p>
                      <span className="product-count">
                        {subCat.product_count || 0} {t('products.list.title')}
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Products Section */}
          {canReadProducts && relatedError && <ResourceError error={relatedError} onRetry={loadData} />}
          {canReadProducts && relatedProducts.length > 0 && !relatedError && (
            <div className="section">
              <h3>
                <Package size={18} /> {t('products.list.title')} ({relatedProducts.length})
              </h3>
              <div className="products-grid">
                {relatedProducts.map(product => {
                  const productImageUrl = getPrimaryProductImageUrl(product);
                  return (
                  <div
                    key={product.product_id || product.id}
                    className="product-card"
                    onClick={() => navigate(`/products/${product.product_id || product.id}`)}
                  >
                    {productImageUrl && (
                      <div className="product-image">
                        <img
                          src={productImageUrl}
                          alt={getLocalizedName(product.product_name)}
                        />
                      </div>
                    )}
                    <div className="product-info">
                      <h4>{getLocalizedName(product.product_name)}</h4>
                      <p className="sku">{product.sku}</p>
                      <div className="product-footer">
                        <span className="price">
                          {new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-DZ' : 'fr-DZ', {
                            style: 'currency',
                            currency: 'DZD'
                          }).format(product.current_price || product.price || 0)}
                        </span>
                        <span className={`stock ${(product.total_stock || product.stock || 0) > 0 ? 'in-stock' : 'out-of-stock'}`}>
                          {product.total_stock || product.stock || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationDialog />
    </div>
  );
};

export default CategoryDetailPage;
