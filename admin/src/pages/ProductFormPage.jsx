import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { productApi, variantApi } from '../services/apiService';
import { WizardContainer } from '../components/forms/ProductWizard';
import { PostCreationBarcodeModal } from '../components/PostCreationBarcodeModal';
import { normalizeImageUrl } from '../utils/imageUrl';
import './ProductFormPage.css';

const toSafeInt = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumVariantStock = (variants = []) => {
  return variants.reduce((total, variant) => total + toSafeInt(variant?.stock ?? variant?.totalStock ?? variant?.total_stock), 0);
};

const toOptionalFloat = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeOptionalId = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizeVariantId = (id) => {
  if (!id || String(id).startsWith('temp_')) return null;
  return normalizeOptionalId(id);
};

function ProductFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id) && id !== 'new';

  const [loading, setLoading] = useState(isEdit);
  const [initialData, setInitialData] = useState(null);
  const [barcode, setBarcode] = useState('');
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [createdProduct, setCreatedProduct] = useState(null);

  useEffect(() => {
    if (isEdit) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      const [product, variantsData] = await Promise.all([
        productApi.getById(id),
        variantApi.getVariantsByProductId(id).catch(() => ({ variants: [] }))
      ]);
      const loadedVariants = variantsData.variants || variantsData || [];
      const computedStockFromVariants = loadedVariants.length > 0 ? sumVariantStock(loadedVariants) : null;

      const parsedTags = Array.isArray(product.tags)
        ? product.tags
        : (typeof product.tags === 'string'
          ? product.tags.split(',').map(t => t.trim()).filter(Boolean)
          : []);

      // Transform product data to wizard format
      setInitialData({
        // Step 1: Basic Info
        name: product.name || product.product_name || '',
        sku: product.sku || '',
        serialNumber: product.serialNumber || product.serial_number || '',
        brand: product.brand || '',
        categoryId: product.categoryId || product.category_id || null,
        supplierId: product.supplierId || product.supplier_id || null,
        modelNumber: product.modelNumber || product.model_number || '',

        // Step 2: Pricing & Inventory
        costPrice: product.costPrice || product.cost_price || '',
        wholesalePrice: product.wholesalePrice || product.wholesale_price || '',
        productFees: product.productFees ?? product.product_fees ?? '',
        currentPrice: product.currentPrice || product.price || product.current_price || '',
        salePrice: product.salePrice || product.sale_price || product.originalPrice || '',
        warehouseId: product.warehouseId || product.warehouse_id || 1,
        stock: computedStockFromVariants !== null
          ? computedStockFromVariants
          : (product.stock !== undefined ? product.stock : (product.quantity || '')),
        reorderLevel: product.reorderLevel || product.lowStockThreshold || product.reorder_level || 5,
        weight: product.weight || product.weight_kg || '',
        length: product.length || product.length_cm || '',
        width: product.width || product.width_cm || '',
        height: product.height || product.height_cm || '',
        warrantyMonths: product.warrantyMonths || product.warranty_months || 12,

        // Step 3: Details & Media
        shortDescription: product.shortDescription || product.short_description || '',
        fullDescription: product.fullDescription || product.description || '',
        images: product.images?.map((img, idx) => {
          // Handle both string URLs and object formats
          const imageUrl = typeof img === 'string' ? img : (img.url || img.image_url);
          const normalizedUrl = normalizeImageUrl(imageUrl);
          return {
            id: typeof img === 'string' ? `db-${idx}` : (img.id || `uploaded-${idx}`),
            url: normalizedUrl,
            image_url: normalizedUrl,
            altText: (typeof img === 'string' ? product.name : img.altText) || img.alt_text || product.name,
            displayOrder: (typeof img === 'object' ? img.displayOrder : null) || idx + 1
          };
        }).filter(img => img.url) || [],
        // Transform specs or attributes to editable array
        // Prefer rawAttributes (bilingual) then fallback to attributes array
        attributes: product.rawAttributes ?
          product.rawAttributes.map((attr, idx) => ({
            name: attr.attribute_name, // Bilingual object { fr: "...", ar: "..." }
            value: attr.attribute_value,
            displayOrder: attr.display_order || idx + 1
          })) : product.attributes ?
            product.attributes.map((attr, idx) => ({
              name: attr.attribute_name || { fr: attr.name || '', ar: '' },
              value: attr.attribute_value || attr.value || '',
              displayOrder: attr.display_order || idx + 1
            })) :
            (product.specifications || product.specs) ?
              Object.entries(product.specifications || product.specs).map(([name, value], idx) => ({
                name: { fr: name, ar: '' }, // Convert to bilingual format
                value,
                displayOrder: idx + 1
              })) : [],
        tags: parsedTags,
        metaTitle: product.metaTitle || product.meta_title || '',
        metaDescription: product.metaDescription || product.meta_description || '',
        isActive: product.isActive !== undefined ? product.isActive : (product.status === 'active'),
        featured: product.featured || product.is_featured || false,

        // Variants
        variants: loadedVariants,
        hasVariants: loadedVariants.length > 0
      });
      setBarcode(product.barcode || '');
    } catch (error) {
      console.error('Failed to load product:', error);
      toast.error(t('common.error'));
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (wizardFormData) => {
    try {
      const hasVariants = wizardFormData.hasVariants && Array.isArray(wizardFormData.variants) && wizardFormData.variants.length > 0;
      const normalizedVariants = hasVariants
        ? wizardFormData.variants.map((v, index) => ({
          ...(normalizeVariantId(v.id) ? { id: normalizeVariantId(v.id) } : {}),
          variant_name: v.variant_name,
          sku: v.sku,
          barcode: v.barcode,
          current_price: toOptionalFloat(v.current_price),
          sale_price: toOptionalFloat(v.sale_price),
          cost_price: toOptionalFloat(v.cost_price),
          wholesale_price: toOptionalFloat(v.wholesale_price),
          weight_kg: toOptionalFloat(v.weight_kg),
          stock: toSafeInt(v.stock ?? v.totalStock ?? v.total_stock),
          warehouse_id: normalizeOptionalId(v.warehouse_id ?? v.warehouseId) || normalizeOptionalId(wizardFormData.warehouseId),
          supplier_id: normalizeOptionalId(v.supplier_id ?? v.supplierId),
          is_default: v.is_default || index === 0,
          display_order: v.display_order || index + 1
        }))
        : [];
      const computedStock = hasVariants
        ? sumVariantStock(normalizedVariants)
        : toSafeInt(wizardFormData.stock);

      // Transform wizard data to API format (matches backend expectations)
      const productData = {
        // Step 1: Basic Info
        name: wizardFormData.name,
        sku: wizardFormData.sku,
        brand: wizardFormData.brand?.trim().toUpperCase() || undefined,
        serialNumber: wizardFormData.serialNumber || undefined,
        categoryId: wizardFormData.categoryId,
        supplierId: Number.isFinite(wizardFormData.supplierId) && wizardFormData.supplierId > 0
          ? wizardFormData.supplierId
          : undefined,
        modelNumber: wizardFormData.modelNumber || undefined,

        // Step 2: Pricing & Inventory
        currentPrice: parseFloat(wizardFormData.currentPrice) || 0,
        costPrice: wizardFormData.costPrice ? parseFloat(wizardFormData.costPrice) : undefined,
        wholesalePrice: wizardFormData.wholesalePrice ? parseFloat(wizardFormData.wholesalePrice) : undefined,
        productFees: wizardFormData.productFees !== '' && wizardFormData.productFees !== null && wizardFormData.productFees !== undefined ? parseFloat(wizardFormData.productFees) : 0,
        salePrice: (wizardFormData.salePrice && parseFloat(wizardFormData.salePrice) > 0) ? parseFloat(wizardFormData.salePrice) : undefined,
        warehouseId: wizardFormData.warehouseId || 1,
        stock: computedStock,
        reorderLevel: parseInt(wizardFormData.reorderLevel) || 5,
        weight: wizardFormData.weight ? parseFloat(wizardFormData.weight) : undefined,
        length: wizardFormData.length ? parseFloat(wizardFormData.length) : undefined,
        width: wizardFormData.width ? parseFloat(wizardFormData.width) : undefined,
        height: wizardFormData.height ? parseFloat(wizardFormData.height) : undefined,
        warrantyMonths: parseInt(wizardFormData.warrantyMonths) || 12,

        // Step 3: Details & Media
        shortDescription: wizardFormData.shortDescription || '',
        fullDescription: wizardFormData.fullDescription || '',
        images: (wizardFormData.images || []).map((img, idx) => ({
          url: normalizeImageUrl(img.url || img.image_url),
          image_url: normalizeImageUrl(img.url || img.image_url),
          altText: img.altText || img.alt_text,
          displayOrder: img.displayOrder || idx + 1
        })).filter(img => img.url),
        attributes: wizardFormData.attributes || [],
        tags: wizardFormData.tags || [],
        metaTitle: wizardFormData.metaTitle || '',
        metaDescription: wizardFormData.metaDescription || '',
        isActive: wizardFormData.isActive,
        featured: wizardFormData.featured || false,

        // Legacy fields for compatibility
        price: parseFloat(wizardFormData.currentPrice) || 0,
        originalPrice: (wizardFormData.salePrice && parseFloat(wizardFormData.salePrice) > 0) ? parseFloat(wizardFormData.salePrice) : undefined,
        description: wizardFormData.fullDescription || '',
        lowStockThreshold: parseInt(wizardFormData.reorderLevel) || 5,
        status: wizardFormData.isActive ? 'active' : 'inactive',
        image: normalizeImageUrl(wizardFormData.images?.[0]?.url) || '/products/placeholder.jpg',
        inStock: computedStock > 0,
        ...(hasVariants ? { variants: normalizedVariants } : {})
      };

      let result;
      if (isEdit) {
        result = await productApi.update(id, productData);
        navigate('/products');
      } else {
        // Create product and capture response with barcode
        result = await productApi.create(productData);
        const newProduct = result?.product || result;

        setCreatedProduct(newProduct);
        setBarcode(result?.barcode || newProduct?.barcode || '');
        setShowBarcodeModal(true);
      }
    } catch (error) {
      console.error('Failed to save product:', error);
      toast.error(error.message || t('common.error'));
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/products');
  };

  const handleBarcodeModalClose = () => {
    setShowBarcodeModal(false);
    navigate('/products');
  };

  const handleViewProductDetails = () => {
    if (createdProduct?.id) {
      setShowBarcodeModal(false);
      navigate(`/products/${createdProduct.id}`);
    }
  };

  if (loading) {
    return (
      <div className="product-form-page">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="product-form-page">
      {showBarcodeModal && createdProduct && (
        <PostCreationBarcodeModal
          product={createdProduct}
          onClose={handleBarcodeModalClose}
          onViewProduct={handleViewProductDetails}
        />
      )}
      <WizardContainer
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isEdit={isEdit}
        initialData={initialData}
        productId={isEdit ? id : null}
        barcode={barcode}
        onBarcodeUpdate={(newBarcode) => setBarcode(newBarcode)}
      />
    </div>
  );
}

export default ProductFormPage;
