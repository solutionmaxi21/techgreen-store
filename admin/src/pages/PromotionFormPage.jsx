import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { promotionApi, metadataApi } from '../services/apiService';
import { getLocalizedText } from '../utils/localization';
import BilingualInput from '../components/forms/BilingualInput';
// Using shared styles from /styles folder
import '../styles/layout.css';
import '../styles/forms.css';

function PromotionFormPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id) && id !== 'new';

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [formData, setFormData] = useState({
    code: '',
    name: { fr: '', ar: '' },
    description: { fr: '', ar: '' },
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: '',
    applicableTo: 'all',
    applicableCategories: [],
    applicableCollections: [],
    startDate: '',
    endDate: '',
    maxUses: '',
    maxUsesPerUser: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadCategories();
    loadCollections();
  }, []);

  useEffect(() => {
    if (isEdit) {
      loadPromotion();
    }
  }, [id]);

  const loadCategories = async () => {
    try {
      const data = await metadataApi.getCategories();
      setCategories(data || []);
    } catch (error) {
      console.error('[Promotions] Failed to load categories:', error);
      toast.error(error.message || t('common.error'));
    }
  };

  const loadCollections = async () => {
    try {
      const data = await metadataApi.getCollections();
      setCollections(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[Promotions] Failed to load collections:', error);
      toast.error(error.message || t('common.error'));
    }
  };

  const loadPromotion = async () => {
    try {
      const promotion = await promotionApi.getById(id);

      // Normalize bilingual name field
      const normalizeBilingual = (value) => {
        if (typeof value === 'object' && value !== null) {
          return { fr: value.fr || '', ar: value.ar || '' };
        }
        return { fr: value || '', ar: '' };
      };

      setFormData({
        code: promotion.code,
        name: normalizeBilingual(promotion.promotion_name || promotion.name),
        description: normalizeBilingual(promotion.description_raw || promotion.description),
        discountType: promotion.discountType,
        discountValue: promotion.discountValue.toString(),
        minOrderAmount: promotion.minOrderAmount ? promotion.minOrderAmount.toString() : '',
        applicableTo: promotion.applicableTo || 'all',
        applicableCategories: promotion.applicableCategories || [],
        applicableCollections: promotion.applicableCollections || [],
        startDate: promotion.startDate ? promotion.startDate.split('T')[0] : '',
        endDate: promotion.endDate ? promotion.endDate.split('T')[0] : '',
        maxUses: promotion.maxUses ? promotion.maxUses.toString() : '',
        maxUsesPerUser: promotion.maxUsesPerUser ? promotion.maxUsesPerUser.toString() : ''
      });
    } catch (error) {
      console.error('Failed to load promotion:', error);
      toast.error(t('common.error'));
      navigate('/promotions');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCategoryToggle = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      applicableCategories: prev.applicableCategories.includes(categoryId)
        ? prev.applicableCategories.filter(id => id !== categoryId)
        : [...prev.applicableCategories, categoryId]
    }));
  };

  const handleCollectionToggle = (collectionId) => {
    setFormData(prev => ({
      ...prev,
      applicableCollections: prev.applicableCollections.includes(collectionId)
        ? prev.applicableCollections.filter(id => id !== collectionId)
        : [...prev.applicableCollections, collectionId]
    }));
  };

  // Handler for bilingual fields
  const handleBilingualChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.code.trim()) {
      newErrors.code = t('promotions.form.validation.codeReq');
    } else if (formData.code.length < 3) {
      newErrors.code = t('promotions.form.validation.codeShort');
    }

    // Validate French name is required
    const frenchName = formData.name?.fr || '';
    if (!frenchName.trim()) {
      newErrors.name = t('promotions.form.validation.nameReq');
    }

    if (!formData.discountValue || parseFloat(formData.discountValue) <= 0) {
      newErrors.discountValue = t('promotions.form.validation.valueReq');
    }

    if (formData.discountType === 'percentage' && parseFloat(formData.discountValue) > 100) {
      newErrors.discountValue = t('promotions.form.validation.percentageLimit');
    }

    if (!formData.startDate) {
      newErrors.startDate = t('promotions.form.validation.startDateReq');
    }

    if (!formData.endDate) {
      newErrors.endDate = t('promotions.form.validation.endDateReq');
    }

    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      newErrors.endDate = t('promotions.form.validation.dates');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const data = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        description: formData.description,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : 0,
        applicableTo: formData.applicableTo,
        applicableCategories: formData.applicableCategories.length > 0 ? formData.applicableCategories : null,
        applicableCollections: formData.applicableCollections.length > 0 ? formData.applicableCollections : null,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate + 'T23:59:59').toISOString(),
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
        maxUsesPerUser: formData.maxUsesPerUser ? parseInt(formData.maxUsesPerUser) : null
      };

      if (isEdit) {
        await promotionApi.update(id, data);
      } else {
        await promotionApi.create(data);
      }

      navigate('/promotions');
    } catch (error) {
      console.error('Failed to save promotion:', error);
      toast.error(error.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="product-form-page">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-left">
          <button onClick={() => navigate('/promotions')} className="back-button" title={t('common.back')}>
            <ChevronLeft size={20} />
          </button>
          <div className="page-title-section">
            <h1 className="page-title">{isEdit ? t('promotions.form.edit') : t('promotions.form.new')}</h1>
            <p className="page-subtitle">
              {t('promotions.form.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-section">
          <h2>{t('promotions.form.basicInfo')}</h2>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="code">{t('promotions.form.code')} *</label>
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                className={errors.code ? 'error' : ''}
                placeholder={t('promotions.form.placeholders.code')}
                disabled={isEdit}
                maxLength={20}
              />
              {errors.code && <span className="error-message">{errors.code}</span>}
              <small>{t('promotions.form.hints.code')}</small>
            </div>

            <div className="form-group">
              <BilingualInput
                id="name"
                label={`${t('promotions.form.name')} *`}
                value={formData.name}
                onChange={(value) => handleBilingualChange('name', value)}
                placeholder={t('promotions.form.placeholders.name')}
                error={errors.name}
                required
              />
            </div>

            <div className="form-group full-width">
              <BilingualInput
                id="description"
                label={t('promotions.form.description')}
                value={formData.description}
                onChange={(value) => handleBilingualChange('description', value)}
                placeholder={t('promotions.form.placeholders.description')}
                type="textarea"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>{t('promotions.form.discountDetails')}</h2>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="discountType">{t('promotions.form.type')} *</label>
              <select
                id="discountType"
                name="discountType"
                value={formData.discountType}
                onChange={handleChange}
              >
                <option value="percentage">{t('promotions.filters.percentage')}</option>
                <option value="fixed">{t('promotions.filters.fixed')}</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="discountValue">
                {t('promotions.form.value')} * {formData.discountType === 'percentage' ? '(%)' : '(DZD)'}
              </label>
              <input
                type="number"
                id="discountValue"
                name="discountValue"
                value={formData.discountValue}
                onChange={handleChange}
                className={errors.discountValue ? 'error' : ''}
                placeholder={formData.discountType === 'percentage' ? '10' : '10000'}
                step={formData.discountType === 'percentage' ? '0.01' : '1'}
                min="0"
                max={formData.discountType === 'percentage' ? '100' : undefined}
              />
              {errors.discountValue && <span className="error-message">{errors.discountValue}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="minOrderAmount">{t('promotions.form.minAmount')}</label>
              <input
                type="number"
                id="minOrderAmount"
                name="minOrderAmount"
                value={formData.minOrderAmount}
                onChange={handleChange}
                placeholder="0"
                step="1"
                min="0"
              />
              <small>{t('promotions.form.hints.noMinimum')}</small>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>{t('promotions.form.validity')}</h2>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="startDate">{t('promotions.form.startDate')} *</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={errors.startDate ? 'error' : ''}
              />
              {errors.startDate && <span className="error-message">{errors.startDate}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="endDate">{t('promotions.form.endDate')} *</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className={errors.endDate ? 'error' : ''}
              />
              {errors.endDate && <span className="error-message">{errors.endDate}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>{t('promotions.form.limits')}</h2>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="maxUses">{t('promotions.form.maxUsage')}</label>
              <input
                type="number"
                id="maxUses"
                name="maxUses"
                value={formData.maxUses}
                onChange={handleChange}
                placeholder={t('common.na')}
                min="1"
              />
              <small>{t('promotions.form.hints.maxUsage')}</small>
            </div>

            <div className="form-group">
              <label htmlFor="maxUsesPerUser">{t('promotions.form.perCustomer')}</label>
              <input
                type="number"
                id="maxUsesPerUser"
                name="maxUsesPerUser"
                value={formData.maxUsesPerUser}
                onChange={handleChange}
                placeholder={t('common.na')}
                min="1"
              />
              <small>{t('promotions.form.hints.perCustomer')}</small>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>{t('promotions.form.categories')}</h2>
          <p className="section-description">
            {t('promotions.form.hints.categories')}
          </p>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="applicableTo">{t('promotions.form.scopes.label')}</label>
            <select
              id="applicableTo"
              name="applicableTo"
              value={formData.applicableTo}
              onChange={handleChange}
            >
              <option value="all">{t('promotions.form.scopes.all')}</option>
              <option value="categories">{t('promotions.form.scopes.categories')}</option>
              <option value="collections">{t('promotions.form.scopes.collections')}</option>
            </select>
          </div>

          {formData.applicableTo === 'categories' && (
            <div className="category-checkboxes">
              {categories.map(category => (
                <label key={category.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.applicableCategories.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                  />
                  <span>{getLocalizedText(category.name)}</span>
                </label>
              ))}
            </div>
          )}

          {formData.applicableTo === 'collections' && (
            <div className="category-checkboxes">
              {collections.map(collection => {
                const collectionId = collection.collection_id || collection.id;
                return (
                  <label key={collectionId} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.applicableCollections.includes(collectionId)}
                      onChange={() => handleCollectionToggle(collectionId)}
                    />
                    <span>{getLocalizedText(collection.collection_name)}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="form-actions" style={{ flexDirection: i18n.dir() === 'rtl' ? 'row-reverse' : 'row' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/promotions')}
            disabled={saving}
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? t('common.processing') : (isEdit ? t('promotions.form.edit') : t('promotions.form.new'))}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PromotionFormPage;
