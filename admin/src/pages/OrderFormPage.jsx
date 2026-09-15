import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Search, Plus, Trash2, User, Package, MapPin, Calculator, Save, X, Truck, Store, Info, Check, ChevronLeft } from 'lucide-react';
import { userApi, productApi, orderApi, shippingApi } from '../services/apiService';
import { formatCurrency } from '../utils/formatters';
import { normalizeImageUrl } from '../utils/imageUrl';
import './OrderFormPage.css';

function OrderFormPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [selectedUser, setSelectedUser] = useState(null);
    const [orderItems, setOrderItems] = useState([]);

    // Delivery Method: 'home' or 'pickup'
    const [deliveryMethod, setDeliveryMethod] = useState('home');
    const [pickupWarehouseId, setPickupWarehouseId] = useState(1); // 1 = Algiers, 2 = Harrouch

    const [shippingAddress, setShippingAddress] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        address_line1: '',
        address_line_2: '',
        city: '',
        state_province: '',
        postal_code: '',
        country: 'Algeria'
    });
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [deliveryCommuneId, setDeliveryCommuneId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cod');

    // Shipping Data
    const [wilayas, setWilayas] = useState([]);
    const [communes, setCommunes] = useState([]);
    const [selectedWilayaId, setSelectedWilayaId] = useState('');

    // Load Wilayas
    useEffect(() => {
        const loadWilayas = async () => {
            try {
                const res = await shippingApi.getWilayas();
                if (res.success) setWilayas(res.data);
            } catch (error) {
                console.error('Failed to load wilayas', error);
                toast.error(error.message || t('common.error'));
            }
        };
        loadWilayas();
    }, []);

    // Load Communes when Wilaya changes
    useEffect(() => {
        const loadCommunes = async () => {
            if (!selectedWilayaId) {
                setCommunes([]);
                return;
            }
            try {
                const res = await shippingApi.getCommunes(selectedWilayaId);
                if (res.success) setCommunes(res.data);
            } catch (error) {
                console.error('Failed to load communes', error);
            }
        };

        loadCommunes();

        // Update state_province name
        const w = wilayas.find(w => w.id == selectedWilayaId);
        if (w) setShippingAddress(prev => ({ ...prev, state_province: w.name }));

    }, [selectedWilayaId, wilayas]);

    // Search State
    const [userSearch, setUserSearch] = useState('');
    const [userResults, setUserResults] = useState([]);
    const [showUserResults, setShowUserResults] = useState(false);

    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState([]);
    const [showProductResults, setShowProductResults] = useState(false);

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (userSearch.length > 2) searchUsers();
        }, 500);
        return () => clearTimeout(timer);
    }, [userSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (productSearch.length > 2) searchProducts();
        }, 500);
        return () => clearTimeout(timer);
    }, [productSearch]);

    const searchUsers = async () => {
        try {
            // NOTE: userApi.getAll supports 'search' param and returns { users: [...] }
            const res = await userApi.getAll({ search: userSearch, limit: 10 });

            // Robust handling for different API response structures
            const users = res.users || res.data || (Array.isArray(res) ? res : []);

            setUserResults(users);
            setShowUserResults(true);
        } catch (error) {
            console.error('User search failed:', error);
            toast.error(error.message || t('common.error'));
        }
    };

    const searchProducts = async () => {
        try {
            // NOTE: productApi.getAll returns { products: [...] } for admin
            const res = await productApi.getAll({ search: productSearch, limit: 10 });

            // Robust handling for different API response structures
            const products = res.products || res.data || (Array.isArray(res) ? res : []);

            setProductResults(products);
            setShowProductResults(true);
        } catch (error) {
            console.error('Product search failed:', error);
            toast.error(error.message || t('common.error'));
        }
    };

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setUserSearch('');
        setShowUserResults(false);

        // Auto-fill address if available
        setShippingAddress(prev => ({
            ...prev,
            first_name: user.first_name || user.firstName || '',
            last_name: user.last_name || user.lastName || '',
            phone: user.phone || '',
            // Try to find an existing address if user object has it, otherwise default
            // Note: user object might have addresses array if fetched with details
        }));
    };

    const handleAddProduct = (product) => {
        const productImage = normalizeImageUrl(product.image || (product.images && product.images[0]));
        if (orderItems.find(i => i.product_id === product.id)) {
            toast.error(t('orders.manual.validation.productAlreadyAdded'));
            return;
        }

        setOrderItems(prev => [...prev, {
            product_id: product.id,
            name: product.name || product.product_name,
            price: (parseFloat(product.price || product.sale_price) > 0) ? (product.price || product.sale_price) : (product.currentPrice || product.current_price),
            quantity: 1,
            stock: product.stock || product.quantity || 0,
            warehouse_stock: product.warehouse_stock || [],
            sku: product.sku,
            image: productImage
        }]);
        setProductSearch('');
        setShowProductResults(false);
    };

    const updateQuantity = (index, qty) => {
        const newItems = [...orderItems];
        newItems[index].quantity = Math.max(1, parseInt(qty) || 1);
        setOrderItems(newItems);
    };

    const removeProduct = (index) => {
        setOrderItems(orderItems.filter((_, i) => i !== index));
    };

    // Calculations
    const subtotal = useMemo(() => {
        return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }, [orderItems]);

    const shippingCost = useMemo(() => {
        if (deliveryMethod === 'pickup') return 0;
        // Simple logic: Free shipping > 50,000 DA or 500 DA flat
        return subtotal >= 50000 ? 0 : 500;
    }, [subtotal, deliveryMethod]);

    const total = useMemo(() => subtotal + shippingCost, [subtotal, shippingCost]);

    // Auto-select warehouse for pickup based on stock
    useEffect(() => {
        if (deliveryMethod === 'pickup' && orderItems.length > 0) {
            // Check availability in Algiers (1) and Harrouch (2)
            let algiersAvailable = true;
            let harrouchAvailable = true;

            for (const item of orderItems) {
                const stockInAlgiers = item.warehouse_stock?.find(w => w.warehouse_id === 1)?.quantity || 0;
                const stockInHarrouch = item.warehouse_stock?.find(w => w.warehouse_id === 2)?.quantity || 0;

                if (stockInAlgiers < item.quantity) algiersAvailable = false;
                if (stockInHarrouch < item.quantity) harrouchAvailable = false;
            }

            if (algiersAvailable) {
                setPickupWarehouseId(1);
            } else if (harrouchAvailable) {
                setPickupWarehouseId(2);
            }
            // If neither has full stock, keep default (1) or maybe warn user
        }
    }, [deliveryMethod, orderItems]);

    const handleSubmit = async () => {
        if (!selectedUser) {
            toast.error(t('orders.manual.validation.selectCustomer'));
            return;
        }
        if (orderItems.length === 0) {
            toast.error(t('orders.manual.validation.addProduct'));
            return;
        }

        if (deliveryMethod === 'home') {
            if (!shippingAddress.address_line1 || !deliveryCommuneId) {
                toast.error(t('orders.manual.validation.requiredShipping'));
                return;
            }
        }

        setSubmitting(true);
        try {
            const payload = {
                customer_id: selectedUser.id || selectedUser.user_id,
                items: orderItems.map(i => ({
                    product_id: i.product_id,
                    quantity: i.quantity
                })),
                shipping_address: deliveryMethod === 'pickup' ? null : shippingAddress,
                delivery_notes: deliveryNotes,
                delivery_commune_id: deliveryCommuneId,
                payment_method: paymentMethod,
                delivery_type: deliveryMethod,
                pickup_warehouse_id: pickupWarehouseId
            };

            const res = await orderApi.createManual(payload);
            if (res.success || res.status === 201) { // Check both potential success indicators
                toast.success(t('orders.manual.success.created'));
                // Ideally redirect to the order details, but for now products list or orders list
                const orderId = res.data?.id || res.id;
                if (orderId) {
                    navigate(`/orders/${orderId}`);
                } else {
                    navigate('/orders');
                }
            }
        } catch (error) {
            console.error('Create order error:', error);
            toast.error(error.message || t('orders.manual.errors.createFailed'));
        } finally {
            setSubmitting(false);
        }
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.search-wrapper')) {
                setShowUserResults(false);
                setShowProductResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="order-form-page">
            <div className="order-form-header">
                <div className="header-left">
                    <button onClick={() => navigate('/orders')} className="back-button" title={t('common.back')}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className="page-title-section">
                        <h1>{t('orders.manual.title')}</h1>
                        <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>
                            {t('orders.manual.subtitle')}
                        </p>
                    </div>
                </div>
                <div className="form-actions">
                    <button className="btn-secondary" onClick={() => navigate('/orders')}>
                        <X size={18} />
                        {t('common.cancel')}
                    </button>
                    <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                        <Save size={18} />
                        {submitting ? t('common.processing') : t('orders.manual.submit')}
                    </button>
                </div>
            </div>

            <div className="form-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px' }}>

                {/* LEFT COLUMN */}
                <div className="form-column">

                    {/* Products Section */}
                    <div className="form-section">
                        <h2 className="section-title">
                            <Package size={18} />
                            {t('table.items')}
                        </h2>

                        <div className="search-wrapper product-search-bar">
                            <div className="input-group" style={{ flex: 1 }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    className="form-input"
                                    style={{ paddingLeft: '40px' }}
                                    placeholder={t('orders.manual.productSearchPlaceholder')}
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    onFocus={() => productSearch.length > 2 && setShowProductResults(true)}
                                />
                            </div>
                            {showProductResults && productResults.length > 0 && (
                                <div className="search-results-dropdown" style={{ top: '45px' }}>
                                    {productResults.map(product => (
                                        <div key={product.id} className="search-result-item" onClick={() => handleAddProduct(product)}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <img
                                                    src={normalizeImageUrl(product.image || (product.images && product.images[0])) || '/placeholder.png'}
                                                    alt=""
                                                    style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                                                    onError={(e) => e.target.src = '/placeholder.png'}
                                                />
                                                <div>
                                                    <div className="font-medium">{product.name || product.product_name}</div>
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                        {t('orders.manual.stockLabel')}: {product.stock ?? product.quantity}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="font-bold text-primary">
                                                {formatCurrency((parseFloat(product.price || product.sale_price) > 0) ? (product.price || product.sale_price) : (product.currentPrice || product.current_price))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <table className="order-items-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50%' }}>{t('orders.manual.table.product')}</th>
                                    <th>{t('orders.manual.table.price')}</th>
                                    <th>{t('orders.manual.table.qty')}</th>
                                    <th>{t('orders.manual.table.total')}</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                                            {t('orders.manual.emptyItems')}
                                        </td>
                                    </tr>
                                ) : (
                                    orderItems.map((item, index) => (
                                        <tr key={index}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    {item.image && (
                                                        <img src={item.image} style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} onError={(e) => e.target.src = '/placeholder.png'} />
                                                    )}
                                                    <div>
                                                        <div className="font-medium">{item.name}</div>
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{item.sku}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{formatCurrency(item.price)}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="form-input quantity-input"
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(index, e.target.value)}
                                                />
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{formatCurrency(item.price * item.quantity)}</td>
                                            <td>
                                                <button className="remove-btn" onClick={() => removeProduct(index)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Delivery & Shipping Section */}
                    <div className="form-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                            <h2 className="section-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                                <Truck size={18} />
                                {t('orders.manual.delivery.title')}
                            </h2>

                            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                                <button
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        background: deliveryMethod === 'home' ? 'white' : 'transparent',
                                        color: deliveryMethod === 'home' ? '#2563eb' : '#64748b',
                                        boxShadow: deliveryMethod === 'home' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                                    }}
                                    onClick={() => setDeliveryMethod('home')}
                                >
                                    {t('orders.manual.delivery.home')}
                                </button>
                                <button
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        background: deliveryMethod === 'pickup' ? 'white' : 'transparent',
                                        color: deliveryMethod === 'pickup' ? '#2563eb' : '#64748b',
                                        boxShadow: deliveryMethod === 'pickup' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                                    }}
                                    onClick={() => setDeliveryMethod('pickup')}
                                >
                                    {t('orders.manual.delivery.pickup')}
                                </button>
                            </div>
                        </div>

                        {deliveryMethod === 'pickup' ? (
                            <div style={{ padding: '20px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                    <Store className="text-blue-600" size={24} style={{ marginTop: '4px' }} />
                                    <div>
                                        <h3 style={{ margin: '0 0 8px 0', color: '#1e3a8a', fontSize: '16px', fontWeight: 600 }}>{t('orders.manual.pickup.selectedTitle')}</h3>
                                        <p style={{ margin: '0 0 16px 0', color: '#1e40af', fontSize: '14px' }}>
                                            {t('orders.manual.pickup.selectedDesc')}
                                        </p>

                                        <label className="form-label" style={{ color: '#1e40af', marginBottom: '8px', display: 'block' }}>
                                            {t('orders.manual.pickup.selectWarehouse')}
                                        </label>
                                        <select
                                            className="form-select"
                                            style={{ maxWidth: '300px' }}
                                            value={pickupWarehouseId}
                                            onChange={(e) => setPickupWarehouseId(e.target.value)}
                                        >
                                            <option value="1">{t('orders.manual.pickup.warehouse.algiers')}</option>
                                            <option value="2">{t('orders.manual.pickup.warehouse.harrouch')}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">{t('orders.manual.shipping.firstName')}</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={shippingAddress.first_name}
                                        onChange={(e) => setShippingAddress({ ...shippingAddress, first_name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('orders.manual.shipping.lastName')}</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={shippingAddress.last_name}
                                        onChange={(e) => setShippingAddress({ ...shippingAddress, last_name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('orders.manual.shipping.phone')}</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={shippingAddress.phone}
                                        onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('orders.manual.shipping.address1')}</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={shippingAddress.address_line1}
                                        onChange={(e) => setShippingAddress({ ...shippingAddress, address_line1: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('orders.manual.shipping.wilaya')}</label>
                                    <select
                                        className="form-select"
                                        value={selectedWilayaId}
                                        onChange={(e) => setSelectedWilayaId(e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                    >
                                        <option value="">{t('orders.manual.shipping.selectWilaya')}</option>
                                        {wilayas.map(w => (
                                            <option key={w.id} value={w.id}>{w.id} - {w.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('orders.manual.shipping.commune')}</label>
                                    <select
                                        className="form-select"
                                        value={deliveryCommuneId}
                                        onChange={(e) => {
                                            const cId = e.target.value;
                                            setDeliveryCommuneId(cId);
                                            const c = communes.find(i => i.id == cId);
                                            if (c) setShippingAddress(prev => ({ ...prev, city: c.name }));
                                        }}
                                        disabled={!selectedWilayaId}
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                    >
                                        <option value="">{t('orders.manual.shipping.selectCommune')}</option>
                                        {communes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                                {t('orders.manual.deliveryNotes.label')}
                            </label>
                            <textarea
                                className="form-textarea"
                                rows="2"
                                placeholder={t('orders.manual.deliveryNotes.placeholder')}
                                value={deliveryNotes}
                                onChange={(e) => setDeliveryNotes(e.target.value)}
                            />
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN - Summary & Customer */}
                <div className="form-column">

                    {/* Customer Selection */}
                    <div className="form-section">
                        <h2 className="section-title">
                            <User size={18} />
                            {t('orders.manual.customer.title')}
                        </h2>

                        {!selectedUser ? (
                            <div className="search-wrapper">
                                <div className="input-group">
                                    <Search size={18} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                                    <input
                                        type="text"
                                        className="form-input"
                                        style={{ paddingLeft: '40px' }}
                                        placeholder={t('orders.manual.customer.searchPlaceholder')}
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        onFocus={() => userSearch.length > 2 && setShowUserResults(true)}
                                    />
                                </div>
                                {showUserResults && userResults.length > 0 && (
                                    <div className="search-results-dropdown">
                                        {userResults.map(user => (
                                            <div key={user.id} className="search-result-item" onClick={() => handleSelectUser(user)}>
                                                <div>
                                                    <div className="font-medium">{user.username || user.first_name ? `${user.first_name} ${user.last_name || ''}` : t('orders.manual.customer.unnamed')}</div>
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{user.email || t('orders.manual.customer.noEmail')}</div>
                                                </div>
                                                <Plus size={16} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Fallback msg if typing but no results */}
                                {userSearch.length > 2 && showUserResults && userResults.length === 0 && (
                                    <div className="search-results-dropdown" style={{ padding: '12px', color: '#64748b', textAlign: 'center' }}>
                                        {t('orders.manual.customer.noResults')}
                                    </div>
                                )}

                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                                    <Info size={12} style={{ marginRight: '4px' }} />
                                    {t('orders.manual.customer.searchHint')}
                                </div>
                            </div>
                        ) : (
                            <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '8px', padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>
                                            {selectedUser.username || `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`}
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#1e40af' }}>{selectedUser.email}</div>
                                        <div style={{ fontSize: '13px', color: '#1e40af' }}>{selectedUser.phone}</div>
                                    </div>
                                    <button
                                        style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                                        onClick={() => setSelectedUser(null)}
                                    >
                                        {t('orders.manual.customer.change')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Payment Method */}
                    <div className="form-section">
                        <h2 className="section-title">
                            <Calculator size={18} />
                            {t('orders.manual.payment.title')}
                        </h2>
                        <div style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                            {t('orders.manual.payment.cod')}
                        </div>
                        <input type="hidden" value="cod" />
                    </div>

                    {/* Order Totals Summary */}
                    <div className="form-section sticky-summary" style={{ position: 'sticky', top: '20px' }}>
                        <h2 className="section-title">{t('orders.manual.summary.title')}</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                <span>{t('orders.manual.summary.subtotal')}</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                                <span>{t('orders.manual.summary.shipping')}</span>
                                <span>
                                    {deliveryMethod === 'pickup' ? (
                                        <span style={{ color: '#16a34a', fontWeight: 500 }}>{t('orders.manual.summary.freePickup')}</span>
                                    ) : (
                                        subtotal >= 50000 ? <span style={{ color: '#16a34a' }}>{t('orders.manual.summary.free')}</span> : formatCurrency(shippingCost)
                                    )}
                                </span>
                            </div>

                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>{t('orders.manual.summary.total')}</span>
                                <span style={{ fontWeight: 700, fontSize: '20px', color: '#2563eb' }}>{formatCurrency(total)}</span>
                            </div>

                            <button
                                className="btn-primary"
                                style={{ justifyContent: 'center', marginTop: '16px', padding: '12px' }}
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                <Save size={20} />
                                {submitting ? t('common.processing') : t('orders.manual.submit')}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default OrderFormPage;
