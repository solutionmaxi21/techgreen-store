import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Package, Edit } from 'lucide-react';
import { inventoryApi } from '../services/apiService';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import Can from '../components/Can';
import ResourceError from '../components/ResourceError';
import { formatDate } from '../utils/formatters';
import '../styles/layout.css';
//import '../styles/tables.css';
import '../styles/buttons.css';
import './InventoryListPage.css';
import '../styles/actions.css';
import './CategoriesListPage.css';

const InventoryListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [allStock, setAllStock] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [stockData, warehousesData, statsData] = await Promise.all([
        inventoryApi.getAll({}),
        inventoryApi.getWarehouses(),
        inventoryApi.getStats(),
      ]);

      setAllStock(stockData);
      setWarehouses(warehousesData);
      setStats(statsData);
    } catch (err) {
      setError(err);
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering
  const stock = useMemo(() => {
    let filtered = allStock;

    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const productName = (item.product_name || '').toLowerCase();
        const productSku = (item.product_sku || '').toLowerCase();
        const variantName = (item.variant_name || '').toLowerCase();
        const variantSku = (item.variant_sku || '').toLowerCase();
        return productName.includes(searchLower) ||
          productSku.includes(searchLower) ||
          variantName.includes(searchLower) ||
          variantSku.includes(searchLower);
      });
    }

    // Warehouse filter
    if (selectedWarehouse) {
      filtered = filtered.filter(item => String(item.warehouse_id) === String(selectedWarehouse));
    }

    // Low stock filter
    if (showLowStock) {
      filtered = filtered.filter(item => item.is_low_stock);
    }

    return filtered;
  }, [allStock, searchQuery, selectedWarehouse, showLowStock]);

  const handleAdjustStock = (stockItem) => {
    navigate(`/inventory/adjust/${stockItem.stock_id}`);
  };

  const columns = [
    {
      key: 'product_name',
      label: t('inventory.list.columns.product'),
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">
            {value}
            {row.variant_name && <span className="text-gray-500 text-sm ml-2">({row.variant_name})</span>}
          </div>
          <div className="text-sm text-gray-500">
            {row.variant_sku ? row.variant_sku : row.product_sku}
          </div>
        </div>
      ),
    },
    {
      key: 'warehouse_name',
      label: t('inventory.list.columns.warehouse'),
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">{row.warehouse_location}</div>
        </div>
      ),
    },
    {
      key: 'quantity',
      label: t('inventory.list.columns.total'),
      sortable: true,
      render: (value) => (
        <div className="font-bold">{value}</div>
      ),
    },
    {
      key: 'reserved_quantity',
      label: t('inventory.list.columns.reserved'),
      sortable: true,
      render: (value) => (
        <div className="text-orange-600">{value}</div>
      ),
    },
    {
      key: 'quantity_available',
      label: t('inventory.list.columns.available'),
      sortable: true,
      render: (value) => (
        <div className="text-green-600 font-medium">{value}</div>
      ),
    },
    {
      key: 'reorder_level',
      label: t('inventory.list.columns.reorderLevel'),
      sortable: true,
    },
    {
      key: 'is_low_stock',
      label: t('inventory.list.columns.status'),
      sortable: true,
      render: (value, row) => {
        if (row.quantity === 0) {
          return <StatusBadge status="Out of Stock" label={t('inventory.status.out_of_stock')} />;
        }
        if (value) {
          return <StatusBadge status="Low Stock" label={t('inventory.status.low_stock')} />;
        }
        return <StatusBadge status="In Stock" label={t('inventory.status.in_stock')} />;
      },
    },
    {
      key: 'last_restocked',
      label: t('inventory.list.columns.lastRestocked'),
      sortable: true,
      render: (value) => (value ? formatDate(value) : t('inventory.list.never')),
    },
    {
      key: 'actions',
      label: t('inventory.list.columns.actions'),
      render: (value, row) => (
        <div className="action-buttons">
          <Can permission="inventory.adjust">
            <button
              onClick={() => handleAdjustStock(row)}
              className="btn-primary btn-sm"
              title={t('inventory.list.actions.adjustStockTitle')}
            >
              <Edit size={14} />
              {t('inventory.list.actions.adjustStock')}
            </button>
          </Can>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="page-container">{t('inventory.list.loading')}</div>;
  }

  if (error) {
    return <ResourceError error={error} onRetry={loadData} />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('inventory.list.title')}</h1>
          <p className="page-description">{t('inventory.list.subtitle')}</p>
        </div>
        <Can permission="warehouses.read">
          <button
            onClick={() => navigate('/inventory/warehouses')}
            className="btn btn-secondary"
          >
            {t('warehouses.manage') || 'Manage Warehouses'}
          </button>
        </Can>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">{t('inventory.list.stats.totalProducts')}</div>
            <div className="stat-value">{stats.total_products}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t('inventory.list.stats.totalQuantity')}</div>
            <div className="stat-value">{stats.total_quantity}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t('inventory.list.stats.available')}</div>
            <div className="stat-value text-green-600">{stats.total_available}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t('inventory.list.stats.reserved')}</div>
            <div className="stat-value text-orange-600">{stats.total_reserved}</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-label">{t('inventory.list.stats.lowStock')}</div>
            <div className="stat-value">{stats.low_stock_products}</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-label">{t('inventory.list.stats.outOfStock')}</div>
            <div className="stat-value">{stats.out_of_stock_products}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-container">
        <div className="input-group" style={{ maxWidth: '280px' }}>
          <div className="input-group-icon"><Search size={16} /></div>
          <input
            type="text"
            placeholder={t('inventory.list.filters.searchPlaceholder') || 'Search by product name or SKU...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          value={selectedWarehouse}
          onChange={(e) => setSelectedWarehouse(e.target.value)}
          className="filter-select"
        >
          <option value="">{t('inventory.list.filters.allWarehouses')}</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
              {warehouse.warehouse_name}
            </option>
          ))}
        </select>

        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={showLowStock}
            onChange={(e) => setShowLowStock(e.target.checked)}
          />
          <span>{t('inventory.list.filters.showLowStockOnly')}</span>
        </label>
      </div>

      {/* Stock Table */}
      <DataTable
        columns={columns}
        data={stock}
        defaultSortKey="product_name"
        emptyMessage={t('inventory.list.empty')}
      />
    </div>
  );
};

export default InventoryListPage;
