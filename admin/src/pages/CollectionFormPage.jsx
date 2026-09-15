import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Upload, Search, Trash2, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { collectionApi, productApi } from '../services/apiService';
import { normalizeImageUrl, getPrimaryProductImageUrl } from '../utils/imageUrl';
import BilingualInput from '../components/forms/BilingualInput';
import '../styles/layout.css';
import '../styles/forms.css';
import './CollectionFormPage.css';

const getLocalizedName = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return value.fr || value.ar || '';
  return value;
};

const handleImageError = (e) => {
  e.target.onerror = null;
  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
};

const PRESET_GRADIENTS = [
  { class: 'from-blue-500 to-cyan-500', label: 'Ocean' },
  { class: 'from-purple-500 to-pink-500', label: 'Berry' },
  { class: 'from-orange-400 to-rose-500', label: 'Sunset' },
  { class: 'from-emerald-400 to-teal-500', label: 'Forest' },
  { class: 'from-indigo-500 to-blue-600', label: 'Midnight' },
  { class: 'from-amber-400 to-orange-500', label: 'Gold' },
  { class: 'from-rose-400 to-red-500', label: 'Crimson' },
  { class: 'from-slate-700 to-slate-900', label: 'Graphite' },
];

export default function CollectionFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState({
    banner_image: false,
    thumbnail_image: false,
  });
  const [dragOver, setDragOver] = useState({
    banner_image: false,
    thumbnail_image: false,
  });
  const [allCollections, setAllCollections] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [benefitsLang, setBenefitsLang] = useState('fr');

  // Track dirty state for unsaved changes guard
  const isDirty = useRef(false);

  const [formData, setFormData] = useState({
    collection_name: { fr: '', ar: '' },
    description: { fr: '', ar: '' },
    tagline: { fr: '', ar: '' },
    parent_collection_id: '',
    gradient: 'from-blue-500 to-cyan-500',
    banner_image: '',
    thumbnail_image: '',
    benefits: { fr: [], ar: [] },
    sort_order: 0,
    is_active: true,
    meta_title: '',
    meta_description: '',
  });

  // Guard against navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [id]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const collectionsResult = await collectionApi.getAll({});
      const collections = Array.isArray(collectionsResult) ? collectionsResult : [];
      setAllCollections(isEdit ? collections.filter((c) => (c.collection_id || c.id) !== parseInt(id, 10)) : collections);

      // Fetch all products across pages (handles backend pagination clamping to 100 items per request)
      let currentPage = 1;
      let loadedProducts = [];
      let totalCount = 0;

      do {
        const productsResult = await productApi.getAll({ page: currentPage, limit: 100 });
        const productRows = Array.isArray(productsResult)
          ? productsResult
          : (Array.isArray(productsResult?.products) ? productsResult.products : []);
        
        loadedProducts = [...loadedProducts, ...productRows];
        totalCount = productsResult?.total || 0;

        if (!productsResult?.total || productRows.length === 0) {
          break;
        }
        currentPage++;
      } while (loadedProducts.length < totalCount);

      setAllProducts(loadedProducts);

      if (isEdit) {
        const [collection, assigned] = await Promise.all([
          collectionApi.getById(id),
          collectionApi.getProducts(id),
        ]);

        let benefitsVal = { fr: [], ar: [] };
        if (collection.benefits) {
          if (Array.isArray(collection.benefits)) {
            // Legacy format or single language array fallback
            benefitsVal.fr = collection.benefits;
          } else if (typeof collection.benefits === 'object') {
            benefitsVal = {
              fr: collection.benefits.fr || [],
              ar: collection.benefits.ar || [],
            };
          }
        }

        setFormData({
          collection_name: typeof collection.collection_name === 'object' ? collection.collection_name : { fr: collection.collection_name || '', ar: '' },
          description: typeof collection.description === 'object' ? collection.description : { fr: collection.description || '', ar: '' },
          tagline: typeof collection.tagline === 'object' ? collection.tagline : { fr: collection.tagline || '', ar: '' },
          parent_collection_id: collection.parent_collection_id || '',
          gradient: collection.gradient || 'from-blue-500 to-cyan-500',
          banner_image: normalizeImageUrl(collection.banner_image),
          thumbnail_image: normalizeImageUrl(collection.thumbnail_image),
          benefits: benefitsVal,
          sort_order: collection.sort_order || 0,
          is_active: collection.is_active !== false,
          meta_title: collection.meta_title || '',
          meta_description: collection.meta_description || '',
        });

        setSelectedProductIds((assigned?.products || []).map((p) => p.id || p.product_id));
      }
    } catch (error) {
      toast.error(error.message || t('collections.form.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return allProducts;
    const q = productSearch.toLowerCase();
    return allProducts.filter((p) => {
      const name = getLocalizedName(p.product_name).toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();
      return name.includes(q) || sku.includes(q) || brand.includes(q);
    });
  }, [allProducts, productSearch]);

  const selectedProductsList = useMemo(() => {
    return allProducts.filter(p => selectedProductIds.includes(p.id || p.product_id));
  }, [allProducts, selectedProductIds]);

  const updateFormData = (updater) => {
    setFormData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      isDirty.current = true;
      return next;
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    updateFormData({
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleBilingualChange = (fieldName, value) => {
    updateFormData({ [fieldName]: value });
  };

  // Benefits handlers
  const handleAddBenefit = () => {
    updateFormData((prev) => ({
      ...prev,
      benefits: {
        ...prev.benefits,
        [benefitsLang]: [...(prev.benefits[benefitsLang] || []), '']
      }
    }));
  };

  const handleUpdateBenefit = (index, value) => {
    updateFormData((prev) => {
      const newArray = [...(prev.benefits[benefitsLang] || [])];
      newArray[index] = value;
      return {
        ...prev,
        benefits: {
          ...prev.benefits,
          [benefitsLang]: newArray
        }
      };
    });
  };

  const handleRemoveBenefit = (index) => {
    updateFormData((prev) => {
      const newArray = [...(prev.benefits[benefitsLang] || [])];
      newArray.splice(index, 1);
      return {
        ...prev,
        benefits: {
          ...prev.benefits,
          [benefitsLang]: newArray
        }
      };
    });
  };

  // File Upload Handlers
  const uploadFile = async (file, targetField) => {
    try {
      setImageUploading((prev) => ({ ...prev, [targetField]: true }));
      const uploadData = await collectionApi.uploadImage(file);
      updateFormData({
        [targetField]: normalizeImageUrl(uploadData.url || uploadData.relativePath),
      });
      toast.success(t('collections.form.uploadSuccess') || 'Image téléchargée avec succès');
    } catch (error) {
      toast.error(error.message || t('common.error'));
    } finally {
      setImageUploading((prev) => ({ ...prev, [targetField]: false }));
    }
  };

  const handleImageUpload = async (e, targetField) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file, targetField);
    e.target.value = '';
  };

  const handleRemoveImage = (targetField) => {
    updateFormData({ [targetField]: '' });
  };

  const handleDragOver = (e, targetField) => {
    e.preventDefault();
    setDragOver((prev) => ({ ...prev, [targetField]: true }));
  };

  const handleDragLeave = (e, targetField) => {
    e.preventDefault();
    setDragOver((prev) => ({ ...prev, [targetField]: false }));
  };

  const handleDrop = async (e, targetField) => {
    e.preventDefault();
    setDragOver((prev) => ({ ...prev, [targetField]: false }));

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('collections.form.imageOnly') || 'Seuls les fichiers d\'image sont autorisés');
      return;
    }

    await uploadFile(file, targetField);
  };

  // Product selection actions
  const toggleProduct = (productId) => {
    isDirty.current = true;
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((idValue) => idValue !== productId)
        : [...prev, productId]
    );
  };

  const selectAllFiltered = () => {
    isDirty.current = true;
    const filteredIds = filteredProducts.map(p => p.id || p.product_id);
    setSelectedProductIds(prev => {
      const merged = new Set([...prev, ...filteredIds]);
      return Array.from(merged);
    });
  };

  const clearAllSelected = () => {
    isDirty.current = true;
    setSelectedProductIds([]);
  };

  const getSeoCounterStatus = (length, max, optimalMin) => {
    if (length === 0) return 'empty';
    if (length < optimalMin) return 'warning';
    if (length > max) return 'error';
    return 'optimal';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.collection_name.fr?.trim()) {
      toast.error(t('collections.form.nameRequired'));
      return;
    }

    try {
      setSaving(true);

      // Clean up benefits array (remove empty strings)
      const cleanBenefits = {
        fr: formData.benefits.fr.filter(b => b && b.trim() !== ''),
        ar: formData.benefits.ar.filter(b => b && b.trim() !== ''),
      };

      const payload = {
        name: formData.collection_name,
        collection_name: formData.collection_name,
        description: formData.description,
        tagline: formData.tagline,
        parent_collection_id: formData.parent_collection_id ? parseInt(formData.parent_collection_id, 10) : null,
        gradient: formData.gradient,
        bannerImage: formData.banner_image,
        thumbnailImage: formData.thumbnail_image,
        benefits: cleanBenefits,
        sortOrder: parseInt(formData.sort_order, 10) || 0,
        isActive: !!formData.is_active,
        metaTitle: formData.meta_title,
        metaDescription: formData.meta_description,
      };

      const savedCollection = isEdit
        ? await collectionApi.update(id, payload)
        : await collectionApi.create(payload);

      const collectionId = savedCollection.collection_id || savedCollection.id || parseInt(id, 10);

      const existingAssigned = isEdit
        ? (await collectionApi.getProducts(collectionId)).products || []
        : [];
      const existingIds = existingAssigned.map((product) => product.id || product.product_id);

      const toAdd = selectedProductIds.filter((productId) => !existingIds.includes(productId));
      const toRemove = existingIds.filter((productId) => !selectedProductIds.includes(productId));

      if (toAdd.length > 0) {
        await collectionApi.addProducts(collectionId, toAdd);
      }

      if (toRemove.length > 0) {
        await collectionApi.removeProducts(collectionId, toRemove);
      }

      isDirty.current = false;
      toast.success(isEdit ? t('collections.form.updated') : t('collections.form.created'));
      navigate('/collections');
    } catch (error) {
      toast.error(error.message || t('collections.form.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty.current) {
      if (window.confirm(t('collections.form.unsavedChangesMessage') || 'You have unsaved changes. Are you sure you want to leave?')) {
        isDirty.current = false;
        navigate('/collections');
      }
    } else {
      navigate('/collections');
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading') || 'Loading...'}</div>;
  }

  const metaTitleLength = formData.meta_title?.length || 0;
  const metaDescLength = formData.meta_description?.length || 0;
  const metaTitleStatus = getSeoCounterStatus(metaTitleLength, 70, 30);
  const metaDescStatus = getSeoCounterStatus(metaDescLength, 160, 100);

  return (
    <div className="page-container collection-form-container">
      <div className="collection-header">
        <button onClick={handleCancel} className="back-button" title={t('common.back')} style={{ marginBottom: '16px' }}>
          <ChevronLeft size={20} />
          <span>{t('common.back') || 'Retour'}</span>
        </button>
        <div className="collection-header-title">
          <div className="title-icon">
            <ShieldCheck size={28} className="text-primary" />
          </div>
          <h1>{isEdit ? t('collections.form.editTitle') : t('collections.form.newTitle')}</h1>
        </div>
        <p className="collection-header-subtitle">{t('collections.form.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="collection-grid">
          
          {/* LEFT COLUMN */}
          <div className="collection-main-column">
            
            {/* Section 1: General Info */}
            <section className="bento-card">
              <div className="bento-card-header">
                <h2 className="bento-card-title">{t('collections.form.sectionTitle')}</h2>
              </div>
              <div className="bento-card-content">
                
                <div className="form-group">
                  <BilingualInput
                    id="collection_name"
                    label={t('collections.form.name')}
                    value={formData.collection_name}
                    onChange={(value) => handleBilingualChange('collection_name', value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <BilingualInput
                    id="tagline"
                    label={t('collections.form.tagline')}
                    value={formData.tagline}
                    onChange={(value) => handleBilingualChange('tagline', value)}
                  />
                </div>

                <div className="form-group">
                  <BilingualInput
                    id="description"
                    label={t('collections.form.description')}
                    value={formData.description}
                    onChange={(value) => handleBilingualChange('description', value)}
                    type="textarea"
                    rows={4}
                  />
                </div>

              </div>
            </section>

            {/* Section 3: Benefits & Products */}
            <section className="bento-card">
              <div className="bento-card-header">
                <h2 className="bento-card-title">{t('collections.form.productsTitle') || 'Produits & Avantages'}</h2>
              </div>
              <div className="bento-card-content">
                
                {/* Benefits List Editor */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label">{t('collections.form.benefitsTitle') || 'Avantages'}</label>
                    <div className="bilingual-tabs">
                      <button
                        type="button"
                        className={`bilingual-tab ${benefitsLang === 'fr' ? 'active' : ''}`}
                        onClick={() => setBenefitsLang('fr')}
                      >
                        Français
                      </button>
                      <button
                        type="button"
                        className={`bilingual-tab ${benefitsLang === 'ar' ? 'active' : ''}`}
                        onClick={() => setBenefitsLang('ar')}
                      >
                        العربية
                      </button>
                    </div>
                  </div>
                  
                  <div className="benefits-list">
                    {(formData.benefits[benefitsLang] || []).map((benefit, index) => (
                      <div key={`benefit-${benefitsLang}-${index}`} className="benefit-item">
                        <input
                          type="text"
                          value={benefit}
                          onChange={(e) => handleUpdateBenefit(index, e.target.value)}
                          placeholder={t('collections.form.benefitPlaceholder') || 'Ex: Livraison gratuite...'}
                          className="input-field benefit-input"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveBenefit(index)}
                          className="benefit-remove-btn"
                          title={t('collections.form.removeBenefit') || 'Remove'}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={handleAddBenefit} className="add-benefit-btn">
                      + {t('collections.form.addBenefit') || 'Ajouter un avantage'}
                    </button>
                  </div>
                </div>

                <hr style={{ borderTop: '1px solid var(--bento-border-color)', margin: '16px 0' }} />

                {/* Dual Panel Product Picker */}
                <div className="form-group">
                  <label className="form-label">{t('collections.form.productsTitle')} ({selectedProductIds.length})</label>
                  
                  <div className="product-picker-container">
                    <div className="product-picker-toolbar">
                      <div className="product-search-input-wrapper">
                        <Search size={18} />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder={t('collections.form.searchProductsPlaceholder') || 'Rechercher par nom ou SKU...'}
                          className="product-search-input"
                        />
                      </div>
                    </div>
                    
                    <div className="product-picker-panels">
                      {/* Left Panel: Available Products */}
                      <div className="product-list-panel">
                        <div className="panel-header">
                          <span>{t('collections.form.productsTitle')} ({filteredProducts.length})</span>
                          {filteredProducts.length > 0 && (
                            <button type="button" onClick={selectAllFiltered} className="text-primary" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                              {t('collections.form.selectAll') || 'Tout sélectionner'}
                            </button>
                          )}
                        </div>
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map(product => {
                            const pId = product.id || product.product_id;
                            const isSelected = selectedProductIds.includes(pId);
                            return (
                              <div 
                                key={pId} 
                                className="product-picker-item" 
                                onClick={() => toggleProduct(pId)}
                              >
                                <img src={getPrimaryProductImageUrl(product)} alt="" className="product-item-thumb" onError={handleImageError} />
                                <div className="product-item-info">
                                  <div className="product-item-name">{getLocalizedName(product.product_name)}</div>
                                  <div className="product-item-sku">{product.sku}</div>
                                </div>
                                <div className="product-item-action">
                                  {isSelected ? <Check size={20} className="text-primary" /> : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--bento-border-color)' }}></div>}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="empty-panel-state">
                            <Search size={32} />
                            <p>{t('collections.form.noProducts')}</p>
                          </div>
                        )}
                      </div>

                      {/* Right Panel: Selected Products */}
                      <div className="selected-products-panel">
                        <div className="panel-header">
                          <span>{t('collections.form.selectedProducts') || 'Sélectionnés'} ({selectedProductsList.length})</span>
                          {selectedProductsList.length > 0 && (
                            <button type="button" onClick={clearAllSelected} className="clear-all-btn">
                              {t('collections.form.clearAll') || 'Tout effacer'}
                            </button>
                          )}
                        </div>
                        {selectedProductsList.length > 0 ? (
                          selectedProductsList.map(product => {
                            const pId = product.id || product.product_id;
                            return (
                              <div key={`selected-${pId}`} className="product-picker-item">
                                <img src={getPrimaryProductImageUrl(product)} alt="" className="product-item-thumb" onError={handleImageError} />
                                <div className="product-item-info">
                                  <div className="product-item-name">{getLocalizedName(product.product_name)}</div>
                                  <div className="product-item-price">{product.retail_price} DZD</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleProduct(pId);
                                  }}
                                  className="product-item-remove"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="empty-panel-state">
                            <AlertCircle size={32} />
                            <p>{t('collections.form.noProductsSelected') || 'Aucun produit sélectionné'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div className="collection-sidebar-column">
            
            {/* Section 2: Visual Assets */}
            <section className="bento-card">
              <div className="bento-card-header">
                <h2 className="bento-card-title">{t('collections.form.visualAssetsTitle') || 'Assets Visuels'}</h2>
              </div>
              <div className="bento-card-content">
                
                {/* Banner Upload */}
                <div className="form-group">
                  <label className="form-label">{t('collections.form.bannerImage')}</label>
                  <div style={{ width: '100%', aspectRatio: '3/1', position: 'relative' }}>
                    {formData.banner_image ? (
                      <div className="image-preview-wrapper" style={{ width: '100%', height: '100%' }}>
                        <img src={formData.banner_image} alt={t('collections.form.bannerAlt')} />
                        <button
                          type="button"
                          className="image-preview-remove"
                          onClick={() => handleRemoveImage('banner_image')}
                          title={t('common.delete') || 'Remove'}
                          disabled={imageUploading.banner_image}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`image-upload-zone ${dragOver.banner_image ? 'drag-over' : ''}`}
                        style={{ width: '100%', height: '100%' }}
                        onDragOver={(e) => handleDragOver(e, 'banner_image')}
                        onDragLeave={(e) => handleDragLeave(e, 'banner_image')}
                        onDrop={(e) => handleDrop(e, 'banner_image')}
                        onClick={() => document.getElementById('file-input-banner_image').click()}
                      >
                        <Upload className="file-upload-icon" size={24} />
                        <span className="file-upload-text">
                          <strong>{t('collections.form.upload')}</strong>
                        </span>
                      </div>
                    )}
                    {imageUploading.banner_image && (
                      <div className="image-upload-spinner-overlay">
                        <div className="image-upload-spinner"></div>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    id="file-input-banner_image"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'banner_image')}
                    style={{ display: 'none' }}
                    disabled={imageUploading.banner_image}
                  />
                  <div className="form-hint">{t('collections.form.bannerHint') || 'Image paysage (3:1). 1200×400px WebP'}</div>
                </div>

                {/* Thumbnail Upload */}
                <div className="form-group">
                  <label className="form-label">{t('collections.form.thumbnailImage')}</label>
                  <div style={{ width: '100%', aspectRatio: '1/1', maxWidth: '200px', position: 'relative' }}>
                    {formData.thumbnail_image ? (
                      <div className="image-preview-wrapper" style={{ width: '100%', height: '100%' }}>
                        <img src={formData.thumbnail_image} alt={t('collections.form.thumbnailAlt')} />
                        <button
                          type="button"
                          className="image-preview-remove"
                          onClick={() => handleRemoveImage('thumbnail_image')}
                          title={t('common.delete') || 'Remove'}
                          disabled={imageUploading.thumbnail_image}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`image-upload-zone ${dragOver.thumbnail_image ? 'drag-over' : ''}`}
                        style={{ width: '100%', height: '100%' }}
                        onDragOver={(e) => handleDragOver(e, 'thumbnail_image')}
                        onDragLeave={(e) => handleDragLeave(e, 'thumbnail_image')}
                        onDrop={(e) => handleDrop(e, 'thumbnail_image')}
                        onClick={() => document.getElementById('file-input-thumbnail_image').click()}
                      >
                        <Upload className="file-upload-icon" size={24} />
                        <span className="file-upload-text">
                          <strong>{t('collections.form.upload')}</strong>
                        </span>
                      </div>
                    )}
                    {imageUploading.thumbnail_image && (
                      <div className="image-upload-spinner-overlay">
                        <div className="image-upload-spinner"></div>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    id="file-input-thumbnail_image"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'thumbnail_image')}
                    style={{ display: 'none' }}
                    disabled={imageUploading.thumbnail_image}
                  />
                  <div className="form-hint">{t('collections.form.thumbnailHint') || 'Image carrée (1:1). 600×600px WebP'}</div>
                </div>

                {/* Gradient Picker */}
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">{t('collections.form.gradientTitle') || 'Dégradé de secours'}</label>
                  <div className="form-hint" style={{ marginBottom: '8px' }}>
                    {t('collections.form.gradientHint') || 'Couleur affichée lorsqu\'aucune image n\'est disponible'}
                  </div>
                  <div className="gradient-picker-grid">
                    <div 
                      className={`gradient-swatch none ${!formData.gradient ? 'active' : ''}`}
                      onClick={() => updateFormData({ gradient: '' })}
                      title={t('collections.form.noGradient') || 'None'}
                    >
                      X
                    </div>
                    {PRESET_GRADIENTS.map((preset) => (
                      <div
                        key={preset.class}
                        className={`gradient-swatch bg-gradient-to-br ${preset.class} ${formData.gradient === preset.class ? 'active' : ''}`}
                        onClick={() => updateFormData({ gradient: preset.class })}
                        title={t(`collections.form.gradients.${preset.label.toLowerCase()}`)}
                      />
                    ))}
                  </div>
                </div>

              </div>
            </section>

            {/* Section 4: Configuration & SEO */}
            <section className="bento-card">
              <div className="bento-card-header">
                <h2 className="bento-card-title">{t('collections.form.seoTitle') || 'Configuration & SEO'}</h2>
              </div>
              <div className="bento-card-content">
                
                {/* Status Toggle */}
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: '8px' }}>{t('common.status') || 'Statut'}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      className={`switch-toggle ${formData.is_active ? 'active' : ''}`}
                      onClick={() => updateFormData({ is_active: !formData.is_active })}
                      style={{ position: 'relative', flexShrink: 0 }}
                    />
                    <span className="switch-label" style={{ fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>
                      {formData.is_active ? (t('collections.form.statusActive') || 'Active') : (t('collections.form.statusInactive') || 'Inactive')}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('collections.form.parent')}</label>
                  <select
                    name="parent_collection_id"
                    value={formData.parent_collection_id}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">{t('collections.form.parentNone')}</option>
                    {allCollections.map((collection) => (
                      <option key={collection.collection_id || collection.id} value={collection.collection_id || collection.id}>
                        {getLocalizedName(collection.collection_name)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('collections.form.sortOrder')}</label>
                  <input type="number" name="sort_order" value={formData.sort_order} onChange={handleChange} className="input-field" min="0" />
                </div>

                <hr style={{ borderTop: '1px solid var(--bento-border-color)', margin: '8px 0' }} />

                <div className="form-group">
                  <label className="form-label">{t('collections.form.metaTitle')}</label>
                  <input 
                    name="meta_title" 
                    value={formData.meta_title} 
                    onChange={handleChange} 
                    className="input-field" 
                    maxLength={70} 
                    placeholder={t('collections.form.metaTitleHint') || 'Titre SEO'}
                  />
                  <div className="seo-counter-wrapper">
                    <div className="seo-counter-bar">
                      <div 
                        className={`seo-counter-fill ${metaTitleStatus}`} 
                        style={{ width: `${Math.min(100, (metaTitleLength / 70) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="seo-counter-text">{metaTitleLength} / 70</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('collections.form.metaDescription')}</label>
                  <textarea 
                    name="meta_description" 
                    value={formData.meta_description} 
                    onChange={handleChange} 
                    className="input-field" 
                    rows="3" 
                    maxLength={160} 
                    placeholder={t('collections.form.metaDescHint') || 'Description SEO'}
                  />
                  <div className="seo-counter-wrapper">
                    <div className="seo-counter-bar">
                      <div 
                        className={`seo-counter-fill ${metaDescStatus}`} 
                        style={{ width: `${Math.min(100, (metaDescLength / 160) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="seo-counter-text">{metaDescLength} / 160</span>
                  </div>
                </div>

              </div>
            </section>
          </div>
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="sticky-action-bar">
          <button 
            type="button" 
            onClick={handleCancel} 
            className="btn btn-secondary"
          >
            {t('common.cancel') || 'Annuler'}
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={saving || loading}
          >
            {saving ? (t('collections.form.saving') || 'Enregistrement...') : (t('collections.form.save') || 'Enregistrer')}
          </button>
        </div>
      </form>
    </div>
  );
}
