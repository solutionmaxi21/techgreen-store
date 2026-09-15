import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import useConfirmation from '../hooks/useConfirmation';
import { Trash2, RotateCcw, Search } from 'lucide-react';
import DataTable from '../components/DataTable';
import ResourceError from '../components/ResourceError';
import { formatDate } from '../utils/formatters';
import {
  productApi,
  categoryApi,
  userApi,
  reviewApi,
  promotionApi,
  collectionApi,
  supplierApi,
  warehouseApi,
  newsletterBroadcastApi,
} from '../services/apiService';
import '../styles/layout.css';
import '../styles/forms.css';
import './TrashPage.css';

const ENTITY_OPTIONS = [
  { key: 'products', labelKey: 'trash.entities.products' },
  { key: 'categories', labelKey: 'trash.entities.categories' },
  { key: 'users', labelKey: 'trash.entities.users' },
  { key: 'reviews', labelKey: 'trash.entities.reviews' },
  { key: 'promotions', labelKey: 'trash.entities.promotions' },
  { key: 'suppliers', labelKey: 'trash.entities.suppliers' },
  { key: 'collections', labelKey: 'trash.entities.collections' },
  { key: 'warehouses', labelKey: 'trash.entities.warehouses' },
  { key: 'newsletter_broadcasts', labelKey: 'Newsletters' },
];

