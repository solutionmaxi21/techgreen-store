// ============================================
// MOCK DATABASE - Now Connected to JSON Database
// ============================================
// This file now loads data from the JSON database folder via the adapter
// and maintains backward compatibility with existing code

import { dbData, CATEGORIES, BRANDS, PRODUCT_STATUSES, ORDER_STATUSES, REVIEW_STATUSES, USER_ROLES } from './dbAdapter';

// Export constants
export { CATEGORIES, BRANDS, PRODUCT_STATUSES, ORDER_STATUSES, REVIEW_STATUSES, USER_ROLES };

// Helper functions
const formatDate = (date) => date ? date.toISOString() : new Date().toISOString();

// ============================================
// MockDatabase Class
// ============================================
class MockDatabase {
  constructor() {
    // Initialize with data from JSON files via adapter
    this.products = [...dbData.products];
    this.orders = [...dbData.orders];
    this.users = [...dbData.users];
    this.reviews = [...dbData.reviews];
    
    // Store original data for reset functionality
    this.originalData = {
      products: [...dbData.products],
      orders: [...dbData.orders],
      users: [...dbData.users],
      reviews: [...dbData.reviews],
    };
  }

  // ============================================
  // PRODUCT METHODS
  // ============================================
  
  getAllProducts() {
    return this.products.filter(p => !p.deletedAt);
  }

  getProductById(id) {
    return this.products.find(p => p.id === id);
  }

  getProductBySku(sku) {
    return this.products.find(p => p.sku === sku);
  }

  createProduct(productData) {
    const maxId = Math.max(0, ...this.products.map(p => parseInt(p.id.split('-')[1])));
    const newId = `prod-${String(maxId + 1).padStart(3, '0')}`;
    const newProduct = {
      id: newId,
      sku: productData.sku || `SKU-${Date.now()}`,
      name: productData.name,
      brand: productData.brand,
      category: productData.category,
      price: productData.price,
      originalPrice: productData.originalPrice || 0,
      costPrice: productData.costPrice,
      stock: productData.stock || 0,
      lowStockThreshold: productData.lowStockThreshold || 5,
      rating: 0,
      reviewCount: 0,
      featured: productData.featured || false,
      status: 'active',
      inStock: productData.stock > 0,
      image: productData.image || '/products/placeholder.jpg',
      images: productData.images || ['/products/placeholder.jpg'],
      description: productData.description || '',
      shortDescription: productData.shortDescription || '',
      specs: productData.specs || {},
      tags: productData.tags || [],
      weight: productData.weight || 0,
      warrantyMonths: productData.warrantyMonths || 12,
      createdAt: formatDate(new Date()),
      updatedAt: formatDate(new Date()),
    };
    this.products.push(newProduct);
    return newProduct;
  }

  updateProduct(id, updates) {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    this.products[index] = {
      ...this.products[index],
      ...updates,
      updatedAt: formatDate(new Date()),
    };
    return this.products[index];
  }

  deleteProduct(id) {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    this.products[index].deletedAt = formatDate(new Date());
    this.products[index].status = 'inactive';
    return true;
  }

