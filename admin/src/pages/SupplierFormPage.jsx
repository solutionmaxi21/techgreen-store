import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ChevronLeft } from 'lucide-react';
import { supplierApi } from '../services/apiService';
import '../styles/layout.css';
import '../styles/forms.css';
import './CategoriesListPage.css';

export default function SupplierFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: ''
  });

  useEffect(() => {
    if (isEdit) {
      loadSupplier();
    }
  }, [id]);

  const loadSupplier = async () => {
    try {
      setLoading(true);
      const data = await supplierApi.getById(id);
      setFormData({
        name: data.name || '',
        contact_email: data.contact_email || '',
        contact_phone: data.contact_phone || '',
        address: data.address || ''
      });
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.name.trim()) {
      setError(t('suppliers.form.nameRequired') || 'Supplier name is required');
      return;
    }

    if (!formData.contact_email || !formData.contact_email.trim()) {
      setError(t('suppliers.form.emailRequired') || 'Email is required');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contact_email.trim())) {
      setError(t('suppliers.form.errorEmail') || 'Please enter a valid email address');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: formData.name.trim(),
        contact_email: formData.contact_email.trim(),
        contact_phone: formData.contact_phone && formData.contact_phone.trim() ? formData.contact_phone.trim() : null,
        address: formData.address && formData.address.trim() ? formData.address.trim() : null
      };

      if (isEdit) {
        await supplierApi.update(id, payload);
        toast.success(t('suppliers.form.updated'));
      } else {
        await supplierApi.create(payload);
        toast.success(t('suppliers.form.created'));
      }

      navigate('/suppliers');
    } catch (err) {
      const errMsg = err.message || t('common.unknown_error');
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/suppliers');
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">{t('suppliers.list.loading')}</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <button
            className="back-button"
            onClick={() => navigate('/suppliers')}
            title={t('suppliers.form.backToSuppliers') || 'Back to Suppliers'}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="page-title-section">
            <h1 className="page-title">
              {isEdit ? t('suppliers.form.editTitle') : t('suppliers.form.newTitle')}
            </h1>
            <p className="page-subtitle">
              {isEdit ? t('suppliers.form.editSubtitle') : t('suppliers.form.newSubtitle')}
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
          <h2 className="form-section-title">{t('suppliers.form.sectionTitle')}</h2>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">{t('suppliers.form.name')}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder={t('suppliers.form.namePlaceholder')}
                required
              />
              <div className="input-hint">
                {t('suppliers.form.nameHint')}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">{t('suppliers.form.email')}</label>
              <input
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                className="input-field"
                placeholder={t('suppliers.form.emailPlaceholder')}
                required
              />
              <div className="input-hint">
                {t('suppliers.form.emailHint')}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{t('suppliers.form.phone')}</label>
              <input
                type="tel"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                className="input-field"
                placeholder={t('suppliers.form.phonePlaceholder')}
              />
              <div className="input-hint">
                {t('suppliers.form.phoneHint')}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('suppliers.form.address')}</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="input-field"
                placeholder={t('suppliers.form.addressPlaceholder')}
              />
              <div className="input-hint">
                {t('suppliers.form.addressHint')}
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions" style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: '1rem' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? t('suppliers.form.saving') : (isEdit ? t('suppliers.form.update') : t('suppliers.form.create'))}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-secondary"
            disabled={saving}
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