function TrashPage() {
  const { t, i18n } = useTranslation();
  const [entity, setEntity] = useState('products');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const { confirm, ConfirmationDialog } = useConfirmation();

  const renderMaybeLocalized = (value) => {
    if (value == null) return '-';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      const lang = (i18n?.resolvedLanguage || i18n?.language || 'fr').split('-')[0];
      const langValue = value?.[lang];
      if (typeof langValue === 'string' && langValue) return langValue;
      if (typeof value?.fr === 'string' && value.fr) return value.fr;
      if (typeof value?.ar === 'string' && value.ar) return value.ar;
      return '-';
    }
    return String(value);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, search]);

  const api = useMemo(() => {
    switch (entity) {
      case 'products':
        return {
          list: (filters) => productApi.getTrash(filters),
          restore: (id) => productApi.restore(id),
          hardDelete: (id) => productApi.hardDelete(id),
        };
      case 'categories':
        return {
          list: (filters) => categoryApi.getTrash(filters),
          restore: (id) => categoryApi.restore(id),
          hardDelete: (id) => categoryApi.hardDelete(id),
        };
      case 'users':
        return {
          list: (filters) => userApi.getTrash(filters),
          restore: (id) => userApi.restore(id),
          hardDelete: (id) => userApi.hardDelete(id),
        };
      case 'reviews':
        return {
          list: (filters) => reviewApi.getTrash(filters),
          restore: (id) => reviewApi.restore(id),
          hardDelete: (id) => reviewApi.hardDelete(id),
        };
      case 'promotions':
        return {
          list: (filters) => promotionApi.getTrash(filters),
          restore: (id) => promotionApi.restore(id),
          hardDelete: (id) => promotionApi.hardDelete(id),
        };
      case 'suppliers':
        return {
          list: (filters) => supplierApi.getTrash(filters),
          restore: (id) => supplierApi.restore(id),
          hardDelete: (id) => supplierApi.hardDelete(id),
        };
      case 'collections':
        return {
          list: (filters) => collectionApi.getTrash(filters),
          restore: (id) => collectionApi.restore(id),
          hardDelete: (id) => collectionApi.hardDelete(id),
        };
      case 'warehouses':
        return {
          list: (filters) => warehouseApi.getTrash(filters),
          restore: (id) => warehouseApi.restore(id),
          hardDelete: (id) => warehouseApi.hardDelete(id),
        };
      case 'newsletter_broadcasts':
        return {
          list: (filters) => newsletterBroadcastApi.getTrash(filters),
          restore: (id) => newsletterBroadcastApi.restore(id),
          hardDelete: (id) => newsletterBroadcastApi.hardDelete(id),
        };
      default:
        return null;
    }
  }, [entity]);

  const normalizeListResponse = (res) => {
    // Some endpoints return arrays, others return {data:[]} or {items:[]}
    if (Array.isArray(res)) return res;

    if (entity === 'products') {
      // { products: [...], total, ... }
      return res?.products || res?.data?.products || [];
    }

    if (entity === 'users') {
      return res?.users || res?.data?.users || res?.data || [];
    }

    if (entity === 'promotions') {
      // promotionApi.getTrash returns mapped array already
      return Array.isArray(res) ? res : (res?.promotions || res?.data?.promotions || []);
    }

    if (entity === 'categories') {
      // /categories/trash returns array
      return res?.data || res?.categories || [];
    }

    if (entity === 'collections') {
      return Array.isArray(res) ? res : (res?.data || []);
    }

    if (entity === 'warehouses') {
      return Array.isArray(res) ? res : (res?.data || []);
    }

    return res?.data || res?.items || null;
  };

  const load = async () => {
    if (!api) return;

    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.list({ search });
      const list = normalizeListResponse(res);
      if (!Array.isArray(list)) {
        throw new TypeError('The trash endpoint returned an invalid collection');
      }
      setItems(list);
    } catch (e) {
      console.error('Failed to load trash:', e);
      setLoadError(e);
    } finally {
      setLoading(false);
    }
  };

  const getRowId = (row) => {
    if (entity === 'categories') return row.category_id ?? row.id;
    if (entity === 'suppliers') return row.supplier_id ?? row.id;
    if (entity === 'collections') return row.collection_id ?? row.id;
    if (entity === 'warehouses') return row.warehouse_id ?? row.id;
    return row.id;
  };

  const getDeletedAt = (row) => {
    return row.deleted_at ?? row.deletedAt ?? row.deleted_at;
  };

  const handleRestore = async (row) => {
    const id = getRowId(row);
    if (!id) return;

    if (!await confirm({
      title: t('trash.restore'),
      message: t('trash.confirm_restore'),
      confirmText: t('common.restore'),
      type: 'info'
    })) return;

    try {
      await api.restore(id);
      await load();
    } catch (e) {
      toast.error(e?.message || t('common.unknown_error'));
    }
  };

  const handleHardDelete = async (row) => {
    const id = getRowId(row);
    if (!id) return;

    if (!await confirm({
      title: t('trash.permanent_delete'),
      message: t('trash.confirm_hard_delete'),
      confirmText: t('common.delete'),
      isDangerous: true
    })) return;

    try {
      await api.hardDelete(id);
      await load();
    } catch (e) {
      toast.error(e?.message || t('common.unknown_error'));
    }
  };

  const columns = useMemo(() => {
    const actionsCol = {
      key: '__actions',
      label: t('trash.columns.actions'),
      width: '200px',
      render: (_value, row) => (
        <div className="trash-actions">
          <button
            className="btn-success btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleRestore(row);
            }}
            title={t('trash.restore')}
          >
            <RotateCcw size={16} />
            {t('trash.restore')}
          </button>
          <button
            className="btn-danger btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              handleHardDelete(row);
            }}
            title={t('trash.delete_permanently')}
          >
            <Trash2 size={16} />
            {t('trash.delete_permanently')}
          </button>
        </div>
      ),
    };

    const deletedAtCol = {
      key: 'deleted_at',
      label: t('trash.columns.deleted_at'),
      width: '160px',
      render: (_value, row) => {
        const deletedAt = getDeletedAt(row);
        return deletedAt ? formatDate(deletedAt) : '-';
      },
    };

    switch (entity) {
      case 'products':
        return [
          {
            key: 'name',
            label: t('trash.columns.name'),
            render: (value, row) => value || row.product_name || row.productName || '-',
          },
          { key: 'sku', label: 'SKU', width: '160px' },
          deletedAtCol,
          actionsCol,
        ];

      case 'categories':
        return [
          {
            key: 'category_name',
            label: t('trash.columns.name'),
            render: (value) => {
              if (typeof value === 'object' && value) return value.fr || value.ar || '-';
              return value || '-';
            },
          },
          { key: 'category_slug', label: t('trash.columns.slug'), width: '200px' },
          {
            key: 'product_count',
            label: t('trash.columns.references'),
            width: '140px',
            render: (value) => (value ?? 0),
          },
          deletedAtCol,
          actionsCol,
        ];

      case 'users':
        return [
          {
            key: 'name',
            label: t('trash.columns.name'),
            render: (value, row) => value || row.full_name || row.fullName || '-',
          },
          { key: 'email', label: t('trash.columns.email'), width: '220px' },
          deletedAtCol,
          actionsCol,
        ];

      case 'reviews':
        return [
          {
            key: 'productName',
            label: t('trash.columns.product'),
            render: (value) => value || '-',
          },
          {
            key: 'userName',
            label: t('trash.columns.customer'),
            width: '200px',
            render: (value) => value || '-',
          },
          {
            key: 'rating',
            label: t('trash.columns.rating'),
            width: '90px',
            render: (value) => (value ?? '-'),
          },
          deletedAtCol,
          actionsCol,
        ];

      case 'promotions':
        return [
          { key: 'code', label: t('trash.columns.code'), width: '160px' },
          {
            key: 'name',
            label: t('trash.columns.name'),
            render: (value) => renderMaybeLocalized(value),
          },
          deletedAtCol,
          actionsCol,
        ];

      case 'suppliers':
        return [
          { key: 'name', label: t('trash.columns.name') },
          { key: 'contact_email', label: t('trash.columns.email'), width: '220px' },
          {
            key: 'product_count',
            label: t('trash.columns.references'),
            width: '140px',
            render: (value) => (value ?? 0),
          },
          deletedAtCol,
          actionsCol,
        ];

      case 'collections':
        return [
          {
            key: 'collection_name',
            label: t('trash.columns.name'),
            render: (value) => renderMaybeLocalized(value),
          },
          { key: 'collection_slug', label: t('trash.columns.slug'), width: '200px' },
          {
            key: 'product_count',
            label: t('trash.columns.references'),
            width: '140px',
            render: (value) => (value ?? 0),
          },
          deletedAtCol,
          actionsCol,
        ];

      case 'warehouses':
        return [
          { key: 'warehouse_name', label: t('trash.columns.name') },
          { key: 'location_address', label: t('trash.columns.location'), width: '220px', render: (value) => value || '-' },
          deletedAtCol,
          actionsCol,
        ];

      case 'newsletter_broadcasts':
        return [
          { key: 'title', label: t('trash.columns.title') },
          { key: 'status', label: t('common.status') },
          { key: 'recipient_count', label: t('newsletter.recipients') },
          deletedAtCol,
          actionsCol,
        ];

      default:
        return [deletedAtCol, actionsCol];
    }
  }, [entity, t, i18n?.language]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1>
            <span className="page-icon">
              <Trash2 size={20} />
            </span>
            {t('trash.title')}
          </h1>
          <p className="page-subtitle">{t('trash.subtitle')}</p>
        </div>
      </div>

      <div className="trash-filters">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">{t('trash.entity')}</label>
          <select
            className="form-select"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
          >
            {ENTITY_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.labelKey.includes('.') ? t(opt.labelKey) : opt.labelKey}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
          <label className="form-label">{t('common.search')}</label>
          <div className="input-group">
            <div className="input-group-icon">
              <Search size={18} />
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('trash.search_placeholder')}
            />
          </div>
        </div>
      </div>

      {loadError ? (
        <ResourceError error={loadError} onRetry={load} />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          idField={entity === 'categories' ? 'category_id' : (entity === 'suppliers' ? 'supplier_id' : (entity === 'collections' ? 'collection_id' : (entity === 'warehouses' ? 'warehouse_id' : 'id')))}
          emptyMessage={t('trash.empty')}
        />
      )}
      {/* Confirmation Modal */}
      <ConfirmationDialog />
    </div>
  );
}

export default TrashPage;