  searchProducts(query) {
    const lowerQuery = query.toLowerCase();
    return this.products.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.brand.toLowerCase().includes(lowerQuery) ||
      p.category.toLowerCase().includes(lowerQuery) ||
      p.sku.toLowerCase().includes(lowerQuery)
    );
  }

  // ============================================
  // ORDER METHODS
  // ============================================
  
  getAllOrders() {
    return [...this.orders];
  }

  getOrderById(id) {
    return this.orders.find(o => o.id === id);
  }

  getOrderByNumber(orderNumber) {
    return this.orders.find(o => o.orderNumber === orderNumber);
  }

  createOrder(orderData) {
    const maxId = Math.max(0, ...this.orders.map(o => parseInt(o.id.split('-')[1])));
    const newId = `order-${String(maxId + 1).padStart(3, '0')}`;
    const newOrderNumber = `ORD-2024-${String(1000 + maxId + 1)}`;
    
    const newOrder = {
      id: newId,
      orderNumber: newOrderNumber,
      userId: orderData.userId,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      date: formatDate(new Date()),
      status: 'pending',
      items: orderData.items || [],
      subtotal: orderData.subtotal,
      tax: orderData.tax,
      shipping: orderData.shipping,
      total: orderData.total,
      shippingAddress: orderData.shippingAddress,
      paymentMethod: orderData.paymentMethod || 'Credit Card',
      notes: orderData.notes || '',
      statusHistory: [
        {
          status: 'pending',
          timestamp: formatDate(new Date()),
          note: 'Order created',
        }
      ],
      createdAt: formatDate(new Date()),
      updatedAt: formatDate(new Date()),
    };
    
    this.orders.push(newOrder);
    
    // Update user stats
    const user = this.getUserById(orderData.userId);
    if (user) {
      user.orders.push(newId);
      user.totalOrders++;
      user.totalSpent += orderData.total;
    }
    
    return newOrder;
  }

  updateOrderStatus(id, status) {
    const order = this.getOrderById(id);
    if (!order) return null;
    
    order.status = status;
    order.statusHistory.push({
      status,
      timestamp: formatDate(new Date()),
      note: `Status updated to ${status}`,
    });
    order.updatedAt = formatDate(new Date());
    
    return order;
  }

  updateOrder(id, updates) {
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) return null;
    
    this.orders[index] = {
      ...this.orders[index],
      ...updates,
      updatedAt: formatDate(new Date()),
    };
    return this.orders[index];
  }

  // ============================================
  // USER METHODS
  // ============================================
  
  getAllUsers() {
    return this.users.filter(u => u.status === 'active');
  }

  getUserById(id) {
    return this.users.find(u => u.id === id);
  }

  getUserByEmail(email) {
    return this.users.find(u => u.email === email);
  }

  createUser(userData) {
    const maxId = Math.max(0, ...this.users.map(u => parseInt(u.id.split('-')[1])));
    const newId = `user-${String(maxId + 1).padStart(3, '0')}`;
    
    const newUser = {
      id: newId,
      email: userData.email,
      password: userData.password || 'password123',
      name: userData.name,
      role: userData.role || 'customer',
      phone: userData.phone || '',
      address: userData.address || null,
      orders: [],
      totalOrders: 0,
      totalSpent: 0,
      status: 'active',
      createdAt: formatDate(new Date()),
      lastLogin: formatDate(new Date()),
    };
    
    this.users.push(newUser);
    return newUser;
  }

  updateUser(id, updates) {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    this.users[index] = {
      ...this.users[index],
      ...updates,
    };
    return this.users[index];
  }

  deleteUser(id) {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    
    this.users[index].status = 'inactive';
    return true;
  }

  // ============================================
  // REVIEW METHODS
  // ============================================
  
  getAllReviews() {
    return [...this.reviews];
  }

  getReviewById(id) {
    return this.reviews.find(r => r.id === id);
  }

  getReviewsByProduct(productId) {
    return this.reviews.filter(r => r.productId === productId);
  }

  createReview(reviewData) {
    const maxId = Math.max(0, ...this.reviews.map(r => parseInt(r.id.split('-')[1])));
    const newId = `review-${String(maxId + 1).padStart(3, '0')}`;
    
    const newReview = {
      id: newId,
      productId: reviewData.productId,
      productName: reviewData.productName,
      userId: reviewData.userId,
      userName: reviewData.userName,
      userEmail: reviewData.userEmail,
      rating: reviewData.rating,
      comment: reviewData.comment,
      date: formatDate(new Date()),
      helpful: 0,
      verified: reviewData.verified || false,
      status: 'pending',
      moderatedBy: null,
      moderatedAt: null,
      images: reviewData.images || [],
    };
    
    this.reviews.push(newReview);
    
    // Update product review count
    const product = this.getProductById(reviewData.productId);
    if (product) {
      product.reviewCount++;
      // Recalculate average rating
      const productReviews = this.getReviewsByProduct(reviewData.productId);
      const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
      product.rating = parseFloat((totalRating / productReviews.length).toFixed(1));
    }
    
    return newReview;
  }

  updateReviewStatus(id, status) {
    const review = this.getReviewById(id);
    if (!review) return null;
    
    review.status = status;
    review.moderatedAt = formatDate(new Date());
    review.moderatedBy = 'user-002'; // Admin user
    
    return review;
  }

  deleteReview(id) {
    const index = this.reviews.findIndex(r => r.id === id);
    if (index !== -1) {
      const review = this.reviews[index];
      this.reviews.splice(index, 1);
      
      // Update product review count
      const product = this.getProductById(review.productId);
      if (product && product.reviewCount > 0) {
        product.reviewCount--;
        // Recalculate average rating
        const productReviews = this.getReviewsByProduct(review.productId);
        if (productReviews.length > 0) {
          const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
          product.rating = parseFloat((totalRating / productReviews.length).toFixed(1));
        } else {
          product.rating = 0;
        }
      }
      
      return true;
    }
    return false;
  }

  // ============================================
  // STATISTICS & DASHBOARD
  // ============================================
  
  getDashboardStats() {
    const totalRevenue = this.orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + o.total, 0);
    
    const totalOrders = this.orders.length;
    const pendingOrders = this.orders.filter(o => o.status === 'pending').length;
    const lowStockProducts = this.products.filter(p => p.stock <= p.lowStockThreshold && p.status === 'active').length;
    
    return {
      totalRevenue,
      totalOrders,
      totalCustomers: this.users.filter(u => u.role === 'customer').length,
      pendingOrders,
      lowStockProducts,
    };
  }

  getRecentOrders(limit = 5) {
    return this.orders
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  }

  getTopProducts(limit = 5) {
    const productSales = {};
    
    this.orders.forEach(order => {
      order.items.forEach(item => {
        productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
      });
    });
    
    return Object.entries(productSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([productId, quantity]) => ({
        product: this.getProductById(productId),
        quantity,
      }))
      .filter(item => item.product); // Filter out any null products
  }

  getRevenueByMonth() {
    const revenueByMonth = {};
    
    this.orders
      .filter(o => o.status === 'delivered')
      .forEach(order => {
        const date = new Date(order.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + order.total;
      });
    
    return revenueByMonth;
  }

  getLowStockProducts() {
    return this.products.filter(p => 
      p.stock <= p.lowStockThreshold && 
      p.status === 'active'
    );
  }

  // ============================================
  // UTILITY METHODS
  // ============================================
  
  reset() {
    this.products = [...this.originalData.products];
    this.orders = [...this.originalData.orders];
    this.users = [...this.originalData.users];
    this.reviews = [...this.originalData.reviews];
  }
}

// Export singleton instance
const db = new MockDatabase();
export default db;
export { db };
