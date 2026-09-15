// ============================================
// DATABASE ADAPTER - Connects Admin to JSON Database
// ============================================
// This adapter loads data from the database folder and transforms it
// to match the existing mockDatabase structure for backward compatibility

import categories from '../../../database/catalog/categories.json';
import suppliers from '../../../database/catalog/suppliers.json';
import products from '../../../database/catalog/products.json';
import productAttributes from '../../../database/catalog/product-attributes.json';
import productImages from '../../../database/catalog/product-images.json';

import warehouses from '../../../database/inventory/warehouses.json';
import stock from '../../../database/inventory/stock.json';

import users from '../../../database/users/users.json';
import addresses from '../../../database/users/addresses.json';
import favorites from '../../../database/users/favorites.json';

import orders from '../../../database/orders/orders.json';
import orderItems from '../../../database/orders/order-items.json';
import orderHistory from '../../../database/orders/order-history.json';

import reviews from '../../../database/reviews/reviews.json';
import returns from '../../../database/returns/returns.json';
import returnItems from '../../../database/returns/return-items.json';
import promotions from '../../../database/promotions/promotions.json';

// ============================================
// Transform Functions
// ============================================

/**
 * Transform new database products to old mockDatabase format
 */
const transformProducts = () => {
  return products.map(product => {
    const category = categories.find(c => c.category_id === product.category_id);
    const productStock = stock.find(s => s.product_id === product.product_id);
    const images = productImages.filter(img => img.product_id === product.product_id);
    const attrs = productAttributes.filter(attr => attr.product_id === product.product_id);

    // Transform to old format
    return {
      id: `prod-${String(product.product_id).padStart(3, '0')}`,
      sku: product.sku,
      name: product.product_name,
      brand: product.brand,
      category: category?.category_name || 'Uncategorized',
      category_id: product.category_id, // For edit form
      supplier_id: product.supplier_id, // For edit form
      model_number: product.model_number, // For edit form
      warehouse_id: productStock?.warehouse_id || 1, // For edit form
      price: product.sale_price || product.current_price,
      originalPrice: product.sale_price ? product.current_price : 0,
      costPrice: product.cost_price,
      stock: productStock?.quantity || 0,
      lowStockThreshold: productStock?.reorder_level || 5,
      rating: 4.5, // Default, can be calculated from reviews
      reviewCount: reviews.filter(r => r.product_id === product.product_id).length,
      featured: false,
      status: product.deleted_at ? 'inactive' : 'active',
      inStock: (productStock?.quantity || 0) > 0,
      image: images[0]?.image_url || '/products/placeholder.jpg',
      images: images.map(img => img.image_url),
      description: product.full_description,
      shortDescription: product.short_description,
      specs: attrs.reduce((acc, attr) => {
        acc[attr.attribute_name] = attr.attribute_value;
        return acc;
      }, {}),
      tags: [product.brand, category?.category_name].filter(Boolean),
      weight: product.weight_kg,
      warrantyMonths: product.warranty_months,
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    };
  });
};

/**
 * Transform orders to old format
 */
const transformOrders = () => {
  return orders.map(order => {
    const user = users.find(u => u.user_id === order.user_id);
    const items = orderItems
      .filter(item => item.order_id === order.order_id)
      .map(item => {
        const product = products.find(p => p.product_id === item.product_id);
        const images = productImages.filter(img => img.product_id === item.product_id);
        return {
          productId: `prod-${String(item.product_id).padStart(3, '0')}`,
          productName: product?.product_name || 'Unknown Product',
          sku: product?.sku || '',
          quantity: item.quantity,
          price: item.unit_price,
          image: images[0]?.image_url || '/products/placeholder.jpg',
        };
      });

    const shippingData = order.shipping_snapshot ? JSON.parse(order.shipping_snapshot) : {};
    const history = orderHistory.filter(h => h.order_id === order.order_id);

    return {
      id: `order-${String(order.order_id).padStart(3, '0')}`,
      orderNumber: order.order_number,
      userId: `user-${String(order.user_id).padStart(3, '0')}`,
      customerName: user?.full_name || 'Unknown Customer',
      customerEmail: user?.email || '',
      date: order.ordered_at,
      status: order.current_status,
      items,
      subtotal: order.subtotal,
      tax: order.tax_amount,
      shipping: order.shipping_cost,
      total: order.total_amount,
      shippingAddress: {
        street: shippingData.address_line1 || '',
        city: shippingData.city || '',
        state: shippingData.state || '',
        zipCode: shippingData.postal_code || '',
        country: shippingData.country || 'Algérie',
      },
      paymentMethod: order.payment_status === 'paid' ? 'Credit Card' : 'Pending',
      notes: order.delivery_notes || '',
      statusHistory: history.map(h => ({
        status: h.status,
        timestamp: h.changed_at,
        note: h.notes,
      })),
      createdAt: order.ordered_at,
      updatedAt: order.ordered_at,
    };
  });
};

/**
 * Transform users to old format
 */
const transformUsers = () => {
  return users.map(user => {
    const userAddresses = addresses.filter(addr => addr.user_id === user.user_id);
    const defaultAddress = userAddresses.find(addr => addr.is_default) || userAddresses[0];
    const userOrders = orders.filter(o => o.user_id === user.user_id);
    const totalSpent = userOrders.reduce((sum, order) => sum + order.total_amount, 0);

    return {
      id: `user-${String(user.user_id).padStart(3, '0')}`,
      email: user.email,
      password: 'admin123', // Default for demo
      name: user.full_name,
      role: user.user_type === 'admin' ? 'admin' : 'customer',
      phone: user.phone,
      address: defaultAddress ? {
        street: defaultAddress.address_line1,
        city: defaultAddress.city,
        state: defaultAddress.state,
        zipCode: defaultAddress.postal_code,
        country: defaultAddress.country,
      } : null,
      orders: userOrders.map(o => `order-${String(o.order_id).padStart(3, '0')}`),
      totalOrders: userOrders.length,
      totalSpent,
      status: user.deleted_at ? 'inactive' : 'active',
      createdAt: user.created_at,
      lastLogin: user.last_login,
    };
  });
};

/**
 * Transform reviews to old format
 */
const transformReviews = () => {
  return reviews.map(review => {
    const product = products.find(p => p.product_id === review.product_id);
    const user = users.find(u => u.user_id === review.user_id);

    return {
      id: `review-${String(review.review_id).padStart(3, '0')}`,
      productId: `prod-${String(review.product_id).padStart(3, '0')}`,
      productName: product?.product_name || 'Unknown Product',
      userId: `user-${String(review.user_id).padStart(3, '0')}`,
      userName: user?.full_name || 'Anonymous',
      userEmail: user?.email || '',
      rating: review.rating,
      comment: review.review_text,
      date: review.created_at,
      helpful: 0, // Not in new DB
      verified: review.verified_purchase,
      status: review.deleted_at ? 'rejected' : 'approved',
      moderatedBy: 'user-002', // Admin user
      moderatedAt: review.created_at,
      images: [],
    };
  });
};

// ============================================
// Export Transformed Data
// ============================================

export const CATEGORIES = [...new Set(categories.map(c => c.category_name))];
export const BRANDS = [...new Set(products.map(p => p.brand))];

export const PRODUCT_STATUSES = ['active', 'inactive'];
export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'];
export const USER_ROLES = ['customer', 'admin'];

export const dbData = {
  products: transformProducts(),
  orders: transformOrders(),
  users: transformUsers(),
  reviews: transformReviews(),
};

// Export for easy access
export default dbData;
