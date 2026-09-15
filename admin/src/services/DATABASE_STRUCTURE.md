# Mock Database Structure

## Overview

The mock database has been reorganized into a clean, maintainable structure with separation of concerns. The system now uses a centralized database class that manages all data and provides consistent interfaces for CRUD operations.

## File Structure

```
admin/src/services/
├── mockDatabase.js      # Centralized data storage and initialization
└── mockAdminApi.js      # API methods that use the database
```

## Architecture

### 1. mockDatabase.js (New)

**Purpose**: Centralized data management with organized seed data and initialization logic.

**Key Features**:
- **Organized Seed Data**: All initial data is defined in clean, maintainable arrays
  - `productSeeds`: 50 products across 11 categories
  - `userSeeds`: 15 users (3 admins + 12 customers)
  
- **MockDatabase Class**: Singleton class that manages all data
  - `initialize()`: Generates complete data with relationships
  - `generateOrders()`: Creates ~30 orders with realistic distributions
  - `generateReviews()`: Creates ~80 reviews with realistic ratings
  - Getter methods: `getAllProducts()`, `getAllUsers()`, etc.
  - `reset()`: Resets database to initial state

- **Data Generation**:
  - Products: Auto-generates IDs, SKUs, ratings, images, descriptions
  - Orders: Creates orders with 1-4 items, calculates tax/shipping
  - Reviews: Distributes ratings realistically (mostly 4-5 stars)
  - Users: Auto-updates order counts and spending totals

**Benefits**:
- ✅ Clear separation of data and logic
- ✅ Easy to maintain and modify seed data
- ✅ Consistent data generation patterns
- ✅ Single source of truth for all data
- ✅ Type-safe and predictable structure

### 2. mockAdminApi.js (Refactored)

**Purpose**: API layer that provides CRUD operations using the centralized database.

**Key Changes**:
- Imports database and constants from `mockDatabase.js`
- All API methods now use `db.getAllProducts()`, `db.products`, etc.
- Reduced from 941 lines to ~600 lines
- Much cleaner and easier to understand
- No inline data generation

**APIs Provided**:
- `productApi`: Full CRUD + bulk operations, filtering, statistics
- `orderApi`: CRUD, status updates, filtering, recent orders
- `userApi`: CRUD, user orders/reviews, statistics
- `reviewApi`: CRUD, bulk moderation, filtering, statistics
- `dashboardApi`: Metrics, activity, sales data, category data
- `resetDemoData()`: Resets all data to initial state

## Data Structure

### Products (50 items)
```javascript
{
  id: 'prod-001',
  sku: 'SKU-DEL-0001',
  name: 'Dell PowerEdge R740',
  brand: 'Dell',
  category: 'Serveurs',
  price: 850000,
  originalPrice: 950000,
  costPrice: 700000,
  stock: 8,
  lowStockThreshold: 5,
  rating: 4.7,
  reviewCount: 23,
  featured: false,
  status: 'active',
  inStock: true,
  image: '/products/prod-001.jpg',
  images: [...],
  description: '...',
  specs: {...},
  tags: [...],
  createdAt: '2024-...',
  updatedAt: '2024-...'
}
```

### Orders (30 items)
```javascript
{
  id: 'order-001',
  orderNumber: 'ORD-2024-1000',
  userId: 'user-004',
  customerName: 'John Doe',
  customerEmail: 'john.doe@example.com',
  date: '2024-...',
  status: 'delivered',
  items: [
    {
      productId: 'prod-001',
      productName: 'Dell PowerEdge R740',
      sku: 'SKU-DEL-0001',
      quantity: 2,
      price: 850000,
      image: '/products/prod-001.jpg'
    }
  ],
  subtotal: 1700000,
  tax: 323000,      // 19%
  shipping: 0,      // Free over 50000 DA
  total: 2023000,
  shippingAddress: {...},
  paymentMethod: 'Credit Card',
  statusHistory: [...]
}
```

