import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import useConfirmation from '../hooks/useConfirmation';
import { Edit, FileText, Printer, Search, Share2, Trash2 } from 'lucide-react';
import { categoryApi, productApi } from '../services/apiService';
import {
  createInventoryReport,
  createInventoryReportHtml,
  createInventoryReportPdfBlob,
  getReportFilename,
  saveInventoryReportPdf
} from '../lib/categoryInventoryReport';
import DataTable from '../components/DataTable';
import Can from '../components/Can';
import ResourceError from '../components/ResourceError';
import StatusBadge from '../components/StatusBadge';
import '../styles/layout.css';
import '../styles/forms.css';
import './CategoriesListPage.css';

const PAGE_SIZE = 100;
const REPORT_PRODUCT_FIELDS = [
  'id', 'name', 'productName', 'product_name',
  'categoryId', 'category_id',
  'isActive', 'is_active',
  'warehouseStock', 'warehouse_stock',
  'stock', 'totalStock', 'total_stock',
  'costPrice', 'cost_price',
  'productFees', 'product_fees',
  'calculatedCost', 'calculated_cost',
  'currentPrice', 'current_price', 'price'
].join(',');

const extractItems = (response, keys = []) => {
  if (Array.isArray(response)) return response;

  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
    if (Array.isArray(response?.data?.[key])) return response.data[key];
  }

  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const getCategoryId = (category) => Number(category.category_id ?? category.id);

