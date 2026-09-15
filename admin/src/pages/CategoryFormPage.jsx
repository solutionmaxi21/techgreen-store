import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { categoryApi } from '../services/apiService';
import { ChevronLeft } from 'lucide-react';
import BilingualInput from '../components/forms/BilingualInput';
import { normalizeImageUrl } from '../utils/imageUrl';
import '../styles/layout.css';
import '../styles/forms.css';
import './CategoriesListPage.css';

// Helper to get localized name from bilingual object or string
const getLocalizedName = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return value.fr || value.ar || '';
  return value;
};

export default function CategoryFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    category_name: { fr: '', ar: '' },
    parent_category_id: '',
    description: { fr: '', ar: '' },
    category_image: ''
  });

  const [categories, setCategories] = useState([]);
  const [parentCategory, setParentCategory] = useState(null);

  useEffect(() => {
    loadCategories();
    if (isEdit) {
      loadCategory();
    }
  }, [id]);

  const loadCategories = async () => {
    try {
      const data = await categoryApi.getAll();
      // Filter out current category to prevent self-parent
      const filtered = isEdit ? data.filter(cat => cat.category_id !== parseInt(id)) : data;
      setCategories(filtered);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadCategory = async () => {
    try {
      setLoading(true);
      const data = await categoryApi.getById(id);

      // Normalize bilingual fields - handle both legacy string and new object format
      const normalizeBilingual = (value) => {
        if (typeof value === 'object' && value !== null) {
          return { fr: value.fr || '', ar: value.ar || '' };
        }
        return { fr: value || '', ar: '' };
      };

      setFormData({
        category_name: normalizeBilingual(data.category_name),
        parent_category_id: data.parent_category_id || '',
        description: normalizeBilingual(data.description),
        category_image: normalizeImageUrl(data.category_image_url || data.category_image)
      });

      if (data.parent_category_id) {
        const parent = categories.find(cat => cat.category_id === data.parent_category_id);
        setParentCategory(parent);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Update parent category info
    if (name === 'parent_category_id') {
      const parent = categories.find(cat => cat.category_id === parseInt(value));
      setParentCategory(parent || null);
    }
  };

  // Handler for bilingual fields
  const handleBilingualChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const uploadData = await categoryApi.uploadImage(file);
      setFormData(prev => ({
        ...prev,
        category_image: normalizeImageUrl(uploadData.url || uploadData.relativePath)
      }));
    } catch (err) {
      console.error('Category image upload failed:', err);
      toast.error(err.message || t('common.error'));
    } finally {
      setSaving(false);
      // Allow selecting same file again
      e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      category_image: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate French name is required
    const frenchName = formData.category_name?.fr || '';
    if (!frenchName.trim()) {
      toast.error(t('categories.form.nameRequired'));
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        // Backend schema requires `name`, but older UI uses `category_name`
        name: formData.category_name,
        category_name: formData.category_name,
        parent_category_id: formData.parent_category_id ? parseInt(formData.parent_category_id) : null,
        description: formData.description,
        image: formData.category_image || undefined
      };

      if (isEdit) {
        await categoryApi.update(id, payload);
        toast.success(t('categories.form.updated'));
      } else {
        await categoryApi.create(payload);
        toast.success(t('categories.form.created'));
      }

      navigate('/categories');
    } catch (err) {
      setError(err.message || t('categories.form.saveFailed'));
      toast.error(err.message || t('categories.form.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/categories');
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">{t('categories.form.loading')}</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button onClick={() => navigate('/categories')} className="back-button" title={t('common.back')}>
            <ChevronLeft size={20} />
          </button>
          <div className="page-title-section">
            <h1 className="page-title">
              {isEdit ? t('categories.form.editTitle') : t('categories.form.newTitle')}
            </h1>
            <p className="page-subtitle">
              {isEdit ? t('categories.form.editSubtitle') : t('categories.form.newSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="error-alert">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h2 className="form-section-title">{t('categories.form.sectionTitle')}</h2>

          <div className="form-row">
            <div className="form-group">
              <BilingualInput
                id="category_name"
                label={t('categories.form.name')}
                value={formData.category_name}
                onChange={(value) => handleBilingualChange('category_name', value)}
                placeholder={t('categories.form.namePlaceholder')}
                required
              />
              <div className="input-hint">
                {t('categories.form.nameHint')}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('categories.form.parent')}</label>
              <select
                name="parent_category_id"
                value={formData.parent_category_id}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">{t('categories.form.parentNone')}</option>
                {categories.map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {'  '.repeat(cat.level - 1) + (cat.level > 1 ? '└─ ' : '')}
                    {getLocalizedName(cat.category_name)}
                  </option>
                ))}
              </select>
              <div className="input-hint">
                {t('categories.form.parentHint')}
              </div>
            </div>
          </div>

          <div className="form-row-full">
            <div className="form-group">
              <BilingualInput
                id="description"
                label={t('categories.form.description')}
                value={formData.description}
                onChange={(value) => handleBilingualChange('description', value)}
                type="textarea"
                rows={4}
                placeholder={t('categories.form.descriptionPlaceholder')}
              />
              <div className="input-hint">
                {t('categories.form.descriptionHint')}
              </div>
            </div>
          </div>

          {/* Category Image */}
          <div className="form-row-full">
            <div className="form-group">
              <label className="form-label">{t('categories.form.image') || 'Image'}</label>

              {formData.category_image ? (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <img
                    src={formData.category_image}
                        alt={t('categories.form.imageAlt')}
                    style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label className="btn btn-secondary" style={{ width: 'fit-content' }}>
                      {t('common.change') || 'Change'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        style={{ display: 'none' }}
                        disabled={saving}
                      />
                    </label>
                    <button type="button" className="btn btn-danger" onClick={handleRemoveImage} disabled={saving}>
                      {t('common.delete') || 'Remove'}
                    </button>
                  </div>
                </div>
              ) : (
                <label className="btn btn-secondary" style={{ width: 'fit-content' }}>
                  {t('common.upload') || 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                    disabled={saving}
                  />
                </label>
              )}

              <div className="input-hint">
                {t('categories.form.imageHint') || 'Upload an image for this category.'}
              </div>
            </div>
          </div>

          {/* Parent Category Info */}
          {parentCategory && (
            <div className="parent-info">
              <div className="parent-info-label">{t('categories.form.parentInfo')}</div>
              <div className="parent-info-value">
                {getLocalizedName(parentCategory.category_name)}
                {' '}
                <span style={{ color: '#6b7280', fontSize: '0.9em' }}>
                  ({t('categories.form.level', { level: parentCategory.level })})
                </span>
              </div>
            </div>
          )}

          {/* Category Hierarchy Preview */}
          {(parentCategory || formData.category_name) && (
            <div className="category-hierarchy">
              <div style={{ fontSize: '0.85em', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>
                {t('categories.form.pathPreview')}
              </div>
              <div className="category-path">
                {parentCategory && (
                  <>
                    <span className="category-path-item">{getLocalizedName(parentCategory.category_name)}</span>
                    <span className="category-path-separator">›</span>
                  </>
                )}
                <span className="category-path-item" style={{ fontWeight: 600 }}>
                  {getLocalizedName(formData.category_name) || t('categories.form.placeholderName')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? t('categories.form.saving') : (isEdit ? t('categories.form.update') : t('categories.form.create'))}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-secondary"
            disabled={saving}
          >
            {t('categories.form.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
