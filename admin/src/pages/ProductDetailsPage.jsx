import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import useConfirmation from '../hooks/useConfirmation';
import { BarcodeManager } from '../components/BarcodeManager';
import Can from '../components/Can';
import ResourceError from '../components/ResourceError';
import {
    Edit, Trash2, ChevronLeft, Package, Tag, Layers,
    BarChart2, DollarSign, Calendar, AlertCircle, CheckCircle,
    Copy, MoreHorizontal, Printer, Archive, Star, Link2, Download
} from 'lucide-react';
import { productApi, variantApi } from '../services/apiService';
import { getLocalizedText } from '../utils/localization';
import { getPrimaryProductImageUrl, normalizeImageList, normalizeImageUrl } from '../utils/imageUrl';
import { STOREFRONT_ORIGIN } from '../config/backend';
import './ProductDetailsPage.css';
import { sanitizeRichHtml } from '../utils/sanitizeHtml';

const dedupeImages = (images) => [...new Set(images.filter(Boolean))];

const IMAGE_FILE_REGEX = /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i;

const isRenderableImageSrc = (value) => {
    if (!value || typeof value !== 'string') return false;

    const src = value.trim();
    if (!src) return false;

    const lowered = src.toLowerCase();
    if (lowered === 'null' || lowered === 'undefined' || lowered === 'nan' || lowered === '[object object]') {
        return false;
    }

    if (lowered.startsWith('data:image/')) return true;
    if (src.startsWith('/uploads/') || src.startsWith('uploads/')) return true;

    if (src.startsWith('http://') || src.startsWith('https://')) {
        try {
            const url = new URL(src);
            const pathname = url.pathname || '';
            return pathname.includes('/uploads/') || IMAGE_FILE_REGEX.test(pathname);
        } catch {
            return false;
        }
    }

    return IMAGE_FILE_REGEX.test(src);
};

const slugify = (text) => {
    if (!text) return '';

    return String(text)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '')
        .trim();
};

const getLocalizedProductNameForUrl = (name, locale) => {
    if (typeof name === 'string') return name;
    if (!name || typeof name !== 'object') return '';

    return locale === 'ar'
        ? name.ar || name.fr || ''
        : name.fr || name.ar || '';
};

const buildProductSlug = (name, productId, locale = 'fr') => {
    const localizedName = getLocalizedProductNameForUrl(name, locale);
    const slugBase = slugify(localizedName);
    return slugBase ? `${slugBase}-${productId}` : String(productId);
};

const getPublicProductId = (product, fallbackId) => {
    const value = product?.product_id ?? product?.productId ?? product?.id ?? fallbackId;
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && value !== '' ? numericValue : value;
};

const buildProductUrl = (product, fallbackId, locale) => {
    const productId = getPublicProductId(product, fallbackId);
    if (!productId) return '';

    const normalizedLocale = locale === 'ar' ? 'ar' : 'fr';
    const productName = product?.product_name ?? product?.name ?? product?.title;
    const slug = buildProductSlug(productName, productId, normalizedLocale);

    return `${STOREFRONT_ORIGIN}/${normalizedLocale}/product/${slug}`;
};

const copyTextToClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();

    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (!copied) {
        throw new Error('Copy command failed');
    }
};

const IMAGE_EXTENSION_BY_TYPE = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
    'image/avif': 'avif'
};

const getImageExtension = (imageUrl, contentType = '') => {
    const normalizedType = contentType.toLowerCase().split(';')[0];
    if (IMAGE_EXTENSION_BY_TYPE[normalizedType]) {
        return IMAGE_EXTENSION_BY_TYPE[normalizedType];
    }

    const dataMatch = String(imageUrl).match(/^data:image\/([^;,]+)/i);
    if (dataMatch?.[1]) {
        return dataMatch[1] === 'jpeg' ? 'jpg' : dataMatch[1];
    }

    try {
        const { pathname } = new URL(imageUrl, window.location.href);
        const pathMatch = pathname.match(/\.([a-z0-9]+)$/i);
        if (pathMatch?.[1]) {
            return pathMatch[1].toLowerCase() === 'jpeg' ? 'jpg' : pathMatch[1].toLowerCase();
        }
    } catch {
        // Fall back to jpg below when URL parsing is not possible.
    }

    return 'jpg';
};

