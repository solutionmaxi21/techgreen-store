import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import useConfirmation from '../hooks/useConfirmation';
import { Plus, Edit, Trash2, MapPin, Phone, Search, ChevronLeft } from 'lucide-react';
import { warehouseApi } from '../services/apiService';
import DataTable from '../components/DataTable';
import Can from '../components/Can';
import ResourceError from '../components/ResourceError';
import '../styles/layout.css';
import '../styles/buttons.css';

const WarehousesListPage = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { confirm, ConfirmationDialog } = useConfirmation();

    useEffect(() => {
        loadWarehouses();
    }, []);

    const loadWarehouses = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await warehouseApi.getAll();
            setWarehouses(data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!await confirm({
            title: t('common.delete'),
            message: t('common.confirmDelete'),
            confirmText: t('common.delete'),
            cancelText: t('common.cancel'),
            isDangerous: true
        })) return;

        try {
            await warehouseApi.delete(id);
            loadWarehouses();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const filteredWarehouses = warehouses.filter(w =>
        w.warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.location_address?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        {
            key: 'warehouse_name',
            label: t('warehouses.name') || 'Name',
            sortable: true,
            render: (value) => <div className="font-bold">{value}</div>
        },
        {
            key: 'location_address',
            label: t('warehouses.address') || 'Address',
            render: (value) => (
                <div className="flex items-center text-sm text-gray-600">
                    <MapPin size={14} className="mr-1" />
                    {value || '-'}
                </div>
            )
        },
        {
            key: 'contact_number',
            label: t('warehouses.phone') || 'Phone',
            render: (value) => (
                <div className="flex items-center text-sm text-gray-600">
                    <Phone size={14} className="mr-1" />
                    {value || '-'}
                </div>
            )
        },
        {
            key: 'actions',
            label: t('common.actions'),
            render: (_, row) => (
                <div className="action-buttons">
                    <Can permission="warehouses.update">
                        <button
                            onClick={() => navigate(`/inventory/warehouses/edit/${row.id}`)}
                            className="btn-icon"
                            title={t('common.edit')}
                        >
                            <Edit size={18} />
                        </button>
                    </Can>
                    <Can permission="warehouses.delete">
                        <button
                            onClick={() => handleDelete(row.id)}
                            className="btn-icon delete"
                            title={t('common.delete')}
                        >
                            <Trash2 size={18} />
                        </button>
                    </Can>
                </div>
            )
        }
    ];

    if (loading) return <div className="page-container">{t('common.loading')}</div>;
    if (error) return <ResourceError error={error} onRetry={loadWarehouses} />;

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="header-left">
                    <button
                        className="back-button"
                        onClick={() => navigate('/inventory')}
                        title={t('warehouses.backToInventory') || 'Back to Inventory'}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="page-title">{t('warehouses.title') || 'Warehouses'}</h1>
                        <p className="page-description">{t('warehouses.subtitle') || 'Manage your inventory locations'}</p>
                    </div>
                </div>
                <Can permission="warehouses.create">
                    <button
                        onClick={() => navigate('/inventory/warehouses/new')}
                        className="btn btn-primary"
                    >
                        <Plus size={18} />
                        {t('warehouses.add') || 'Add Warehouse'}
                    </button>
                </Can>
            </div>

            <div className="filters-container">
                <div className="input-group">
                    <div className="input-group-icon"><Search size={16} /></div>
                    <input
                        type="text"
                        placeholder={t('common.search') || 'Search...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <DataTable
                columns={columns}
                data={filteredWarehouses}
                emptyMessage={t('warehouses.empty') || 'No warehouses found'}
            />
            {/* Confirmation Dialog */}
            <ConfirmationDialog />
        </div>
    );
};

export default WarehousesListPage;
