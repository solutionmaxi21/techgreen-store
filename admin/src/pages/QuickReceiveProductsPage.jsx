import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useConfirmation from '../hooks/useConfirmation';
import { X, Plus, Save, AlertCircle, CheckCircle2, Package, Printer } from 'lucide-react';
import { metadataApi, productApi } from '../services/apiService';
import { printSingleBarcode } from '../lib/barcodePrinting.js';
import './QuickReceiveProductsPage.css';

// Helper to extract string from bilingual object or return as-is
const getLocalizedValue = (value, locale = 'fr') => {
  if (!value) return 'N/A';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && (value.fr || value.ar)) {
    return value[locale] || value.fr || value.ar || 'N/A';
  }
  return String(value);
};

function QuickReceiveProductsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language === 'ar' ? 'ar' : 'fr';

  const [loading, setLoading] = useState(true);
  const { confirm, ConfirmationDialog } = useConfirmation();
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [barcodeGeneration, setBarcodeGeneration] = useState({ loading: false, data: null, error: null });

  // Initial empty rows (start with 10 rows)
  const [products, setProducts] = useState(Array.from({ length: 10 }, (_, i) => ({
    id: `row-${i}`,
    sku: '',
    name: '',
    categoryId: '',
    supplierId: '',
    quantity: '',
    warehouseId: '',
    costPrice: '',
    currentPrice: ''
  })));

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    setLoading(true);
    try {
      const [categoriesData, warehousesData, suppliersData] = await Promise.all([
        metadataApi.getCategories(),
        metadataApi.getWarehouses(),
        metadataApi.getSuppliers()
      ]);

      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
    } catch (error) {
      console.error('Failed to load metadata:', error);
      toast.error(t('quickReceive.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (rowId, field, value) => {
    setProducts(products.map(p =>
      p.id === rowId ? { ...p, [field]: value } : p
    ));
  };

  const addMoreRows = () => {
    const newRows = Array.from({ length: 5 }, (_, i) => ({
      id: `row-${Date.now()}-${i}`,
      sku: '',
      name: '',
      categoryId: '',
      supplierId: '',
      quantity: '',
      warehouseId: '',
      costPrice: '',
      currentPrice: ''
    }));
    setProducts([...products, ...newRows]);
  };

  const removeRow = (rowId) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== rowId));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Filter out empty rows
    const validProducts = products.filter(p =>
      p.sku.trim() && p.name.trim() && p.categoryId && p.warehouseId
    );

    if (validProducts.length === 0) {
      toast.error(t('quickReceive.pleaseSelectMinimum'));
      return;
    }

    setSubmitting(true);
    setResults(null);

    try {
      // Transform to backend format
      const payload = {
        products: validProducts.map(p => ({
          sku: p.sku.trim(),
          name: p.name.trim(),
          categoryId: parseInt(p.categoryId),
          supplierId: p.supplierId ? parseInt(p.supplierId) : null,
          quantity: parseInt(p.quantity || 0),
          warehouseId: parseInt(p.warehouseId),
          costPrice: p.costPrice ? parseFloat(p.costPrice) : null,
          currentPrice: p.currentPrice ? parseFloat(p.currentPrice) : 0
        }))
      };

      const response = await productApi.bulkReceive(payload.products);

      setResults(response.results);

      // Show success message
      toast.success(`${t('quickReceive.successProcessing')}! ${response.message}`);

      // Reset form or navigate to incomplete products
      if (response.results.summary.created > 0) {
        const goToIncomplete = await confirm({
          title: t('quickReceive.incompleteTitle'),
          message: `${t('quickReceive.incompletePrompt')}`,
          confirmText: t('common.yes'),
          cancelText: t('common.no'),
          type: 'warning'
        });

        if (goToIncomplete) {
          navigate('/products/incomplete');
        } else {
          // Reset form
          setProducts(Array.from({ length: 10 }, (_, i) => ({
            id: `row-${Date.now()}-${i}`,
            sku: '',
            name: '',
            categoryId: '',
            supplierId: '',
            quantity: '',
            warehouseId: '',
            costPrice: '',
            currentPrice: ''
          })));
          setResults(null);
        }
      }
    } catch (error) {
      console.error('Bulk receive failed:', error);
      toast.error(t('quickReceive.failedToProcess') + ': ' + (error.message || t('common.unknown_error')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateBarcodesForCreated = async () => {
    if (!results) return;
    const createdIds = (results.successful || [])
      .filter(item => item.action === 'created' && item.productId)
      .map(item => item.productId);

    if (createdIds.length === 0) {
      setBarcodeGeneration({ loading: false, data: null, error: t('quickReceive.newProductsNeedBarcodes') });
      return;
    }

    setBarcodeGeneration({ loading: true, data: null, error: null });
    try {
      const response = await productApi.batchGenerateBarcodes(createdIds);
      const generated = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response?.results)
            ? response.results
            : Array.isArray(response?.data?.results)
              ? response.data.results
              : [];

      setBarcodeGeneration({ loading: false, data: generated, error: null });
    } catch (error) {
      setBarcodeGeneration({ loading: false, data: null, error: error?.message || t('barcode_scanner.error_generic') });
    }
  };

  const handlePrintBarcodeLabel = async (item) => {
    if (!item?.barcode) return;
    try {
      await printSingleBarcode({
        barcode: item.barcode,
        price: item.selling_price,
        productName: item.product_name || item.productName || item.sku
      });
    } catch (err) {
      toast.error(t('quickReceive.failedToPrint') + (err?.message ? `: ${err.message}` : ''));
    }
  };

  return (
    <div className="quick-receive-page">
      <div className="page-header">
        <div className="header-content">
          <Package className="page-icon" size={32} />
          <div>
            <h1>{t('quickReceive.title')}</h1>
            <p className="page-description">
              {t('quickReceive.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {loading && <div className="loading-overlay">{t('common.loading')}...</div>}

      {results && (
        <div className="results-summary">
          <div className="summary-cards">
            <div className="summary-card success">
              <CheckCircle2 size={24} />
              <div>
                <div className="card-value">{results.summary.created}</div>
                <div className="card-label">{t('quickReceive.created')}</div>
              </div>
            </div>
            <div className="summary-card info">
              <Package size={24} />
              <div>
                <div className="card-value">{results.summary.updated}</div>
                <div className="card-label">{t('quickReceive.stockUpdated')}</div>
              </div>
            </div>
            {results.summary.errors > 0 && (
              <div className="summary-card error">
                <AlertCircle size={24} />
                <div>
                  <div className="card-value">{results.summary.errors}</div>
                  <div className="card-label">{t('quickReceive.errors')}</div>
                </div>
              </div>
            )}
          </div>

          {results.failed.length > 0 && (
            <div className="failed-items">
              <h3>{t('quickReceive.failedItems')}</h3>
              <ul>
                {results.failed.map((item, idx) => (
                  <li key={idx}>
                    <strong>SKU {item.sku}:</strong> {item.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {results && results.summary.created > 0 && (
        <div className="results-summary" style={{ marginTop: '12px' }}>
          <div className="summary-cards">
            <div className="summary-card info">
              <Printer size={24} />
              <div>
                <div className="card-value">{results.summary.created}</div>
                <div className="card-label">{t('quickReceive.newProductsNeedBarcodes')}</div>
              </div>
            </div>
          </div>
          <div className="barcode-actions-row" style={{ marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGenerateBarcodesForCreated}
              disabled={barcodeGeneration.loading}
            >
              {barcodeGeneration.loading ? t('quickReceive.generating') : t('quickReceive.generateBarcodes')}
            </button>
          </div>

          {barcodeGeneration.error && (
            <div className="failed-items">
              <h3>{t('quickReceive.barcodeGeneration')}</h3>
              <p>{barcodeGeneration.error}</p>
            </div>
          )}

          {barcodeGeneration.data && barcodeGeneration.data.length > 0 && (
            <div className="failed-items">
              <h3>{t('quickReceive.generatedBarcodes')}</h3>
              <ul>
                {barcodeGeneration.data.map((item, idx) => (
                  <li key={item.product_id || item.productId || item.sku || idx}>
                    <strong>{item.sku}</strong> — {item.barcode || t('quickReceive.noBarcodeCreated')}
                    {item.success === false && item.error && (
                      <span> — {item.error}</span>
                    )}
                    {item.barcode && item.success !== false && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ marginLeft: '8px' }}
                        onClick={() => handlePrintBarcodeLabel(item)}
                      >
                        <Printer size={16} /> {t('quickReceive.print')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="receive-form">
        <div className="form-instructions">
          <AlertCircle size={20} />
          <p>
            {t('quickReceive.requiredFields')}: <strong>{t('table.sku')}, {t('table.product')}, {t('table.category')}, {t('inventory.list.columns.warehouse')}</strong>.
            {' '}{t('quickReceive.productsIncomplete')}
          </p>
        </div>

        <div className="table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th className="col-action">#</th>
                <th className="col-sku">{t('quickReceive.tableHeaders.sku')} *</th>
                <th className="col-name">{t('quickReceive.tableHeaders.product')} *</th>
                <th className="col-category">{t('quickReceive.tableHeaders.category')} *</th>
                <th className="col-supplier">{t('quickReceive.tableHeaders.supplier')}</th>
                <th className="col-quantity">{t('quickReceive.tableHeaders.quantity')}</th>
                <th className="col-warehouse">{t('quickReceive.tableHeaders.warehouse')} *</th>
                <th className="col-price">{t('quickReceive.tableHeaders.costPrice')}</th>
                <th className="col-price">{t('quickReceive.tableHeaders.salePrice')}</th>
                <th className="col-action"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, idx) => (
                <tr key={product.id}>
                  <td className="row-number">{idx + 1}</td>
                  <td>
                    <input
                      type="text"
                      value={product.sku}
                      onChange={(e) => handleFieldChange(product.id, 'sku', e.target.value)}
                      placeholder="SKU-001"
                      className="input-sku"
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={product.name}
                      onChange={(e) => handleFieldChange(product.id, 'name', e.target.value)}
                      placeholder={t('quickReceive.productNamePlaceholder')}
                      className="input-name"
                      required
                    />
                  </td>
                  <td>
                    <select
                      value={product.categoryId}
                      onChange={(e) => handleFieldChange(product.id, 'categoryId', e.target.value)}
                      className="input-select"
                      required
                    >
                      <option value="">{t('quickReceive.selectPlaceholder')}</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {getLocalizedValue(cat.name, locale)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={product.supplierId}
                      onChange={(e) => handleFieldChange(product.id, 'supplierId', e.target.value)}
                      className="input-select"
                    >
                      <option value="">{t('quickReceive.nonePlaceholder')}</option>
                      {suppliers.map(sup => (
                        <option key={sup.id} value={sup.id}>
                          {getLocalizedValue(sup.name, locale)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={product.quantity}
                      onChange={(e) => handleFieldChange(product.id, 'quantity', e.target.value)}
                      placeholder="0"
                      min="0"
                      className="input-number"
                    />
                  </td>
                  <td>
                    <select
                      value={product.warehouseId}
                      onChange={(e) => handleFieldChange(product.id, 'warehouseId', e.target.value)}
                      className="input-select"
                      required
                    >
                      <option value="">{t('quickReceive.selectPlaceholder')}</option>
                      {warehouses.map(wh => (
                        <option key={wh.warehouse_id} value={wh.warehouse_id}>
                          {getLocalizedValue(wh.warehouse_name, locale)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={product.costPrice}
                      onChange={(e) => handleFieldChange(product.id, 'costPrice', e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="input-number"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={product.currentPrice}
                      onChange={(e) => handleFieldChange(product.id, 'currentPrice', e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="input-number"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeRow(product.id)}
                      className="btn-remove"
                      disabled={products.length === 1}
                      title={t('quickReceive.removeRow')}
                    >
                      <X size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={addMoreRows}
            className="btn btn-secondary"
          >
            <Plus size={20} />
            {t('quickReceive.addRowsLabel')}
          </button>

          <div className="primary-actions">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="btn btn-outline"
              disabled={submitting}
            >
              {t('quickReceive.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              <Save size={20} />
              {submitting ? t('quickReceive.processing') : t('quickReceive.receiveProducts')}
            </button>
          </div>
        </div>
      </form>
      {/* Confirmation Modal */}
      <ConfirmationDialog />
    </div>
  );
}

export default QuickReceiveProductsPage;