### Users (15 items)
```javascript
{
  id: 'user-001',
  email: 'admin@example.com',
  password: 'admin123',
  name: 'Admin User',
  role: 'admin',     // 'admin' or 'customer'
  phone: '+213 555 000 001',
  address: {
    street: '123 Admin Street',
    city: 'Algiers',
    state: 'Algiers',
    zipCode: '16000',
    country: 'Algeria'
  },
  orders: ['order-001', ...],
  totalOrders: 5,
  totalSpent: 3500000,
  status: 'active',
  createdAt: '2023-...',
  lastLogin: '2024-...'
}
```

### Reviews (80 items)
```javascript
{
  id: 'review-001',
  productId: 'prod-001',
  productName: 'Dell PowerEdge R740',
  userId: 'user-004',
  userName: 'John Doe',
  userEmail: 'john.doe@example.com',
  rating: 5,
  comment: 'Excellent product!...',
  date: '2024-...',
  helpful: 12,
  verified: true,
  status: 'approved',  // 'pending', 'approved', 'rejected'
  moderatedBy: 'user-001',
  moderatedAt: '2024-...',
  images: []
}
```

## Status Distributions

### Orders
- **Delivered**: 60% (18 orders)
- **Processing**: 20% (6 orders)
- **Shipped**: 10% (3 orders)
- **Pending**: 5% (1-2 orders)
- **Cancelled**: 5% (1-2 orders)

### Reviews
- **Approved**: 70% (56 reviews)
- **Pending**: 20% (16 reviews)
- **Rejected**: 10% (8 reviews)

### Review Ratings
- **5 stars**: 40%
- **4 stars**: 30%
- **3 stars**: 15%
- **2 stars**: 10%
- **1 star**: 5%

## Usage Examples

### Accessing Data
```javascript
import db from './mockDatabase';

// Get all data
const products = db.getAllProducts();
const orders = db.getAllOrders();
const users = db.getAllUsers();
const reviews = db.getAllReviews();

// Direct access (for modifications)
db.products.push(newProduct);
db.orders[0].status = 'shipped';

// Reset to initial state
db.reset();
```

### Using APIs
```javascript
import { productApi, orderApi } from './mockAdminApi';

// Get filtered products
const laptops = await productApi.getAll({ 
  category: 'PC Portables',
  inStock: true 
});

// Update order status
await orderApi.updateStatus('order-001', 'shipped', 'Shipped via DHL');

// Get dashboard metrics
const metrics = await dashboardApi.getMetrics();
```

## Benefits of New Structure

### Before (941 lines in one file)
- ❌ Inline data mixed with logic
- ❌ Hard to find and modify specific data
- ❌ Mutable arrays without encapsulation
- ❌ Data generation spread throughout file
- ❌ Difficult to maintain and debug

### After (Separated into 2 files)
- ✅ Clean separation of concerns
- ✅ Easy to locate and modify seed data
- ✅ Encapsulated database class
- ✅ Centralized data generation logic
- ✅ Much easier to maintain and extend
- ✅ Better code organization
- ✅ Easier to debug issues
- ✅ Consistent data patterns
- ✅ Easier to add new features

## Adding New Data

### Add a New Product Category
1. Add to `CATEGORIES` array in mockDatabase.js
2. Add seed products in `productSeeds` array
3. No changes needed elsewhere - everything auto-generates!

### Add New Users
1. Add to `userSeeds` array
2. Orders and reviews will auto-reference new users

### Modify Data Generation
1. Edit the `MockDatabase` class methods
2. Adjust distributions in `generateOrders()` or `generateReviews()`

## Testing

The admin panel will work exactly as before, but with:
- Better organized code
- Easier maintenance
- More predictable behavior
- Cleaner debugging experience

All existing functionality remains intact:
- ✅ Dashboard metrics
- ✅ Product management (CRUD, bulk ops, CSV export)
- ✅ Order management (list, detail, status updates)
- ✅ User management (list, detail, orders/reviews)
- ✅ Review moderation (approve, reject, bulk ops)
- ✅ All filters and search functionality
