import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // 1. Added i18n import
import toast from 'react-hot-toast';
import useConfirmation from '../hooks/useConfirmation';
import { productApi, metadataApi } from '../services/apiService';
import { getPrimaryProductImageUrl } from '../utils/imageUrl';
import {
  Search, Plus, Download, Trash2, Edit
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Can from '../components/Can';
import ResourceError from '../components/ResourceError';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency } from '../utils/formatters';

// Helper to get localized name from bilingual object or string
const getLocalizedName = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return value.fr || value.ar || '';
  return value;
};

const getImageUrl = (product) => getPrimaryProductImageUrl(product);

const ProductsListPage = () => {
  const { t, i18n } = useTranslation(); // 2. Added hook
  const isRTL = i18n.dir() === 'rtl';   // 3. Logic for RTL styles
  const navigate = useNavigate();

  // --- STATE ---
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const { confirm, ConfirmationDialog } = useConfirmation();
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    brand: '',
    stockLevel: '',
    status: '',
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });

  const hasActiveFilters = 
    filters.search !== '' || 
    filters.category !== '' || 
    filters.brand !== '' || 
    filters.stockLevel !== '' || 
    filters.status !== '' ||
    filters.sortBy !== 'created_at' ||
    filters.sortOrder !== 'DESC';

  // --- PAGINATION STATE ---
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // --- LIFECYCLE ---
  useEffect(() => {
    loadMetadata();
  }, []);

  // Reload products whenever page, pageSize, or filters change
  useEffect(() => {
    loadProducts();
  }, [page, pageSize, filters]);

  const loadMetadata = async () => {
    try {
      const [categoriesData, brandsData] = await Promise.all([
        metadataApi.getCategories(),
        metadataApi.getBrands()
      ]);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setBrands(Array.isArray(brandsData) ? brandsData : []);
    } catch (error) {
      console.error('Failed to load metadata:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = {
        page,
        limit: pageSize,
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder,
        ...(filters.search && { search: filters.search }),
        ...(filters.category && { category_id: filters.category }),
        ...(filters.brand && { brand: filters.brand }),
        ...(filters.stockLevel && { stock_filter:
          filters.stockLevel === 'in' ? 'in_stock' :
          filters.stockLevel === 'out' ? 'out_of_stock' :
          filters.stockLevel === 'low' ? 'low_stock' :
          filters.stockLevel
        }),
        ...(filters.status === 'active' && { is_active: 'true' }),
        ...(filters.status === 'inactive' && { is_active: 'false' }),
      };
      const productsData = await productApi.getAll(params);
      // Support both paginated { products, total } and plain array responses
      if (Array.isArray(productsData)) {
        setProducts(productsData);
        setTotalProducts(productsData.length);
      } else {
        setProducts(productsData.products || []);
        setTotalProducts(productsData.total ?? productsData.products?.length ?? 0);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  };

  // Reset to page 1 whenever filters change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSort = (columnKey, direction) => {
    let backendKey = 'created_at';
    if (columnKey === 'price') {
      backendKey = 'current_price';
    } else if (columnKey === 'stock') {
      backendKey = 'total_stock';
    }
    
    setFilters(prev => ({
      ...prev,
      sortBy: backendKey,
      sortOrder: direction.toUpperCase()
    }));
    setPage(1);
  };

  const handleBulkDelete = async () => {
    if (!await confirm({
      title: t('products.bulk_delete'),
      message: t('products.bulk_delete_confirm', { count: selectedIds.length }),
      confirmText: t('common.delete'),
      isDangerous: true
    })) return;
    try {
      await productApi.bulkDelete(selectedIds);
      setSelectedIds([]);
      loadProducts(); // Refresh current page from server
    } catch (error) {
      toast.error(t('products.delete_failed'));
    }
  };

  const handleExport = async () => {
    try {
      const blob = await productApi.exportCSV();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.message || t('common.error'));
    }
  };

  // --- SELECTION LOGIC ---
  const handleSelectAll = (checked) => {
    if (checked) setSelectedIds(products.map(p => p.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDelete = async (id) => {
    if (!await confirm({
      title: t('products.delete'),
      message: t('products.delete_confirm'),
      confirmText: t('common.delete'),
      isDangerous: true
    })) return;

    try {
      await productApi.delete(id);
      setSelectedIds(prev => prev.filter(i => i !== id));
      loadProducts(); // Refresh current page from server
    } catch (error) {
      console.error("Delete failed", error);
      const errorMessage = error?.message || t('products.delete_failed');
      toast.error(errorMessage);
    }
  };

  // --- COLUMNS DEFINITION (Preserved Styles & Logic) ---
  const columns = [
    {
      key: 'image',
      label: t('table.product'), // Translated
      width: '350px',
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px',
            borderRadius: '6px', border: '1px solid hsl(var(--border))',
            overflow: 'hidden', backgroundColor: 'hsl(var(--muted))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            {(row.image || (row.images && row.images.length > 0)) ? (
              <img
                src={getImageUrl(row)}
                alt={row.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                // Logic preserved exactly
                onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerText = 'IMG'; }}
              />
            ) : (
              <span style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))' }}>IMG</span>
            )}
          </div>

          <div>
            <div style={{ fontWeight: '600', color: 'hsl(var(--foreground))', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {getLocalizedName(row.name)}
              {(row.variant_count > 1 || (row.variants && row.variants.length > 1)) && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  background: 'hsl(var(--primary) / 0.1)',
                  color: 'hsl(var(--primary))',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap'
                }}>
                  {row.variant_count || row.variants?.length} vars
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', fontFamily: 'monospace' }}>
              {row.sku}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'category',
      label: t('table.category'), // Translated
      render: (val) => <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>{getLocalizedName(val) || '—'}</span>
    },
    {
      key: 'barcode',
      label: t('table.barcode'),
      render: (val) => (
        <span style={{
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          backgroundColor: 'hsl(var(--muted))',
          padding: '2px 8px',
          borderRadius: '4px',
          color: 'hsl(var(--foreground))',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100px',
          display: 'inline-block'
        }}>
          {val || '—'}
        </span>
      )
    },
    {
      key: 'brand',
      label: t('table.brand'), // Translated
      render: (val) => <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{getLocalizedName(val)}</span>
    },
    {
      key: 'price',
      label: t('table.price'), // Translated
      sortable: true,
      render: (val) => <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{formatCurrency(val)}</span>
    },
    {
      key: 'stock',
      label: t('table.stock'),
      sortable: true,
      render: (val, row) => {
        let statusKey = 'in_stock';
        if (val === 0) statusKey = 'out_of_stock';
        else if (val <= (row.lowStockThreshold || 5)) statusKey = 'low_stock';

        // Map to StatusBadge-friendly keys for color detection
        const badgeStatusMap = { in_stock: 'in stock', low_stock: 'low stock', out_of_stock: 'out of stock' };

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <StatusBadge status={badgeStatusMap[statusKey]} label={t(`products.${statusKey}`)} />
            <span style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>
              {val} {t('products.units')}
            </span>
          </div>
        );
      }
    },
    {
      key: 'is_active',
      label: t('table.status'),
      render: (val) => {
        const isActive = val === true || val === 1 || val === 'true' || val === 'active';
        return (
          <StatusBadge
            status={isActive ? 'active' : 'inactive'}
            label={isActive ? t('common.active') : t('common.inactive')}
          />
        );
      }
    },
    {
      key: 'actions',
      label: '',
      width: '80px',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            className="icon-btn"
            title={t('products.edit_title')}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/products/${row.id}`);
            }}
          >
            <Edit size={16} />
          </button>

          <Can permission="products.delete">
            <button
              className="icon-btn"
              title={t('products.delete_btn')}
              style={{ color: 'hsl(var(--destructive))' }}
              onClick={(e) => handleDelete(row.id, e)}
            >
              <Trash2 size={16} />
            </button>
          </Can>
        </div>
      )
    }
  ];

  return (
    <div className="page-content">
      {/* HEADER - RTL margin logic added */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: 'hsl(var(--foreground))' }}>
            {t('products.title')}
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '4px', fontSize: '0.9rem' }}>
            {t('products.subtitle', { count: totalProducts })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Can permission="products.export">
            <button className="btn btn-outline" onClick={handleExport}>
              <Download size={16} style={{ [isRTL ? 'marginLeft' : 'marginRight']: '8px' }} />
              {t('products.export')}
            </button>
          </Can>
          <Can permission="products.create">
            <button className="btn btn-primary" onClick={() => navigate('/products/add')}>
              <Plus size={18} style={{ [isRTL ? 'marginLeft' : 'marginRight']: '8px' }} />
              {t('products.add')}
            </button>
          </Can>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="table-filters">
        <div className="input-group" style={{ maxWidth: '280px' }}>
          <div className="input-group-icon"><Search size={16} /></div>
          <input
            type="text"
            placeholder={t('products.search_barcode_placeholder') || 'Search by name, SKU, or barcode...'}
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '140px' }}
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
        >
          <option value="">{t('products.all_categories')}</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{getLocalizedName(c.name)}</option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '140px' }}
          value={filters.brand}
          onChange={(e) => handleFilterChange('brand', e.target.value)}
        >
          <option value="">{t('products.all_brands')}</option>
          {brands.map(b => (
            <option key={b.brand} value={b.brand}>{b.name}</option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '140px' }}
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">{t('products.all_statuses')}</option>
          <option value="active">{t('common.active')}</option>
          <option value="inactive">{t('common.inactive')}</option>
        </select>

        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={filters.stockLevel}
          onChange={(e) => handleFilterChange('stockLevel', e.target.value)}
        >
          <option value="">{t('products.all_stock')}</option>
          <option value="in">{t('products.in_stock')}</option>
          <option value="low">{t('products.low_stock')}</option>
          <option value="out">{t('products.out_of_stock')}</option>
        </select>

        {hasActiveFilters && (
          <button
            className="btn btn-outline"
            style={{
              width: 'auto',
              minWidth: '110px',
              height: '40px',
              padding: '0 12px',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))'
            }}
            onClick={() => setFilters({
              search: '',
              category: '',
              brand: '',
              stockLevel: '',
              status: '',
              sortBy: 'created_at',
              sortOrder: 'DESC'
            })}
          >
            {t('common.clear') || 'Clear'}
          </button>
        )}

        {/* Bulk Action Bar - RTL alignment logic added */}
        {selectedIds.length > 0 && (
          <div className="bulk-actions" style={{ [isRTL ? 'marginRight' : 'marginLeft']: 'auto', marginBottom: 0 }}>
            <div className="bulk-info">{selectedIds.length} {t('products.selected')}</div>
            <div className="bulk-buttons">
              <Can permission="products.delete">
                <button className="bulk-btn danger" onClick={handleBulkDelete}>
                  <Trash2 size={14} style={{ [isRTL ? 'marginLeft' : 'marginRight']: '4px' }} />
                  {t('products.delete_btn')}
                </button>
              </Can>
            </div>
          </div>
        )}
      </div>

      {loadError ? <ResourceError error={loadError} onRetry={loadProducts} /> : <DataTable
        columns={columns}
        data={products}
        onSort={handleSort}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onRowClick={(row) => navigate(`/products/${row.id}`)}
        idField="id"
        emptyMessage={t('products.no_products')}
        pagination={{
          page,
          pageSize,
          total: totalProducts,
          onPageChange: setPage,
          onPageSizeChange: (newSize) => { setPageSize(newSize); setPage(1); },
        }}
      />}
      {/* Confirmation Modal */}
      <ConfirmationDialog />
    </div>
  );
};

export default ProductsListPage;