export default function CategoriesListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [allCategories, setAllCategories] = useState([]);
  const { confirm, ConfirmationDialog } = useConfirmation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTree, setShowTree] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [reportAction, setReportAction] = useState(null);

  const locale = i18n.language === 'ar' ? 'ar-DZ' : 'fr-DZ';
  const selectedCount = selectedCategoryIds.length;
  const reportBusy = Boolean(reportAction);

  const getLocalizedName = (value) => {
    if (typeof value === 'object' && value !== null) {
      return value[i18n.language] || value.fr || value.ar || value.en || '';
    }
    return value || '';
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadAllCategories = async () => {
    const categories = [];
    let page = 1;

    while (true) {
      const response = await categoryApi.getAll({ page, limit: PAGE_SIZE });
      const batch = extractItems(response, ['categories']);
      categories.push(...batch);

      if (batch.length < PAGE_SIZE) break;
      page += 1;
    }

    return categories;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [categoriesData, statsData] = await Promise.all([
        loadAllCategories(),
        categoryApi.getStats()
      ]);

      setAllCategories(categoriesData);
      setSelectedCategoryIds((prev) => {
        const availableIds = new Set(categoriesData.map(getCategoryId));
        return prev.filter((id) => availableIds.has(id));
      });
      setStats(statsData);
    } catch (err) {
      setError(err);
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProductsForCategory = async (categoryId) => {
    const products = [];
    let page = 1;

    while (true) {
      const response = await productApi.getAll({
        category_id: categoryId,
        page,
        limit: PAGE_SIZE,
        sort_by: 'product_name',
        sort_order: 'ASC',
        fields: REPORT_PRODUCT_FIELDS
      });
      const batch = extractItems(response, ['products']);
      products.push(...batch);

      if (Array.isArray(response)) break;

      const total = Number(response?.total || 0);
      const totalPages = Number(response?.totalPages || 0);
      if (totalPages && page >= totalPages) break;
      if (total && products.length >= total) break;
      if (batch.length < PAGE_SIZE) break;

      page += 1;
    }

    return products;
  };

  const buildTreeStructure = (cats) => {
    const categoryMap = new Map();
    const roots = [];

    cats.forEach((cat) => {
      const categoryId = getCategoryId(cat);
      if (!Number.isFinite(categoryId)) return;
      categoryMap.set(categoryId, { ...cat, category_id: categoryId, children: [] });
    });

    cats.forEach((cat) => {
      const categoryId = getCategoryId(cat);
      if (!Number.isFinite(categoryId)) return;

      const categoryNode = categoryMap.get(categoryId);
      const parentId = Number(cat.parent_category_id);
      if (Number.isFinite(parentId) && parentId > 0) {
        const parent = categoryMap.get(parentId);
        if (parent) {
          parent.children.push(categoryNode);
        } else {
          roots.push(categoryNode);
        }
      } else {
        roots.push(categoryNode);
      }
    });

    return roots;
  };

  const flattenCategories = (cats, level = 0) => {
    let flat = [];
    cats.forEach((cat) => {
      flat.push({ ...cat, indent_level: level });
      if (cat.children && cat.children.length > 0) {
        flat = flat.concat(flattenCategories(cat.children, level + 1));
      }
    });
    return flat;
  };

  const { categories, categoriesTree, allCategoriesInTreeOrder } = useMemo(() => {
    let filtered = allCategories;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((cat) => {
        const name = getLocalizedName(cat.category_name);
        const slug = cat.category_slug || '';
        return name.toLowerCase().includes(searchLower) || slug.toLowerCase().includes(searchLower);
      });
    }

    const tree = buildTreeStructure(filtered);
    const fullTree = buildTreeStructure(allCategories);
    return {
      categories: filtered,
      categoriesTree: tree,
      allCategoriesInTreeOrder: flattenCategories(fullTree)
    };
  }, [allCategories, searchTerm, i18n.language]);

  const displayCategories = showTree ? flattenCategories(categoriesTree) : categories;

  const getReportLabels = () => ({
    title: t('categories.list.report.title', { defaultValue: 'Category inventory report' }),
    print: t('categories.list.report.print', { defaultValue: 'Print' }),
    printSelected: t('categories.list.report.printSelected', { defaultValue: 'Print Selected' }),
    exportPdf: t('categories.list.report.exportPdf', { defaultValue: 'Export PDF' }),
    exportSelectedPdf: t('categories.list.report.exportSelectedPdf', { defaultValue: 'Export Selected to PDF' }),
    share: t('categories.list.report.share', { defaultValue: 'Share' }),
    shareSelected: t('categories.list.report.shareSelected', { defaultValue: 'Share Selected' }),
    selectedCount: t('categories.list.report.selectedCount', { count: selectedCount, defaultValue: '{{count}} selected' }),
    preparing: t('categories.list.report.preparing', { defaultValue: 'Preparing report...' }),
    noSelection: t('categories.list.report.noSelection', { defaultValue: 'Select at least one category first.' }),
    generatedAt: t('categories.list.report.generatedAt', { defaultValue: 'Generated at' }),
    categories: t('categories.list.report.categories', { defaultValue: 'Categories' }),
    products: t('categories.list.report.products', { defaultValue: 'products' }),
    productName: t('categories.list.report.columns.productName', { defaultValue: 'Product Name' }),
    warehouse: t('categories.list.report.columns.warehouse', { defaultValue: 'Warehouse' }),
    stockQuantity: t('categories.list.report.columns.stockQuantity', { defaultValue: 'Stock Quantity' }),
    purchasePrice: t('categories.list.report.columns.purchasePrice', { defaultValue: 'Purchase Price (Achat)' }),
    calculatedCost: t('categories.list.report.columns.calculatedCost', { defaultValue: 'Calculated Cost' }),
    sellingPrice: t('categories.list.report.columns.sellingPrice', { defaultValue: 'Selling Price (Vente)' }),
    activeProduct: t('categories.list.report.columns.activeProduct', { defaultValue: 'Active' }),
    active: t('common.active', { defaultValue: 'Active' }),
    inactive: t('common.inactive', { defaultValue: 'Inactive' }),
    activeYes: t('common.yes', { defaultValue: 'Yes' }),
    activeNo: t('common.no', { defaultValue: 'No' }),
    emptyCategory: t('categories.list.report.emptyCategory', { defaultValue: 'No products in this category' }),
    allWarehouses: t('categories.list.report.allWarehouses', { defaultValue: 'All warehouses' }),
    warehouseFallback: t('categories.list.report.warehouseFallback', { defaultValue: 'Warehouse' }),
    selectedFilename: t('categories.list.report.selectedFilename', { defaultValue: 'selected-categories' }),
    page: t('categories.list.report.page', { defaultValue: 'Page' }),
    pageNumbersPrintHint: t('categories.list.report.pageNumbersPrintHint', { defaultValue: 'Page numbers are included when printing or exporting.' }),
    popupBlocked: t('categories.list.report.popupBlocked', { defaultValue: 'Print window was blocked. Please allow pop-ups for this app.' }),
    exportSuccess: t('categories.list.report.exportSuccess', { defaultValue: 'PDF report saved.' }),
    shareSuccess: t('categories.list.report.shareSuccess', { defaultValue: 'Report shared.' }),
    shareFallback: t('categories.list.report.shareFallback', { defaultValue: 'Sharing is not available here. The PDF was saved instead.' }),
    failed: t('categories.list.report.failed', { defaultValue: 'Failed to prepare the report' }),
    shareText: t('categories.list.report.shareText', { defaultValue: 'Category inventory report' })
  });

  const createPrintLoadingHtml = (labels) => `
    <!doctype html>
    <html lang="${i18n.language || 'fr'}" dir="${i18n.dir() === 'rtl' ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8" />
        <title>${labels.title}</title>
        <style>
          body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; color: #111827; }
          .loading { text-align: center; }
          .spinner { width: 28px; height: 28px; margin: 0 auto 16px; border: 3px solid #e5e7eb; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="loading"><div class="spinner"></div><p>${labels.preparing}</p></div>
      </body>
    </html>
  `;

  const getCategoriesForReport = (categoryIds) => {
    const requestedIds = new Set(categoryIds.map(Number));
    const categoryMap = new Map(allCategories.map((category) => [getCategoryId(category), category]));
    const ordered = allCategoriesInTreeOrder.filter((category) => requestedIds.has(getCategoryId(category)));

    categoryIds.forEach((id) => {
      const numericId = Number(id);
      if (!ordered.some((category) => getCategoryId(category) === numericId) && categoryMap.has(numericId)) {
        ordered.push(categoryMap.get(numericId));
      }
    });

    return ordered;
  };

  const prepareInventoryReport = async (categoryIds, labels) => {
    const selectedIds = [...new Set(categoryIds.map(Number).filter(Number.isFinite))];
    if (selectedIds.length === 0) {
      throw new Error(labels.noSelection);
    }

    const reportCategories = getCategoriesForReport(selectedIds);
    const productsByCategory = new Map();

    await Promise.all(reportCategories.map(async (category) => {
      const categoryId = getCategoryId(category);
      const products = await loadProductsForCategory(categoryId);
      productsByCategory.set(categoryId, products);
    }));

    return createInventoryReport({
      categories: reportCategories,
      productsByCategory,
      labels,
      language: i18n.language,
      locale
    });
  };

  const runReportAction = async (categoryIds, action) => {
    const labels = getReportLabels();
    const selectedIds = [...new Set(categoryIds.map(Number).filter(Number.isFinite))];

    if (selectedIds.length === 0) {
      toast.error(labels.noSelection);
      return;
    }

    let printWindow = null;
    if (action === 'print') {
      printWindow = window.open('', '_blank', 'width=1100,height=800');
      if (!printWindow) {
        toast.error(labels.popupBlocked);
        return;
      }
      printWindow.document.open();
      printWindow.document.write(createPrintLoadingHtml(labels));
      printWindow.document.close();
    }

    setReportAction(`${action}:${selectedIds.join(',')}`);

    try {
      const report = await prepareInventoryReport(selectedIds, labels);

      if (action === 'print') {
        printWindow.document.open();
        printWindow.document.write(createInventoryReportHtml(report, { autoPrint: true }));
        printWindow.document.close();
        printWindow.focus();
        return;
      }

      if (action === 'pdf') {
        saveInventoryReportPdf(report);
        toast.success(labels.exportSuccess);
        return;
      }

      if (action === 'share') {
        const blob = createInventoryReportPdfBlob(report);
        const filename = getReportFilename(report);
        const file = new File([blob], filename, { type: 'application/pdf' });
        const canShareFile = Boolean(navigator.share)
          && (!navigator.canShare || navigator.canShare({ files: [file] }));

        if (canShareFile) {
          await navigator.share({
            title: report.title,
            text: labels.shareText,
            files: [file]
          });
          toast.success(labels.shareSuccess);
        } else {
          saveInventoryReportPdf(report);
          toast(labels.shareFallback);
        }
      }
    } catch (err) {
      if (printWindow) printWindow.close();
      console.error('Error preparing category inventory report:', err);
      toast.error(`${labels.failed}: ${err.message}`);
    } finally {
      setReportAction(null);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!await confirm({
      title: t('categories.delete'),
      message: t('categories.list.confirmDelete'),
      confirmText: t('common.delete'),
      isDangerous: true
    })) {
      return;
    }

    try {
      await categoryApi.delete(id);
      await loadData();
      toast.success(t('categories.list.deleted'));
    } catch (err) {
      toast.error(err.message || t('categories.list.deleteFailed'));
    }
  };

  const handleRowClick = (row) => {
    navigate(`/categories/${row.category_id}`);
  };

  const handleEdit = (id) => {
    navigate(`/categories/edit/${id}`);
  };

  const handleCreate = () => {
    navigate('/categories/new');
  };

  const handleSelectAllVisible = (checked) => {
    const visibleIds = displayCategories.map(getCategoryId).filter(Number.isFinite);
    setSelectedCategoryIds((prev) => {
      if (checked) {
        return [...new Set([...prev, ...visibleIds])];
      }
      return prev.filter((id) => !visibleIds.includes(id));
    });
  };

  const handleSelectCategory = (id) => {
    const numericId = Number(id);
    setSelectedCategoryIds((prev) => (
      prev.includes(numericId) ? prev.filter((item) => item !== numericId) : [...prev, numericId]
    ));
  };

  const renderReportActions = (categoryId) => (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); runReportAction([categoryId], 'print'); }}
        className="btn-action btn-report"
        title={t('categories.list.report.print', { defaultValue: 'Print' })}
        aria-label={t('categories.list.report.print', { defaultValue: 'Print' })}
        disabled={reportBusy}
      >
        <Printer size={16} />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); runReportAction([categoryId], 'pdf'); }}
        className="btn-action btn-report"
        title={t('categories.list.report.exportPdf', { defaultValue: 'Export PDF' })}
        aria-label={t('categories.list.report.exportPdf', { defaultValue: 'Export PDF' })}
        disabled={reportBusy}
      >
        <FileText size={16} />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); runReportAction([categoryId], 'share'); }}
        className="btn-action btn-report"
        title={t('categories.list.report.share', { defaultValue: 'Share' })}
        aria-label={t('categories.list.report.share', { defaultValue: 'Share' })}
        disabled={reportBusy}
      >
        <Share2 size={16} />
      </button>
    </>
  );

  const columns = [
    {
      key: 'category_name',
      label: t('categories.list.columns.category'),
      sortable: true,
      render: (value, row) => (
        <div className="category-name-cell" style={{ paddingLeft: `${(row.indent_level || 0) * 20}px` }}>
          {row.indent_level > 0 && <span className="tree-prefix">-- </span>}
          <strong>{getLocalizedName(value)}</strong>
        </div>
      )
    },
    {
      key: 'category_slug',
      label: t('categories.list.columns.slug'),
      render: (value) => <code className="slug-code">{value}</code>
    },
    {
      key: 'parent_category_id',
      label: t('categories.list.columns.parent'),
      render: (value) => {
        if (!value) return <StatusBadge status={t('categories.list.columns.root')} />;
        const parent = allCategories.find((cat) => getCategoryId(cat) === Number(value));
        return parent ? getLocalizedName(parent.category_name) : '-';
      }
    },
    {
      key: 'level',
      label: t('categories.list.columns.level'),
      sortable: true,
      render: (value) => <span className="level-badge">L{value}</span>
    },
    {
      key: 'product_count',
      label: t('categories.list.columns.products'),
      sortable: true,
      render: (value) => (
        <span className={`product-count ${value > 0 ? 'has-products' : 'no-products'}`}>
          {value || 0}
        </span>
      )
    },
    {
      key: 'category_id',
      label: t('categories.list.columns.actions'),
      render: (value, row) => (
        <div className="table-actions category-table-actions">
          <Can permission="products.read">
            {renderReportActions(value)}
          </Can>
          <Can permission="categories.update">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleEdit(value); }}
              className="btn-action btn-edit"
              title={t('categories.list.actions.edit')}
              aria-label={t('categories.list.actions.edit')}
            >
              <Edit size={16} />
            </button>
          </Can>
          <Can permission="categories.delete">
            <button
              type="button"
              onClick={(e) => { handleDelete(value, e); }}
              className="btn-action btn-delete"
              title={t('categories.list.actions.delete')}
              aria-label={t('categories.list.actions.delete')}
              disabled={row.product_count > 0 || (row.children && row.children.length > 0)}
            >
              <Trash2 size={16} />
            </button>
          </Can>
        </div>
      )
    }
  ];

  if (loading) {
    return <div className="loading">{t('categories.list.loading')}</div>;
  }

  if (error) {
    return <ResourceError error={error} onRetry={loadData} />;
  }

  const labels = getReportLabels();

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">{t('categories.list.title')}</h1>
          <p className="page-subtitle">{t('categories.list.subtitle')}</p>
        </div>
        <div className="categories-header-actions">
          <Can permission="categories.create">
            <button onClick={handleCreate} className="btn btn-primary">
              {t('categories.list.new')}
            </button>
          </Can>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">{t('categories.list.stats.total')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.root_categories}</div>
            <div className="stat-label">{t('categories.list.stats.root')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.sub_categories}</div>
            <div className="stat-label">{t('categories.list.stats.sub')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.categories_with_products}</div>
            <div className="stat-label">{t('categories.list.stats.withProducts')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.empty_categories}</div>
            <div className="stat-label">{t('categories.list.stats.empty')}</div>
          </div>
        </div>
      )}

      <div className="filters-section categories-controls">
        <div className="input-group" style={{ maxWidth: '280px' }}>
          <div className="input-group-icon"><Search size={16} /></div>
          <input
            type="text"
            placeholder={t('categories.list.searchPlaceholder') || 'Search by name or slug...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showTree}
              onChange={(e) => setShowTree(e.target.checked)}
            />
            <span>{t('categories.list.showAsTree')}</span>
          </label>
        </div>
      </div>

      <Can permission="products.read">
      <div className="category-report-toolbar" aria-live="polite">
        <span className="selected-count">{labels.selectedCount}</span>
        <div className="category-report-toolbar-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => runReportAction(selectedCategoryIds, 'print')}
            disabled={selectedCount === 0 || reportBusy}
          >
            <Printer size={16} /> {labels.printSelected}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => runReportAction(selectedCategoryIds, 'pdf')}
            disabled={selectedCount === 0 || reportBusy}
          >
            <FileText size={16} /> {labels.exportSelectedPdf}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => runReportAction(selectedCategoryIds, 'share')}
            disabled={selectedCount === 0 || reportBusy}
          >
            <Share2 size={16} /> {labels.shareSelected}
          </button>
        </div>
        {reportBusy && <span className="report-preparing-text">{labels.preparing}</span>}
      </div>
      </Can>

      <div className="content-section">
        <DataTable
          data={displayCategories}
          columns={columns}
          emptyMessage={t('categories.empty') || 'No categories found'}
          onRowClick={handleRowClick}
          selectable
          idField="category_id"
          selectedIds={selectedCategoryIds}
          onSelectAll={handleSelectAllVisible}
          onSelectRow={handleSelectCategory}
        />
      </div>

      <ConfirmationDialog />
    </div>
  );
}