const triggerFileDownload = (href, filename) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const getProductImageFileBaseName = (product, index, locale) => {
    const productId = getPublicProductId(product);
    const productName = product?.product_name ?? product?.name ?? product?.title;
    const localizedName = getLocalizedProductNameForUrl(productName, locale);
    const nameSlug = slugify(localizedName) || 'product';
    const idPart = productId ? `-${productId}` : '';
    return `${nameSlug}${idPart}-image-${index + 1}`;
};

const downloadImageFile = async (imageUrl, fileBaseName) => {
    const fallbackExtension = getImageExtension(imageUrl);

    if (String(imageUrl).startsWith('data:image/')) {
        triggerFileDownload(imageUrl, `${fileBaseName}.${fallbackExtension}`);
        return;
    }

    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Image download failed with status ${response.status}`);
        }

        const blob = await response.blob();
        const extension = getImageExtension(imageUrl, blob.type);
        const objectUrl = URL.createObjectURL(blob);
        triggerFileDownload(objectUrl, `${fileBaseName}.${extension}`);
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
        triggerFileDownload(imageUrl, `${fileBaseName}.${fallbackExtension}`);
    }
};

const downloadProductImages = async (imageUrls, product, locale) => {
    for (let index = 0; index < imageUrls.length; index += 1) {
        const fileBaseName = getProductImageFileBaseName(product, index, locale);
        await downloadImageFile(imageUrls[index], fileBaseName);
        if (index < imageUrls.length - 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 120));
        }
    }
};

const ProductDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [activeTab, setActiveTab] = useState('overview');
    const [variants, setVariants] = useState([]);
    const [loadError, setLoadError] = useState(null);
    const [variantsError, setVariantsError] = useState(null);
    const { confirm, ConfirmationDialog } = useConfirmation();

    useEffect(() => {
        loadProduct();
    }, [id]);

    const loadProduct = async () => {
        setLoading(true);
        setLoadError(null);
        setVariantsError(null);
        try {
            const data = await productApi.getById(id);
            setProduct(data);
            try {
                const varData = await variantApi.getVariantsByProductId(id);
                setVariants(varData.variants || varData || []);
            } catch (e) {
                setVariantsError(e);
            }
        } catch (error) {
            console.error('Failed to load product:', error);
            setLoadError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        navigate(`/products/${id}/edit`);
    };

    const handleDelete = async () => {
        if (await confirm({
            title: t('products.delete'),
            message: t('products.delete_confirm'),
            confirmText: t('common.delete'),
            isDangerous: true
        })) {
            try {
                await productApi.delete(id);
                navigate('/products');
            } catch (error) {
                console.error('Failed to delete product:', error);
                const errorMessage = error?.message || t('products.delete_failed');
                toast.error(errorMessage);
            }
        }
    };

    if (loading) {
        return (
            <div className="product-details-page">
                <div className="loading-state">{t('common.loading')}</div>
            </div>
        );
    }

    if (loadError || !product) {
        return (
            <div className="product-details-page">
                <button className="btn-back" onClick={() => navigate('/products')}>
                    {isRTL ? '←' : '←'} {t('common.back')}
                </button>
                <ResourceError error={loadError} onRetry={loadProduct} />
            </div>
        );
    }

    // Helper to format currency
    const formatPrice = (price) => {
        return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-DZ' : 'fr-DZ', {
            style: 'currency',
            currency: 'DZD'
        }).format(price);
    };

    // Helper for status badge style
    const getStatusColor = (status) => {
        const statusMap = {
            active: 'success',
            inactive: 'neutral',
            archived: 'warning'
        };
        return statusMap[status] || 'neutral';
    };

    // Calculate profit margin
    const calculateProfitMargin = () => {
        if (!product.costPrice || !product.price) return null;
        const cost = parseFloat(product.costPrice);
        const price = parseFloat(product.price);
        const fees = parseFloat(product.productFees) || 0;
        const landedCost = cost + fees;
        if (landedCost === 0) return null;
        return ((price - landedCost) / landedCost * 100).toFixed(2);
    };

    const calculateProfit = () => {
        if (!product.costPrice || !product.price) return null;
        const cost = parseFloat(product.costPrice);
        const price = parseFloat(product.price);
        const fees = parseFloat(product.productFees) || 0;
        return (price - (cost + fees)).toFixed(2);
    };

    const profitMargin = calculateProfitMargin();
    const profitAmount = calculateProfit();
    const hasValue = (value) => value !== null && value !== undefined && value !== '';
    const pickValue = (...values) => values.find(hasValue);

    const productWeight = pickValue(product.weightKg, product.weight_kg, product.weight);
    const productLength = pickValue(product.lengthCm, product.length_cm);
    const productWidth = pickValue(product.widthCm, product.width_cm);
    const productHeight = pickValue(product.heightCm, product.height_cm);
    const warrantyMonths = pickValue(product.warrantyMonths, product.warranty_months);
    const lowStockThreshold = pickValue(product.lowStockThreshold, product.low_stock_threshold);
    const productFeeTotal = parseFloat(product.productFees) || 0;
    const landedCost = (parseFloat(product.costPrice) || 0) + productFeeTotal;
    const hasPhysicalInfo = hasValue(productWeight)
        || hasValue(productLength)
        || hasValue(productWidth)
        || hasValue(productHeight)
        || hasValue(product.dimensions)
        || hasValue(warrantyMonths);

    const galleryImages = dedupeImages([
        ...normalizeImageList(product.images),
        ...normalizeImageList(product.product_images),
        ...normalizeImageList(product.image),
        ...normalizeImageList(product.image_url),
        ...normalizeImageList(product.imageUrl)
    ]).filter(isRenderableImageSrc);
    const primaryCandidate = getPrimaryProductImageUrl(product);
    const primaryImage = isRenderableImageSrc(primaryCandidate) ? primaryCandidate : null;
    const currentImageIndex = selectedImage < galleryImages.length ? selectedImage : 0;
    const selectedImageUrl = galleryImages[currentImageIndex] || galleryImages[0] || primaryImage;
    const productImageUrls = dedupeImages([primaryImage, ...galleryImages].filter(Boolean)).filter(isRenderableImageSrc);
    const publicLocale = i18n.language?.startsWith('ar') ? 'ar' : 'fr';
    const productUrl = buildProductUrl(product, id, publicLocale);
    const productLinkLabel = t('products.copy_product_link');

    const handleCopyProductLink = async () => {
        if (!productUrl) {
            toast.error(t('products.product_link_unavailable'));
            return;
        }

        try {
            await copyTextToClipboard(productUrl);
            toast.success(t('products.product_link_copied'));
        } catch (error) {
            console.error('Failed to copy product link:', error);
            toast.error(t('products.product_link_copy_failed'));
        }
    };

    const handleDownloadProductImages = async () => {
        if (productImageUrls.length === 0) {
            toast.error(t('products.product_images_unavailable'));
            return;
        }

        try {
            await downloadProductImages(productImageUrls, product, publicLocale);
            toast.success(t('products.product_images_download_started', { count: productImageUrls.length }));
        } catch (error) {
            console.error('Failed to download product images:', error);
            toast.error(t('products.product_images_download_failed'));
        }
    };

    return (
        <div className="product-details-page">
            <div className="details-header">
                <div className="header-left">
                    <button className="back-button" onClick={() => navigate('/products')} title={t('common.back')}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className="page-title-section">
                        <h1>{getLocalizedText(product.name)}</h1>
                        <div className="p-meta">
                            <span className="sku-badge">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <path d="M12 4v16"></path>
                                </svg>
                                {product.sku}
                            </span>
                            {product.status && (
                                <span className={`status-badge ${getStatusColor(product.status)}`}>
                                    {t(`common.${product.status}`)}
                                </span>
                            )}
                            {productUrl && (
                                <button
                                    type="button"
                                    className="product-link-button"
                                    onClick={handleCopyProductLink}
                                    title={`${productLinkLabel}: ${productUrl}`}
                                    aria-label={productLinkLabel}
                                >
                                    <Link2 size={15} strokeWidth={2.2} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="header-actions">
                    <Can permission="products.delete">
                        <button className="btn-secondary" onClick={handleDelete}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}>
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                            </svg>
                            {t('common.delete')}
                        </button>
                    </Can>
                    <Can permission="products.update">
                        <button className="btn-primary" onClick={handleEdit}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}>
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            {t('common.edit')}
                        </button>
                    </Can>
                </div>
            </div>

            <div className="details-grid">
                {/* Main Content Column */}
                <div className="main-content">
                    {/* Key Stats Card */}
                    <div className="details-card">
                        <h3 className="card-title">{t('wizard.review.sections.basic')}</h3>
                        <div className="stats-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div className="stat-item" style={{ flex: '1 1 140px', minWidth: 0 }}>
                                <span className="stat-label">{t('wizard.review.labels.current')}</span>
                                <span className="stat-value price" style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.5rem)', wordBreak: 'break-all' }}>{formatPrice(product.price)}</span>
                            </div>
                            <div className="stat-item" style={{ flex: '1 1 140px', minWidth: 0 }}>
                                <span className="stat-label">{t('wizard.review.labels.cost')}</span>
                                <span className="stat-value" style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.5rem)', wordBreak: 'break-all' }}>{product.costPrice ? formatPrice(product.costPrice) : '-'}</span>
                            </div>
                            <div className="stat-item" style={{ flex: '1 1 140px', minWidth: 0 }}>
                                <span className="stat-label">{t('products.detail.productFees')}</span>
                                <span className="stat-value" style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.5rem)', wordBreak: 'break-all' }}>{formatPrice(productFeeTotal)}</span>
                            </div>
                            <div className="stat-item" style={{ flex: '1 1 140px', minWidth: 0 }}>
                                <span className="stat-label">{t('products.detail.totalCost')}</span>
                                <span className="stat-value" style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.5rem)', wordBreak: 'break-all' }}>{formatPrice(landedCost)}</span>
                            </div>
                            {hasValue(product.wholesalePrice) && (
                                <div className="stat-item" style={{ flex: '1 1 140px', minWidth: 0 }}>
                                    <span className="stat-label">{t('products.detail.wholesalePrice')}</span>
                                    <span className="stat-value" style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.5rem)', wordBreak: 'break-all' }}>{formatPrice(product.wholesalePrice)}</span>
                                </div>
                            )}
                            <div className="stat-item" style={{ flex: '1 1 100px', minWidth: 0 }}>
                                <span className="stat-label">{t('wizard.review.labels.stock')}</span>
                                <span className={`stat-value ${product.stock <= product.lowStockThreshold ? 'text-warning' : ''}`} style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.5rem)' }}>
                                    {product.stock} {t('products.units')}
                                </span>
                            </div>
                        </div>
                        {/* Profit Information */}
                        {profitMargin !== null && (
                            <div className="stats-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color, #e5e7eb)' }}>
                                <div className="stat-item" style={{ flex: '1 1 140px', minWidth: 0 }}>
                                    <span className="stat-label">{t('products.detail.profitPerUnit')}</span>
                                    <span className={`stat-value ${parseFloat(profitAmount) > 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.5rem)', wordBreak: 'break-all' }}>
                                        {formatPrice(profitAmount)}
                                    </span>
                                </div>
                                <div className="stat-item" style={{ flex: '1 1 100px', minWidth: 0 }}>
                                    <span className="stat-label">{t('products.detail.profitMargin')}</span>
                                    <span className={`stat-value ${parseFloat(profitMargin) > 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.5rem)' }}>
                                        {profitMargin}%
                                    </span>
                                </div>
                                <div className="stat-item" style={{ flex: '1 1 100px', minWidth: 0 }}>
                                    <span className="stat-label">{t('products.detail.lowStockAlert')}</span>
                                    <span className="stat-value" style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.5rem)' }}>
                                        {lowStockThreshold ?? '-'} {t('products.units')}
                                    </span>
                                </div>
                            </div>
                        )}
                        <div className="review-subsection" style={{ marginTop: '1rem' }}>
                            <h4>{t('products.detail.productFees')}</h4>
                            <dl className="review-list" style={{ gridTemplateColumns: '1fr' }}>
                                <div className="review-item">
                                    <dt>{t('products.detail.totalFees')}</dt>
                                    <dd>{formatPrice(productFeeTotal)}</dd>
                                </div>
                            </dl>
                        </div>
                        {product.shortDescription && (
                            <p className="description-content">{product.shortDescription}</p>
                        )}
                    </div>

                    {variantsError && (
                        <ResourceError error={variantsError} onRetry={loadProduct} />
                    )}

                    {/* Product Variants Card */}
                    {!variantsError && variants.length > 0 && (
                        <div className="details-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 className="card-title" style={{ margin: 0 }}>
                                    <Package size={18} style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                                    {t('variants.title', 'Product Variants')}
                                    <span style={{
                                        marginLeft: '0.5rem',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        background: 'var(--primary-color, #0366d6)',
                                        color: '#fff',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        verticalAlign: 'middle'
                                    }}>{variants.length}</span>
                                </h3>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--border-color, #e5e7eb)' }}>
                                            <th style={{ textAlign: 'left', padding: '0.625rem 0.75rem', fontWeight: 600, color: 'var(--gray-600, #6b7280)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {t('variants.name_label', 'Variant')}
                                            </th>
                                            <th style={{ textAlign: 'left', padding: '0.625rem 0.75rem', fontWeight: 600, color: 'var(--gray-600, #6b7280)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                SKU
                                            </th>
                                            <th style={{ textAlign: 'right', padding: '0.625rem 0.75rem', fontWeight: 600, color: 'var(--gray-600, #6b7280)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {t('table.price', 'Price')}
                                            </th>
                                            <th style={{ textAlign: 'right', padding: '0.625rem 0.75rem', fontWeight: 600, color: 'var(--gray-600, #6b7280)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {t('table.stock', 'Stock')}
                                            </th>
                                            <th style={{ textAlign: 'center', padding: '0.625rem 0.75rem', fontWeight: 600, color: 'var(--gray-600, #6b7280)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {t('common.default', 'Default')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {variants.map((v) => (
                                            <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)', transition: 'background 0.15s' }}>
                                                <td style={{ padding: '0.75rem', fontWeight: 500, color: 'var(--text-color, #111827)' }}>
                                                    {v.variant_name || v.variantName || '—'}
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <code style={{ fontSize: '0.8rem', background: 'var(--gray-100, #f3f4f6)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                                                        {v.sku || '—'}
                                                    </code>
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                                                    {v.current_price != null ? formatPrice(v.current_price) : '—'}
                                                    {v.sale_price != null && (
                                                        <div style={{ fontSize: '0.75rem', color: '#e53e3e', fontWeight: 400 }}>
                                                            {t('wizard.step2.sale_label', 'Sale')}: {formatPrice(v.sale_price)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '2px 8px',
                                                        borderRadius: '9999px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 500,
                                                        background: (v.total_stock || v.totalStock || 0) > 0 ? '#d1fae5' : '#fee2e2',
                                                        color: (v.total_stock || v.totalStock || 0) > 0 ? '#065f46' : '#991b1b'
                                                    }}>
                                                        {v.total_stock ?? v.totalStock ?? 0}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    {(v.is_default || v.isDefault) ? (
                                                        <Star size={16} fill="#0366d6" stroke="#0366d6" />
                                                    ) : null}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Physical Specifications Card */}
                    {hasPhysicalInfo && (
                        <div className="details-card">
                            <h3 className="card-title">{t('products.detail.physicalWarranty')}</h3>
                            <div className="attributes-grid">
                                {hasValue(productWeight) && (
                                    <div className="attribute-item">
                                        <span className="attr-label">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }}>
                                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                            </svg>
                                            {t('products.detail.weight')}
                                        </span>
                                        <span className="attr-value">{productWeight} kg</span>
                                    </div>
                                )}
                                {(hasValue(productLength) || hasValue(productWidth) || hasValue(productHeight)) && (
                                    <div className="attribute-item">
                                        <span className="attr-label">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }}>
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                <line x1="3" y1="9" x2="21" y2="9"></line>
                                                <line x1="9" y1="21" x2="9" y2="9"></line>
                                            </svg>
                                            {t('products.detail.dimensions')}
                                        </span>
                                        <span className="attr-value">
                                            {productLength ?? '?'} × {productWidth ?? '?'} × {productHeight ?? '?'} cm
                                        </span>
                                    </div>
                                )}
                                {hasValue(product.dimensions) && !hasValue(productLength) && (
                                    <div className="attribute-item">
                                        <span className="attr-label">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }}>
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                            </svg>
                                            {t('products.detail.dimensions')}
                                        </span>
                                        <span className="attr-value">{product.dimensions}</span>
                                    </div>
                                )}
                                {hasValue(warrantyMonths) && (
                                    <div className="attribute-item">
                                        <span className="attr-label">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }}>
                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                            </svg>
                                            {t('products.detail.warranty')}
                                        </span>
                                        <span className="attr-value">{t('products.detail.monthCount', { count: warrantyMonths })}</span>
                                    </div>
                                )}
                                {product.featured !== undefined && (
                                    <div className="attribute-item">
                                        <span className="attr-label">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }}>
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                            </svg>
                                            {t('products.detail.featured')}
                                        </span>
                                        <span className="attr-value">
                                            <span className={`status-badge ${product.featured ? 'success' : 'neutral'}`}>
                                                {product.featured ? t('common.yes') : t('common.no')}
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Product Tags */}
                    {product.tags && (
                        <div className="details-card">
                            <h3 className="card-title">{t('products.detail.tags')}</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {(typeof product.tags === 'string' ? product.tags.split(',') : product.tags).map((tag, index) => (
                                    <span key={index} className="status-badge neutral" style={{ fontSize: '0.875rem' }}>
                                        {tag.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Description Card */}
                    <div className="details-card">
                        <h3 className="card-title">{t('wizard.review.sections.desc')}</h3>
                        <div
                            className="description-content"
                            dangerouslySetInnerHTML={{
                                __html: sanitizeRichHtml(
                                    getLocalizedText(product.description) || t('wizard.review.values.no_desc')
                                )
                            }}
                        />
                    </div>

                    {/* Specifications Card */}
                    {product.specifications && Object.keys(product.specifications).length > 0 && (
                        <div className="details-card">
                            <h3 className="card-title">{t('wizard.review.sections.specs')}</h3>
                            <div className="attributes-grid">
                                {Object.entries(product.specifications).map(([key, value]) => (
                                    <div key={key} className="attribute-item">
                                        <span className="attr-label">{getLocalizedText(key)}</span>
                                        <span className="attr-value">{getLocalizedText(value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Column */}

                {/* Sidebar Column */}
                <div className="sidebar-content">
                    {/* Images Card */}
                    <div className="details-card">
                        <h3 className="card-title">{t('wizard.review.sections.images')}</h3>
                        <div className="gallery-section">
                            <div className="main-image">
                                {productImageUrls.length > 0 && (
                                    <button
                                        type="button"
                                        className="product-link-button image-download-button"
                                        onClick={handleDownloadProductImages}
                                        title={t('products.download_product_images', { count: productImageUrls.length })}
                                        aria-label={t('products.download_product_images', { count: productImageUrls.length })}
                                    >
                                        <Download size={15} strokeWidth={2.2} />
                                    </button>
                                )}
                                {selectedImageUrl ? (
                                    <img
                                        src={selectedImageUrl}
                                        alt={getLocalizedText(product.name)}
                                        onError={(e) => {
                                            console.error('Image failed to load:', selectedImageUrl);
                                            e.target.src = normalizeImageUrl('/uploads/products/placeholder.jpg') || '/uploads/products/placeholder.jpg';
                                        }}
                                    />
                                ) : (
                                    <svg className="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                        <polyline points="21 15 16 10 5 21"></polyline>
                                    </svg>
                                )}
                            </div>
                            {galleryImages.length > 1 && (
                                <div className="thumbnail-list">
                                    {galleryImages.map((img, index) => (
                                        <div
                                            key={index}
                                            className={`thumbnail ${currentImageIndex === index ? 'active' : ''}`}
                                            onClick={() => setSelectedImage(index)}
                                        >
                                            <img
                                                src={img}
                                                alt={`${t('wizard.review.sections.images')} ${index + 1}`}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Organization Card */}
                    <div className="details-card">
                        <h3 className="card-title">{t('wizard.review.sections.settings')}</h3>
                        <div className="metadata-list">
                            <div className="meta-row">
                                <span className="meta-label">{t('wizard.review.labels.category')}</span>
                                <span className="meta-value">{getLocalizedText(product.category) || t('common.unknown')}</span>
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">{t('wizard.review.labels.brand')}</span>
                                <span className="meta-value">{getLocalizedText(product.brand) || t('common.unknown')}</span>
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">{t('wizard.review.labels.supplier')}</span>
                                <span className="meta-value">{product.supplier || t('common.unknown')}</span>
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">{t('wizard.review.labels.model')}</span>
                                <span className="meta-value">{product.model_number || product.modelNumber || '-'}</span>
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">{t('products.detail.serialNumber')}</span>
                                <span className="meta-value" style={{ fontFamily: 'monospace' }}>
                                    {product.serialNumber || product.serial_number || '-'}
                                </span>
                            </div>
                            {product.slug && (
                                <div className="meta-row">
                                    <span className="meta-label">{t('products.detail.slug')}</span>
                                    <span className="meta-value" style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{product.slug}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SEO Information */}
                    {(product.metaTitle || product.meta_title || product.metaDescription || product.meta_description) && (
                        <div className="details-card">
                            <h3 className="card-title">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }}>
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="m21 21-4.35-4.35"></path>
                                </svg>
                                {t('products.detail.seo')}
                            </h3>
                            <div className="metadata-list">
                                {(product.metaTitle || product.meta_title) && (
                                    <div className="meta-row">
                                        <span className="meta-label">{t('products.detail.metaTitle')}</span>
                                        <span className="meta-value">{product.metaTitle || product.meta_title}</span>
                                    </div>
                                )}
                                {(product.metaDescription || product.meta_description) && (
                                    <div className="meta-row">
                                        <span className="meta-label">{t('products.detail.metaDescription')}</span>
                                        <span className="meta-value" style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
                                            {product.metaDescription || product.meta_description}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Barcode Information */}
                    <Can permission="products.barcode.manage">
                        <div className="details-card" style={{ overflow: 'hidden' }}>
                            <h3 className="card-title">{t('Barcode')}</h3>
                            <div style={{ width: '100%', overflowX: 'auto' }}>
                                <BarcodeManager
                                    productId={product.id}
                                    currentBarcode={product.barcode}
                                    sku={product.sku}
                                    productName={getLocalizedText(product.name)}
                                    sellingPrice={product.selling_price ?? product.price ?? product.currentPrice ?? product.current_price ?? product.sale_price ?? product.originalPrice}
                                    onBarcodeUpdate={(code) => setProduct(prev => prev ? { ...prev, barcode: code } : prev)}
                                    isLoading={loading}
                                    compact={false}
                                />
                            </div>
                        </div>
                    </Can>

                    {/* System Info Card */}
                    <div className="details-card">
                        <h3 className="card-title">{t('settings.stats.title')}</h3>
                        <div className="metadata-list">
                            <div className="meta-row">
                                <span className="meta-label">{t('table.placed_on')}</span>
                                <span className="meta-value">
                                    {product.createdAt ? new Date(product.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-DZ' : 'fr-DZ') : '-'}
                                </span>
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">{t('orderStatus.update')}</span>
                                <span className="meta-value">
                                    {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-DZ' : 'fr-DZ') : '-'}
                                </span>
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">ID</span>
                                <span className="meta-value">{product.id}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Confirmation Modal */}
            <ConfirmationDialog />
        </div>
    );
};

export default ProductDetailsPage;
