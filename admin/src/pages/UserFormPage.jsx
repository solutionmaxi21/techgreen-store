import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Lock, Shield, CheckCircle, ChevronLeft } from 'lucide-react';
import { userApi } from '../services/apiService';
import '../styles/layout.css';
import '../styles/forms.css';
import './UserFormPage.css';

export default function UserFormPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        role: 'customer',
        status: 'active'
    });

    useEffect(() => {
        if (isEdit) {
            loadUser();
        }
    }, [id]);

    const loadUser = async () => {
        try {
            setLoading(true);
            const response = await userApi.getById(id);
            const data = response.data || response;
            setFormData({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || '',
                phone: data.phone || '',
                password: '', // Don't load password
                role: data.role || 'customer',
                status: data.is_active === false ? 'inactive' : 'active'
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

        // Basic Validation
        if (!formData.firstName.trim()) { toast.error(t('users.form.validation.firstName')); return; }
        if (!formData.lastName.trim()) { toast.error(t('users.form.validation.lastName')); return; }
        if (!formData.email.trim()) { toast.error(t('users.form.validation.email')); return; }
        if (!isEdit && formData.password.length < 8) { toast.error(t('users.form.validation.password')); return; }

        try {
            setSaving(true);
            setError(null);

            const payload = isEdit
                ? {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    phone: formData.phone || undefined,
                }
                : { ...formData };

            if (isEdit) {
                await userApi.update(id, payload);
                toast.success(t('users.form.successUpdate'));
            } else {
                await userApi.create(payload);
                toast.success(t('users.form.successCreate'));
            }

            navigate('/users');
        } catch (err) {
            const errMsg = err.message || t('common.error');
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-spinner">{t('users.detail.loading')}</div>
            </div>
        );
    }

    return (
        <div className="page-container user-form-container">
            {/* Header */}
            <div className="page-header">
                <div className="header-left">
                    <button className="back-button" onClick={() => navigate('/users')} title={t('common.back')}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className="page-title-section">
                        <h1 className="page-title">
                            {isEdit ? t('users.form.editTitle') : t('users.form.newTitle')}
                        </h1>
                        <p className="page-subtitle">
                            {isEdit ? t('users.form.editSubtitle') : t('users.form.newSubtitle')}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="modern-form-layout">
                <div className="form-main-content">
                    {/* Basic Info Section */}
                    <div className="form-card">
                        <div className="card-header">
                            <User size={18} />
                            <h2>{t('users.form.sectionBasic')}</h2>
                        </div>
                        <div className="card-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label required">{t('users.form.firstName')}</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">{t('users.form.lastName')}</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className="input-field"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label required">{t('users.form.email')}</label>
                                    <div className="input-with-icon">
                                        <Mail size={16} />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="input-field has-icon"
                                            required
                                            disabled={isEdit}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('users.form.phone')}</label>
                                    <div className="input-with-icon">
                                        <Phone size={16} />
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="input-field has-icon"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security & Role Section */}
                    <div className="form-card">
                        <div className="card-header">
                            <Shield size={18} />
                            <h2>{t('users.form.sectionSecurity')}</h2>
                        </div>
                        <div className="card-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label required={!isEdit}">{t('users.form.password')}</label>
                                    <div className="input-with-icon">
                                        <Lock size={16} />
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="input-field has-icon"
                                            required={!isEdit}
                                            placeholder={isEdit ? t('users.form.passwordPlaceholder') : ''}
                                        />
                                    </div>
                                    <div className="input-hint">{t('users.form.passwordHint')}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">{t('users.form.role')}</label>
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        className="input-field"
                                        required
                                    >
                                        <option value="customer">{t('users.list.customer')}</option>
                                        <option value="admin">{t('users.list.admin')}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group mt-4">
                                <label className="form-label">{t('users.form.status')}</label>
                                <div className="status-toggle-group">
                                    <label className={`status-option ${formData.status === 'active' ? 'active' : ''}`}>
                                        <input
                                            type="radio"
                                            name="status"
                                            value="active"
                                            checked={formData.status === 'active'}
                                            onChange={handleChange}
                                        />
                                        <CheckCircle size={16} />
                                        {t('users.form.active')}
                                    </label>
                                    <label className={`status-option ${formData.status === 'inactive' ? 'active' : ''}`}>
                                        <input
                                            type="radio"
                                            name="status"
                                            value="inactive"
                                            checked={formData.status === 'inactive'}
                                            onChange={handleChange}
                                        />
                                        <div className="dot" />
                                        {t('users.form.inactive')}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="form-sticky-actions">
                    <div className="actions-wrapper" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                        <button
                            type="submit"
                            className="btn-primary-lg"
                            disabled={saving}
                        >
                            {saving ? t('users.form.creating') : t('users.form.save')}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/users')}
                            className="btn-secondary-lg"
                            disabled={saving}
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
