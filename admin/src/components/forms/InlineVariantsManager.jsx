import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Star, AlertCircle, ChevronDown, ChevronUp, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSkuValidation } from '../../hooks/useSkuValidation';
import { BarcodeManager } from '../BarcodeManager';
import { variantApi, warehouseApi, supplierApi } from '../../services/apiService';
import useConfirmation from '../../hooks/useConfirmation';
import './InlineVariantsManager.css';

/**
 * Unified Variants Manager — works in both Create and Edit modes.
 *
 * Create mode (productId = null):
 *   Pure in-memory. Calls `onChange` so the parent wizard stores variants in formData.
 *   Variants are created server-side AFTER the product is saved.
 *
 * Edit mode (productId set):
 *   Loads variants from API on mount. Every add / edit / delete hits the API immediately
 *   so the user gets instant feedback. Still calls `onChange` to keep formData in sync.
 */
const InlineVariantsManager = ({
    initialVariants = [],
    onChange,
    productId,
    baseSku,
    basePrice,
    baseCost,
    baseWeight,
    defaultWarehouseId
}) => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';
    const isEditMode = !!productId;

    const [variants, setVariants] = useState(initialVariants);
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [editDrafts, setEditDrafts] = useState({});
    const [warehouses, setWarehouses] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const { confirm, ConfirmationDialog } = useConfirmation();
    const autoSaveTimerRef = useRef(null);
    const editDraftsRef = useRef(editDrafts);
    const variantsRef = useRef(variants);

    // Keep refs in sync for use in unmount / timer callbacks
    useEffect(() => { editDraftsRef.current = editDrafts; }, [editDrafts]);
    useEffect(() => { variantsRef.current = variants; }, [variants]);

    const normalizeDraftForApi = useCallback((draft) => {
        if (!draft || typeof draft !== 'object') return {};

        const normalized = { ...draft };
        const integerFields = ['stock', 'warehouse_id', 'supplier_id', 'display_order'];
        const decimalFields = ['current_price', 'sale_price', 'cost_price', 'wholesale_price', 'weight_kg'];

        for (const [key, value] of Object.entries(normalized)) {
            if (value === '') {
                if (key === 'stock' || key === 'display_order') {
                    delete normalized[key];
                } else {
                    normalized[key] = null;
                }
                continue;
            }

            if (integerFields.includes(key) && value !== null && value !== undefined) {
                const parsed = Number.parseInt(value, 10);
                if (Number.isFinite(parsed)) {
                    normalized[key] = parsed;
                } else {
                    delete normalized[key];
                }
            }

            if (decimalFields.includes(key) && value !== null && value !== undefined) {
                const parsed = Number.parseFloat(value);
                normalized[key] = Number.isFinite(parsed) ? parsed : null;
            }
        }

        return normalized;
    }, []);

    // ------------------------------------------------------------------
    // Sync helpers
    // ------------------------------------------------------------------
    const sync = useCallback((next) => {
        setVariants(next);
        onChange?.(next);
    }, [onChange]);

    // ------------------------------------------------------------------
    // Load warehouses & suppliers for dropdowns
    // ------------------------------------------------------------------
    useEffect(() => {
        warehouseApi.getAll()
            .then(res => setWarehouses(res.warehouses || res.data || res || []))
            .catch(() => {});
        supplierApi.getAll()
            .then(res => setSuppliers(res.suppliers || res.data || res || []))
            .catch(() => {});
    }, []);

    // ------------------------------------------------------------------
    // Load variants from API in edit mode
    // ------------------------------------------------------------------
    useEffect(() => {
        if (isEditMode) loadVariants();
    }, [productId]);

    // Keep in sync when parent changes initialVariants (e.g. edit load)
    useEffect(() => {
        if (!isEditMode && initialVariants.length > 0) {
            setVariants(initialVariants);
        }
    }, [initialVariants, isEditMode]);

    const loadVariants = async () => {
        setLoading(true);
        try {
            const data = await variantApi.getVariantsByProductId(productId);
            const loaded = (data.variants || data || []).map(v => ({
                ...v,
                stock: v.stock ?? v.totalStock ?? v.total_stock ?? 0,
            }));
            sync(loaded);
        } catch (error) {
            console.error('Failed to load variants:', error);
        } finally {
            setLoading(false);
        }
    };

    // ------------------------------------------------------------------
    // ADD
    // ------------------------------------------------------------------
    const handleAddVariant = async () => {
        const tempId = `temp_${Date.now()}`;
        const payload = {
            variant_name: '',
            sku: baseSku ? `${baseSku}-V${variants.length + 1}` : '',
            barcode: '',
            current_price: basePrice || '',
            sale_price: '',
            cost_price: baseCost || '',
            wholesale_price: '',
            weight_kg: baseWeight || '',
            stock: 0,
            warehouse_id: defaultWarehouseId || null,
            is_default: variants.length === 0,
            display_order: variants.length + 1
        };

        if (isEditMode) {
            try {
                setSavingId('new');
                const res = await variantApi.createVariant(productId, payload);
                const created = res.variant || res;
                toast.success(t('variants.added', 'Variant added'));
                await loadVariants();
                setExpandedId(created.id);
            } catch (err) {
                toast.error(err.message || t('variants.add_failed', 'Failed to add variant'));
            } finally {
                setSavingId(null);
            }
        } else {
            const newVariant = { id: tempId, ...payload };
            sync([...variants, newVariant]);
            setExpandedId(tempId);
        }
    };

    // ------------------------------------------------------------------
    // UPDATE (inline field change)
    // ------------------------------------------------------------------
    const updateField = (id, field, value) => {
        if (isEditMode) {
            const currentVariant = variantsRef.current.find(v => v.id === id);
            const nextDraft = { [field]: value };
            if (field === 'stock' && currentVariant?.warehouse_id) {
                nextDraft.warehouse_id = currentVariant.warehouse_id;
            }
            // Buffer changes in a draft so we can save on blur / explicit action
            setEditDrafts(prev => ({
                ...prev,
                [id]: { ...(prev[id] || {}), ...nextDraft }
            }));
            // Also update local state for instant UI feedback
            setVariants(prev => {
                const next = prev.map(v => v.id === id ? { ...v, [field]: value } : v);
                onChange?.(next);
                return next;
            });
        } else {
            const updated = variants.map(v => v.id === id ? { ...v, [field]: value } : v);
            sync(updated);
        }
    };

    // Persist buffered draft to API (called on blur / save)
    const flushDraft = async (id) => {
        const draft = editDraftsRef.current[id];
        if (!draft || !isEditMode) return;

        try {
            setSavingId(id);
            const payload = normalizeDraftForApi(draft);
            if (Object.keys(payload).length === 0) {
                setEditDrafts(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
                return;
            }
            const res = await variantApi.updateVariant(id, payload);
            const updated = res?.variant || res;
            setEditDrafts(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
            if (updated && updated.id) {
                setVariants(prev => {
                    const next = prev.map(v => v.id === id ? { ...v, ...updated } : v);
                    onChange?.(next);
                    return next;
                });
            } else {
                await loadVariants();
            }
        } catch (err) {
            toast.error(err.message || t('variants.save_failed', 'Failed to save'));
        } finally {
            setSavingId(null);
        }
    };

    // Flush ALL pending drafts (used on unmount / step change)
    const flushAllDrafts = useCallback(async () => {
        const drafts = editDraftsRef.current;
        const ids = Object.keys(drafts);
        if (!isEditMode || ids.length === 0) return;

        const results = await Promise.allSettled(
            ids.map(async (id) => {
                const payload = normalizeDraftForApi(drafts[id]);
                if (Object.keys(payload).length === 0) {
                    return { id, skipped: true };
                }
                const res = await variantApi.updateVariant(parseInt(id, 10), payload);
                return { id, res };
            })
        );

        const updatesById = new Map();
        const succeededIds = new Set();
        const failedIds = [];
        let needsReload = false;

        results.forEach(result => {
            if (result.status === 'fulfilled') {
                const { id, res, skipped } = result.value || {};
                if (skipped) {
                    succeededIds.add(id);
                    return;
                }

                const updated = res?.variant || res;
                if (updated && updated.id) {
                    updatesById.set(String(id), updated);
                    succeededIds.add(id);
                } else {
                    needsReload = true;
                }
            } else {
                failedIds.push(result.reason);
            }
        });

        if (updatesById.size > 0) {
            setVariants(prev => {
                const next = prev.map(v => {
                    const updated = updatesById.get(String(v.id));
                    return updated ? { ...v, ...updated } : v;
                });
                onChange?.(next);
                return next;
            });
        }

        setEditDrafts(prev => {
            const next = { ...prev };
            succeededIds.forEach(id => delete next[id]);
            return next;
        });

        if (failedIds.length > 0) {
            toast.error(t('variants.save_failed', 'Failed to save'));
        } else if (needsReload && succeededIds.size === ids.length) {
            await loadVariants();
        }
    }, [isEditMode, onChange, loadVariants, normalizeDraftForApi, t]);

    // Debounced auto-save: 2s after last edit
    useEffect(() => {
        if (!isEditMode || Object.keys(editDrafts).length === 0) return;

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            flushAllDrafts();
        }, 2000);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [editDrafts, isEditMode, flushAllDrafts]);

    // Flush pending drafts on unmount (navigating away from Step 2)
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
            const drafts = editDraftsRef.current;
            const ids = Object.keys(drafts);
            if (ids.length > 0) {
                // Fire-and-forget: save whatever is pending
                ids.forEach(id => {
                    const payload = normalizeDraftForApi(drafts[id]);
                    if (Object.keys(payload).length > 0) {
                        variantApi.updateVariant(parseInt(id), payload).catch(() => {});
                    }
                });
            }
        };
    }, [normalizeDraftForApi]);

    // ------------------------------------------------------------------
    // DELETE
    // ------------------------------------------------------------------
    const handleRemove = async (variant) => {
        if (variant.is_default && variants.length > 1) {
            toast.error(t('variants.cannot_delete_default', 'Set another variant as default first'));
            return;
        }

        const confirmed = await confirm({
            title: t('variants.delete_title', 'Delete Variant'),
            message: t('variants.delete_confirm', {
                name: variant.variant_name || `#${variant.display_order}`,
                defaultValue: `Delete "${variant.variant_name || 'this variant'}"?`
            }),
            confirmText: t('common.yes'),
            cancelText: t('common.no'),
            type: 'danger'
        });
        if (!confirmed) return;

        if (isEditMode) {
            try {
                setSavingId(variant.id);
                await variantApi.deleteVariant(variant.id);
                toast.success(t('variants.deleted', 'Variant deleted'));
                await loadVariants();
            } catch (err) {
                toast.error(err.message || t('variants.delete_failed', 'Failed to delete'));
            } finally {
                setSavingId(null);
            }
        } else {
            const filtered = variants.filter(v => v.id !== variant.id);
            if (filtered.length > 0 && !filtered.some(v => v.is_default)) {
                filtered[0].is_default = true;
            }
            sync(filtered);
        }

        if (expandedId === variant.id) setExpandedId(null);
    };

    // ------------------------------------------------------------------
    // SET DEFAULT
    // ------------------------------------------------------------------
    const handleSetDefault = async (id) => {
        if (isEditMode) {
            try {
                setSavingId(id);
                await variantApi.setDefaultVariant(productId, id);
                toast.success(t('variants.default_set', 'Default variant updated'));
                await loadVariants();
            } catch (err) {
                toast.error(err.message || t('variants.default_failed', 'Failed to set default'));
            } finally {
                setSavingId(null);
            }
        } else {
            const updated = variants.map(v => ({ ...v, is_default: v.id === id }));
            sync(updated);
        }
    };

    // ------------------------------------------------------------------
    // SKU helpers
    // ------------------------------------------------------------------
    const generateSku = (id, index) => {
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        const sku = baseSku ? `${baseSku}-V${index + 1}-${rand}` : `VAR-${rand}`;
        updateField(id, 'sku', sku);
    };

    // ------------------------------------------------------------------
    // VALIDATION
    // ------------------------------------------------------------------
    const getIncompleteCount = useCallback(() => {
        return variants.filter(v => !v.variant_name || !v.sku || !v.current_price).length;
    }, [variants]);

    // ------------------------------------------------------------------
    // RENDER
    // ------------------------------------------------------------------
    const toggleExpand = (id) => {
        // Flush previous draft if collapsing
        if (expandedId && expandedId !== id) flushDraft(expandedId);
        setExpandedId(prev => prev === id ? null : id);
    };

    if (loading && variants.length === 0) {
        return (
            <div className="ivm-loading">
                <div className="spinner-small" />
                <span>{t('common.loading', 'Loading variants…')}</span>
            </div>
        );
    }

    return (
        <div className="inline-variants-manager">
            {/* Header */}
            <div className="ivm-header">
                <div className="ivm-header-info">
                    <Package size={18} className="ivm-header-icon" />
                    <div>
                        <h4>{t('variants.title', 'Product Variants')}</h4>
                        <p>{t('variants.subtitle', 'Manage size, color, or material options')}</p>
                    </div>
                </div>
                <div className="ivm-header-actions">
                    {variants.length > 0 && (
                        <span className="ivm-count-badge">{variants.length}</span>
                    )}
                    <button
                        type="button"
                        className="btn-primary btn-sm"
                        onClick={handleAddVariant}
                        disabled={loading || savingId === 'new'}
                    >
                        {savingId === 'new' ? (
                            <><span className="spinner-tiny" /> {t('common.adding', 'Adding…')}</>
                        ) : (
                            <><Plus size={15} /> {t('variants.add', 'Add Variant')}</>
                        )}
                    </button>
                </div>
            </div>

            {/* Empty state */}
            {variants.length === 0 && (
                <div className="ivm-empty">
                    <Package size={32} strokeWidth={1.2} />
                    <p>{t('variants.empty', 'No variants yet. Add your first variant above.')}</p>
                </div>
            )}

            {/* Variant cards */}
            <div className="ivm-list">
                {variants.map((variant, index) => (
                    <VariantCard
                        key={variant.id || index}
                        variant={variant}
                        index={index}
                        isRTL={isRTL}
                        isExpanded={expandedId === variant.id}
                        isSaving={savingId === variant.id}
                        isDirty={isEditMode && !!editDrafts[variant.id]}
                        isEditMode={isEditMode}
                        onToggle={() => toggleExpand(variant.id)}
                        onUpdate={(field, value) => updateField(variant.id, field, value)}
                        onBlur={() => flushDraft(variant.id)}
                        onRemove={() => handleRemove(variant)}
                        onSetDefault={() => handleSetDefault(variant.id)}
                        onGenerateSku={() => generateSku(variant.id, index)}
                        onBarcodeUpdate={(bc) => updateField(variant.id, 'barcode', bc)}
                        t={t}
                        baseSku={baseSku}
                        totalVariants={variants.length}
                        warehouses={warehouses}
                        suppliers={suppliers}
                    />
                ))}
            </div>

            {!isEditMode && variants.length > 0 && getIncompleteCount() > 0 && (
                <div className="ivm-validation-warning">
                    <AlertCircle size={14} />
                    <span>
                        {t('variants.incomplete_warning', {
                            count: getIncompleteCount(),
                            defaultValue: `${getIncompleteCount()} variant(s) missing required fields (name, SKU, or price)`
                        })}
                    </span>
                </div>
            )}

            <ConfirmationDialog />
        </div>
    );
};

