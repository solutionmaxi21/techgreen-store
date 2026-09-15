import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import useConfirmation from '../hooks/useConfirmation';
import Can from '../components/Can';
import ResourceError from '../components/ResourceError';
import { useAuthorization } from '../contexts/AuthorizationContext';
import { Search } from 'lucide-react';
import { collectionApi } from '../services/apiService';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import '../styles/layout.css';
import '../styles/forms.css';
import './CategoriesListPage.css';

const getLocalizedName = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return value.fr || value.ar || '';
  return value;
};

export default function CollectionsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { confirm, ConfirmationDialog } = useConfirmation();
  const { can } = useAuthorization();

  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const rows = await collectionApi.getAll({});
      setCollections(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error('Failed to load collections:', error);
      setLoadError(error);
      toast.error(error.message || t('collections.list.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const filteredCollections = useMemo(() => {
    if (!searchTerm) return collections;
    const q = searchTerm.toLowerCase();
    return collections.filter((item) => {
      const name = getLocalizedName(item.collection_name).toLowerCase();
      const slug = (item.collection_slug || '').toLowerCase();
      return name.includes(q) || slug.includes(q);
    });
  }, [collections, searchTerm]);

  const stats = useMemo(() => {
    const total = collections.length;
    const active = collections.filter((c) => c.is_active).length;
    const root = collections.filter((c) => c.parent_collection_id === null).length;
    const sub = total - root;
    return { total, active, root, sub };
  }, [collections]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    const ok = await confirm({
      title: t('common.delete') || 'Delete',
      message: t('common.confirmDelete') || 'Are you sure you want to delete this item?',
      confirmText: t('common.delete') || 'Delete',
      isDangerous: true,
    });
    if (!ok) return;

    try {
      await collectionApi.delete(id);
      await loadCollections();
      toast.success(t('common.deleted') || 'Deleted');
    } catch (error) {
      toast.error(error.message || 'Delete failed');
    }
  };

  const columns = [
    {
      key: 'collection_name',
      label: t('menu.collections') || 'Collections',
      render: (value) => <strong>{getLocalizedName(value)}</strong>,
    },
    {
      key: 'collection_slug',
      label: t('categories.list.columns.slug') || 'Slug',
      render: (value) => <code className="slug-code">{value}</code>,
    },
    {
      key: 'parent_collection_id',
      label: t('categories.list.columns.parent') || 'Parent',
      render: (value) => {
        if (!value) return <StatusBadge status={t('categories.list.columns.root') || 'Root'} />;
        const parent = collections.find((c) => c.id === value || c.collection_id === value);
        return parent ? getLocalizedName(parent.collection_name) : '-';
      },
    },
    {
      key: 'product_count',
      label: t('categories.list.columns.products') || 'Products',
      render: (value) => <span>{value || 0}</span>,
    },
    {
      key: 'is_active',
      label: t('common.status'),
      render: (value) => <StatusBadge status={value ? 'active' : 'inactive'} label={value ? t('common.active') : t('common.inactive')} />,
    },
    {
      key: 'id',
      label: t('categories.list.columns.actions'),
      render: (value, row) => (
        <div className="table-actions">
          <Can permission="collections.update">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/collections/edit/${row.collection_id || value}`);
              }}
              className="btn-action btn-edit"
              title={t('common.edit')}
            >
              ✏️
            </button>
          </Can>
          <Can permission="collections.delete">
            <button
              onClick={(e) => handleDelete(row.collection_id || value, e)}
              className="btn-action btn-delete"
              title={t('common.delete')}
            >
              🗑️
            </button>
          </Can>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="loading">{t('common.loading') || 'Loading...'}</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">{t('collections.list.title')}</h1>
          <p className="page-subtitle">{t('collections.list.subtitle')}</p>
        </div>
        <Can permission="collections.create">
          <button onClick={() => navigate('/collections/new')} className="btn btn-primary">
            {t('collections.list.add')}
          </button>
        </Can>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{stats.total}</div><div className="stat-label">{t('collections.list.stats.total')}</div></div>
        <div className="stat-card"><div className="stat-value">{stats.active}</div><div className="stat-label">{t('collections.list.stats.active')}</div></div>
        <div className="stat-card"><div className="stat-value">{stats.root}</div><div className="stat-label">{t('collections.list.stats.root')}</div></div>
        <div className="stat-card"><div className="stat-value">{stats.sub}</div><div className="stat-label">{t('collections.list.stats.sub')}</div></div>
      </div>

      <div className="filters-section">
        <div className="input-group" style={{ maxWidth: '280px' }}>
          <div className="input-group-icon"><Search size={16} /></div>
          <input
            type="text"
            placeholder={t('collections.list.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="content-section">
        {loadError ? (
          <ResourceError error={loadError} onRetry={loadCollections} />
        ) : (
          <DataTable
            data={filteredCollections}
            columns={columns}
            emptyMessage={t('collections.list.empty')}
            onRowClick={can('collections.update')
              ? (row) => navigate(`/collections/edit/${row.collection_id || row.id}`)
              : undefined}
          />
        )}
      </div>

      <ConfirmationDialog />
    </div>
  );
}
