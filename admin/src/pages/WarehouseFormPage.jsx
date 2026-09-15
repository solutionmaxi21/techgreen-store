import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { warehouseApi, metadataApi } from '../services/apiService';
import { ChevronLeft } from 'lucide-react';
import '../styles/layout.css';
import '../styles/forms.css';

const WarehouseFormPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        wilaya_id: '',
        wilaya: ''
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [wilayas, setWilayas] = useState([]);

    useEffect(() => {
        loadWilayas();
        if (isEdit) {
            loadWarehouse();
        }
    }, [id]);

    const loadWilayas = async () => {
        try {
            const data = await metadataApi.getWilayas();
            setWilayas(data);
        } catch (err) {
            console.error('Failed to load wilayas', err);
        }
    };

    const loadWarehouse = async () => {
        try {
            setLoading(true);
            const data = await warehouseApi.getById(id);
            setFormData({
                name: data.warehouse_name || '',
                address: data.location_address || '',
                phone: data.contact_number || '',
                wilaya_id: data.wilaya_id || '',
                wilaya: ''
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!formData.wilaya && formData.wilaya_id && wilayas.length > 0) {
            const selectedWilaya = wilayas.find(w => String(w.id) === String(formData.wilaya_id));
            if (selectedWilaya?.name) {
                setFormData(prev => ({ ...prev, wilaya: String(selectedWilaya.name).toUpperCase() }));
            }
        }
    }, [formData.wilaya, formData.wilaya_id, wilayas]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resolveWilayaId = (wilayaValue) => {
        const normalized = String(wilayaValue || '').trim().toUpperCase();
        if (!normalized) return '';

        const match = wilayas.find((w) => {
            const id = String(w.id || '').toUpperCase();
            const code = String(w.code || '').toUpperCase();
            const name = String(w.name || '').toUpperCase();
            const nameAr = String(w.name_ar || '').toUpperCase();
            return normalized === id || normalized === code || normalized === name || normalized === nameAr;
        });

        return match?.id || '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.name.trim()) {
            setError(t('warehouses.nameRequired'));
            return;
        }

        try {
            setSaving(true);
            const normalizedWilaya = formData.wilaya.trim().toUpperCase();
            const resolvedWilayaId = resolveWilayaId(normalizedWilaya);

            if (normalizedWilaya && !resolvedWilayaId) {
                setError(t('warehouses.wilaya_invalid') || 'Please enter a valid wilaya');
                setSaving(false);
                return;
            }

            const payload = {
                name: formData.name,
                address: formData.address,
                phone: formData.phone,
                wilaya_id: resolvedWilayaId || null
            };

            if (isEdit) {
                await warehouseApi.update(id, payload);
            } else {
                await warehouseApi.create(payload);
            }
            navigate('/inventory/warehouses');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="page-container">{t('common.loading')}</div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="header-left">
                    <button
                        className="back-button"
                        onClick={() => navigate('/inventory/warehouses')}
                        title={t('warehouses.backToList') || 'Back to Warehouses'}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="page-title">
                            {isEdit ? (t('warehouses.editTitle') || 'Edit Warehouse') : (t('warehouses.newTitle') || 'New Warehouse')}
                        </h1>
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-alert">
                    <span>⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-section">
                    <div className="form-group">
                        <label className="form-label required">{t('warehouses.name') || 'Name'}</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="input-field"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('warehouses.address') || 'Address'}</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="input-field"
                            rows={3}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('warehouses.phone') || 'Phone'}</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="input-field"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('warehouses.wilaya') || 'Wilaya'}</label>
                            <input
                                type="text"
                                name="wilaya"
                                value={formData.wilaya}
                                onChange={(e) => setFormData(prev => ({ ...prev, wilaya: e.target.value.toUpperCase() }))}
                                className="input-field"
                                placeholder={t('warehouses.wilaya_placeholder') || 'Enter Wilaya'}
                                list="wilayas-list"
                                style={{ textTransform: 'uppercase' }}
                            />
                            <datalist id="wilayas-list">
                                {wilayas.map(w => (
                                    <option key={w.id} value={String(w.name || '').toUpperCase()} />
                                ))}
                            </datalist>
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? t('common.saving') : (isEdit ? t('common.update') : t('common.create'))}
                    </button>
                    <button type="button" onClick={() => navigate('/inventory/warehouses')} className="btn btn-secondary">
                        {t('common.cancel')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default WarehouseFormPage;