// ======================================================================
// VariantCard — collapsible card with compact summary + expanded form
// ======================================================================
const VariantCard = ({
    variant,
    index,
    isRTL,
    isExpanded,
    isSaving,
    isDirty,
    isEditMode,
    onToggle,
    onUpdate,
    onBlur,
    onRemove,
    onSetDefault,
    onGenerateSku,
    onBarcodeUpdate,
    t,
    totalVariants,
    warehouses = [],
    suppliers = []
}) => {
    const { isChecking, isValid, message, validateSku } = useSkuValidation();

    const handleSkuChange = (e) => {
        const val = e.target.value;
        onUpdate('sku', val);
        const numericId = Number(variant.id);
        const excludeVariantId = Number.isFinite(numericId) && !String(variant.id).startsWith('temp_')
            ? numericId
            : null;
        validateSku(val, excludeVariantId ? { excludeVariantId } : undefined);
    };

    const skuStatusClass = (() => {
        if (!variant.sku || variant.sku.length < 3) return '';
        if (isChecking) return 'checking';
        if (isValid === true) return 'valid';
        if (isValid === false) return 'invalid';
        return '';
    })();

    const hasName = !!variant.variant_name;
    const displayName = variant.variant_name || t('variants.unnamed', 'Untitled variant');
    const displayPrice = variant.current_price
        ? `${parseFloat(variant.current_price).toLocaleString()} ${t('common.currency', 'DA')}`
        : '—';

    return (
        <div className={`ivm-card ${variant.is_default ? 'is-default' : ''} ${isExpanded ? 'expanded' : ''} ${isSaving ? 'saving' : ''}`}>
            {/* ---- Collapsed header (always visible) ---- */}
            <div className="ivm-card-header" onClick={onToggle} role="button" tabIndex={0}>
                <div className="ivm-card-left">
                    <span className="ivm-badge">#{index + 1}</span>
                    <div className="ivm-card-summary">
                        <span className={`ivm-card-name ${!hasName ? 'placeholder' : ''}`}>
                            {displayName}
                        </span>
                        <span className="ivm-card-meta">
                            {variant.sku && <code className="ivm-sku">{variant.sku}</code>}
                            <span className="ivm-price">{displayPrice}</span>
                            {variant.stock !== undefined && variant.stock !== '' && (
                                <span className="ivm-stock">
                                    {t('variants.stock_count', { count: variant.stock, defaultValue: `${variant.stock} in stock` })}
                                </span>
                            )}
                            {variant.warehouse_name && (
                                <span className="ivm-warehouse-tag">📦 {variant.warehouse_name}</span>
                            )}
                            {variant.supplier_name && (
                                <span className="ivm-supplier-tag">🏭 {variant.supplier_name}</span>
                            )}
                        </span>
                    </div>
                </div>
                <div className="ivm-card-right">
                    {isDirty && (
                        <span className="ivm-dirty-badge">{t('variants.unsaved', 'Unsaved')}</span>
                    )}
                    {variant.is_default && (
                        <span className="ivm-default-badge">
                            <Star size={12} fill="currentColor" /> {t('common.default', 'Default')}
                        </span>
                    )}
                    {!variant.variant_name || !variant.sku || !variant.current_price ? (
                        <span style={{ color: '#e53e3e', display: 'flex', alignItems: 'center' }}>
                            <AlertCircle size={14} />
                        </span>
                    ) : null}
                    {isSaving && <span className="spinner-tiny" />}
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>

            {/* ---- Expanded body ---- */}
            {isExpanded && (
                <div className="ivm-card-body">
                    {/* Row 1: Name + SKU */}
                    <div className="ivm-fields-row">
                        <div className="ivm-field ivm-field-grow">
                            <label className="required">{t('variants.name_label', 'Variant Name')}</label>
                            <input
                                type="text"
                                value={variant.variant_name}
                                onChange={(e) => onUpdate('variant_name', e.target.value)}
                                onBlur={onBlur}
                                placeholder={t('variants.name_ph', 'e.g. Red / Large / 500g')}
                                autoFocus={!variant.variant_name}
                            />
                        </div>
                        <div className="ivm-field">
                            <label>{t('variants.sku_label', 'SKU')}</label>
                            <div className="ivm-input-action">
                                <input
                                    type="text"
                                    value={variant.sku}
                                    onChange={handleSkuChange}
                                    onBlur={onBlur}
                                    className={skuStatusClass}
                                    placeholder="SKU"
                                />
                                <button type="button" className="ivm-gen-btn" onClick={onGenerateSku} title={t('variants.generate_sku', 'Generate')}>
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
                                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                            {isValid === false && (
                                <span className="ivm-field-error"><AlertCircle size={12} /> {message}</span>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Pricing */}
                    <div className="ivm-fields-row ivm-pricing-row">
                        <div className="ivm-field">
                            <label className="required">{t('variants.price_label', 'Price')}</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={variant.current_price}
                                onChange={(e) => onUpdate('current_price', e.target.value)}
                                onBlur={onBlur}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="ivm-field">
                            <label>{t('variants.sale_label', 'Sale Price')}</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={variant.sale_price}
                                onChange={(e) => onUpdate('sale_price', e.target.value)}
                                onBlur={onBlur}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="ivm-field">
                            <label>{t('variants.cost_label', 'Cost')}</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={variant.cost_price}
                                onChange={(e) => onUpdate('cost_price', e.target.value)}
                                onBlur={onBlur}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="ivm-field">
                            <label>{t('variants.wholesale_label', 'Wholesale')}</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={variant.wholesale_price}
                                onChange={(e) => onUpdate('wholesale_price', e.target.value)}
                                onBlur={onBlur}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Row 3: Stock, Weight, Barcode */}
                    <div className="ivm-fields-row">
                        <div className="ivm-field">
                            <label>{t('variants.stock_label', 'Stock')}</label>
                            <input
                                type="number"
                                min="0"
                                value={variant.stock}
                                onChange={(e) => onUpdate('stock', e.target.value)}
                                onBlur={onBlur}
                                placeholder="0"
                            />
                        </div>
                        <div className="ivm-field">
                            <label>{t('variants.weight_label', 'Weight (kg)')}</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={variant.weight_kg}
                                onChange={(e) => onUpdate('weight_kg', e.target.value)}
                                onBlur={onBlur}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="ivm-field ivm-field-grow">
                            <label>{t('variants.barcode_label', 'Barcode')}</label>
                            {variant.variant_name && variant.sku ? (
                                <BarcodeManager
                                    productId={String(variant.id).startsWith('temp_') ? null : variant.id}
                                    currentBarcode={variant.barcode}
                                    sku={variant.sku}
                                    productName={variant.variant_name}
                                    sellingPrice={variant.current_price}
                                    onBarcodeUpdate={onBarcodeUpdate}
                                    onGenerateBarcode={
                                        !String(variant.id).startsWith('temp_')
                                            ? async () => {
                                                const res = await variantApi.generateBarcode(variant.id);
                                                return res?.barcode || res?.variant?.barcode;
                                            }
                                            : undefined
                                    }
                                    compact={true}
                                    hideInternalLabel={true}
                                />
                            ) : (
                                <div className="ivm-barcode-placeholder">
                                    {t('variants.barcode_hint', 'Enter name & SKU first')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 4: Warehouse & Supplier */}
                    <div className="ivm-fields-row">
                        <div className="ivm-field">
                            <label>{t('variants.warehouse_label', 'Warehouse')}</label>
                            <select
                                value={variant.warehouse_id || ''}
                                onChange={(e) => onUpdate('warehouse_id', e.target.value ? parseInt(e.target.value) : null)}
                                onBlur={onBlur}
                            >
                                <option value="">{t('variants.select_warehouse', '— Select Warehouse —')}</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>
                                        {w.warehouse_name || w.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="ivm-field">
                            <label>{t('variants.supplier_label', 'Supplier')}</label>
                            <select
                                value={variant.supplier_id || ''}
                                onChange={(e) => onUpdate('supplier_id', e.target.value ? parseInt(e.target.value) : null)}
                                onBlur={onBlur}
                            >
                                <option value="">{t('variants.select_supplier', '— Select Supplier —')}</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Actions row */}
                    <div className="ivm-card-actions">
                        <div className="ivm-card-actions-left">
                            {!variant.is_default && totalVariants > 1 && (
                                <button type="button" className="ivm-action-btn default-btn" onClick={onSetDefault}>
                                    <Star size={14} /> {t('variants.make_default', 'Set as Default')}
                                </button>
                            )}
                        </div>
                        <div className="ivm-card-actions-right">
                            {isEditMode && Object.keys(variant).length > 0 && (
                                <button type="button" className="ivm-action-btn save-btn" onClick={onBlur}>
                                    {t('variants.save_changes', 'Save Changes')}
                                </button>
                            )}
                            {(!variant.is_default || totalVariants <= 1) && (
                                <button type="button" className="ivm-action-btn delete-btn" onClick={onRemove}>
                                    <Trash2 size={14} /> {t('common.delete', 'Delete')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InlineVariantsManager;
