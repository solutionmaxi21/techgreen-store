import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import useConfirmation from '../hooks/useConfirmation';
import Can from '../components/Can';
import { Search, Plus, Trash2, Edit, Phone, Mail, MapPin } from 'lucide-react';
import { supplierApi } from '../services/apiService';
import DataTable from '../components/DataTable';
import ResourceError from '../components/ResourceError';
import '../styles/layout.css';
import '../styles/forms.css';
import './CategoriesListPage.css';

export default function SuppliersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmationDialog } = useConfirmation();
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [suppliersData, statsData] = await Promise.all([
        supplierApi.getAll({}),
        supplierApi.getStats()
      ]);

      setAllSuppliers(suppliersData);
      setStats(statsData);
    } catch (err) {
      setError(err);
      console.error('Error loading suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering
  const suppliers = useMemo(() => {
    if (!searchTerm) return allSuppliers;

    const searchLower = searchTerm.toLowerCase();
    return allSuppliers.filter(supplier => {
      const name = (supplier.name || '').toLowerCase();
      const email = (supplier.contact_email || '').toLowerCase();
      const address = (supplier.address || '').toLowerCase();
      return name.includes(searchLower) || email.includes(searchLower) || address.includes(searchLower);
    });
  }, [allSuppliers, searchTerm]);

  const handleDelete = async (id) => {
    if (!await confirm({
      title: t('suppliers.list.deleteSupplier'),
      message: t('suppliers.list.confirmDelete'),
      confirmText: t('common.delete'),
      isDangerous: true
    })) {
      return;
    }

    try {
      await supplierApi.delete(id);
      await loadData();
      // Using common.save or similar would be better but alert is fine for now
    } catch (err) {
      toast.error(err.message || t('common.error'));
    }
  };

  const handleRowClick = (supplier) => {
    navigate(`/suppliers/${supplier.id || supplier.supplier_id}`);
  };

  const handleEdit = (id) => {
    navigate(`/suppliers/edit/${id}`);
  };

  const handleCreate = () => {
    navigate('/suppliers/new');
  };

  const columns = [
    {
      key: 'name',
      label: t('suppliers.form.name'),
      sortable: true,
      render: (value) => <strong>{value}</strong>
    },
    {
      key: 'contact_email',
      label: t('users.detail.email'),
      sortable: true,
      render: (value) => (
        <a href={`mailto:${value}`} className="text-primary" onClick={(e) => e.stopPropagation()}>
          {value}
        </a>
      )
    },
    {
      key: 'contact_phone',
      label: t('users.detail.phone'),
      render: (value) => value || '-'
    },
    {
      key: 'address',
      label: t('suppliers.form.address'),
      render: (value) => (
        <span className="text-sm" title={value}>
          {value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : '-'}
        </span>
      )
    },
    {
      key: 'product_count',
      label: t('dashboard.products'),
      sortable: true,
      render: (value) => (
        <span className={`product-count ${value > 0 ? 'has-products' : 'no-products'}`}>
          {value || 0}
        </span>
      )
    },
    {
      key: 'supplier_id',
      label: t('table.actions'),
      render: (value, row) => (
        <div className="table-actions">
          <Can permission="suppliers.update">
            <button
              onClick={(e) => { e.stopPropagation(); handleEdit(value); }}
              className="btn-action btn-edit"
              title={t('common.edit')}
            >
              ✏️
            </button>
          </Can>
          <Can permission="suppliers.delete">
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(value); }}
              className="btn-action btn-delete"
              title={t('common.delete')}
              disabled={row.product_count > 0}
            >
              🗑️
            </button>
          </Can>
        </div>
      )
    }
  ];

  if (loading) {
    return <div className="loading">{t('suppliers.list.loading')}</div>;
  }

  if (error) {
    return <ResourceError error={error} onRetry={loadData} />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">{t('suppliers.list.title')}</h1>
          <p className="page-subtitle">{t('suppliers.list.subtitle')}</p>
        </div>
        <Can permission="suppliers.create">
          <button onClick={handleCreate} className="btn btn-primary">
            {t('suppliers.list.new')}
          </button>
        </Can>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">{t('suppliers.list.total')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.with_products}</div>
            <div className="stat-label">{t('suppliers.list.withProducts')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.without_products}</div>
            <div className="stat-label">{t('suppliers.list.withoutProducts')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.total_products}</div>
            <div className="stat-label">{t('suppliers.list.totalProducts')}</div>
          </div>
        </div>
      )}

      {/* Search Filter */}
      <div className="filters-section">
        <div className="input-group" style={{ maxWidth: '280px' }}>
          <div className="input-group-icon"><Search size={16} /></div>
          <input
            type="text"
            placeholder={t('suppliers.list.searchPlaceholder') || 'Search by name, email, or address...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="content-section">
        <DataTable
          data={suppliers}
          columns={columns}
          emptyMessage={t('suppliers.list.empty')}
          onRowClick={handleRowClick}
          idField="id"
        />
      </div>
    </div>
  );
}
