# Maxi Store - Admin Panel

A modern, feature-rich admin panel for managing an e-commerce store. Built with React, Vite, and a centralized mock database system.

## 🚀 Features

### ✅ Completed Features

- **Dashboard** - Overview with key metrics, charts, and recent activity
- **Product Management** - Full CRUD, bulk operations, image upload, CSV export
- **Order Management** - View orders, update status, detailed order view, print invoice
- **User Management** - View users, filter by role, user detail with order history
- **Review Moderation** - Approve/reject/delete reviews, bulk operations
- **Settings** - Reset demo data, manage preferences, view database info
- **Authentication** - Role-based login with mock database integration
- **Theme System** - Light/dark mode with CSS variables
- **Responsive Design** - Mobile-friendly with collapsible sidebar

### ⏳ Planned Features

- **Analytics Page** - Advanced charts for sales trends and insights
- **Export Features** - Enhanced PDF reports
- **Activity Logs** - Audit trail for admin actions

## 🖥️ Desktop Application

The admin panel is packaged as a **professional Electron desktop application** with:

- **🔒 Enterprise Security**: Secure token storage in system keychain, CSP, context isolation
- **📱 Native Experience**: Application menu, window state persistence, system integration
- **🚀 Production Ready**: NSIS installer, portable executable, optimized builds
- **🛠️ Developer Friendly**: Hot reload, DevTools, comprehensive logging

See **[ELECTRON.md](./ELECTRON.md)** for complete desktop app documentation.

### Quick Start (Desktop App)

```bash
# Development mode
npm run electron:dev

# Build installer
npm run electron:build
```


## 🗄️ Database Architecture

### Centralized Mock Database

The admin panel uses a **centralized mock database** system for consistent data management:

#### **mockDatabase.js** - Core Database
- Singleton `MockDatabase` class
- Organized seed data for products, users, orders, reviews
- Auto-generates realistic demo data with proper relationships
- Provides getter methods: `getAllProducts()`, `getAllUsers()`, etc.
- Includes `reset()` method to restore initial state

#### **mockAdminApi.js** - API Layer
- Imports and uses centralized database
- Provides CRUD operations for all entities
- Filtering, sorting, pagination support
- Bulk operations (delete, update status)
- CSV export functionality
- Statistics and metrics calculations

#### **mockAuth.js** - Authentication
- Integrates with database for user authentication
- Validates credentials against database users
- Role-based access control (admin only)
- Session management with localStorage
- Password change and profile update

## 🔐 Authentication

### Admin Accounts

Three demo admin accounts are available:

| Email | Password | Name |
|-------|----------|------|
| admin@example.com | admin123 | Admin User |
| manager@example.com | manager123 | Manager User |
| staff@example.com | staff123 | Staff User |

### Authentication Flow

1. User enters credentials on login page
2. `mockAuth.login()` validates against database
3. Checks if user has `role: 'admin'`
4. Updates user's `lastLogin` timestamp
5. Stores token and user data in localStorage
6. Redirects to dashboard

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/solutionmaxi21/Admin-Panel-Maxistore.git
cd Admin-Panel-Maxistore

# Install dependencies
npm install

# Start Vite web development server
npm run dev
```

The admin panel web app will be available at `http://localhost:5174/`

### First Time Setup

1. Access `http://localhost:5174/`
2. Login with: `admin@example.com` / `admin123`
3. Explore the dashboard and features
4. All data is demo data stored in memory
5. Use Settings → Reset Demo Data to restore initial state

## 📊 Demo Data

### Data Distribution

- **Products**: 50 across 11 categories
- **Orders**: 30 (60% delivered, 20% processing, 10% shipped, 10% other)
- **Users**: 15 total (3 admins, 12 customers)
- **Reviews**: 80 reviews (70% approved, 20% pending, 10% rejected)

### Data Persistence

⚠️ **Important**: This is a **frontend-only demo** using in-memory data.

- Data resets on page refresh
- No backend or database connection
- Changes are temporary
- Use "Reset Demo Data" in Settings to restore

## 🔧 API Usage

### Using the Database

```javascript
import db from './services/mockDatabase';

// Get all data
const products = db.getAllProducts();
const orders = db.getAllOrders();

// Reset to initial state
db.reset();
```

### Using the API

```javascript
import { productApi, orderApi } from './services/mockAdminApi';

// Get filtered products
const laptops = await productApi.getAll({ 
  category: 'PC Portables',
  inStock: true 
});

// Update order status
await orderApi.updateStatus('order-001', 'shipped');
```

### Using Authentication

```javascript
import { login, logout, isAuthenticated } from './services/mockAuth';

// Login
const user = await login('admin@example.com', 'admin123');

// Logout
logout();

// Check auth status
if (isAuthenticated()) {
  // User is logged in
}
```

## 🛠️ Technologies

- **React 19.0.0** - UI framework
- **Vite 6.4.1** - Build tool
- **React Router DOM 7.0.0** - Routing
- **Recharts 2.10.0** - Charts (ready for analytics)
- **Papa Parse 5.4.1** - CSV export
- **date-fns 3.0.0** - Date formatting

## 📚 Documentation

- `DATABASE_STRUCTURE.md` - Detailed database documentation
- `DATABASE_REORGANIZATION.md` - Migration summary
- Component-specific JSDoc comments

## 🐛 Troubleshooting

### Data not persisting
- This is expected - data is in-memory only
- Use "Reset Demo Data" to restore initial state

### Login not working
- Check credentials match database users
- Ensure user has `role: 'admin'`
- Clear localStorage if needed

## 📄 License

This is a demo project for educational purposes.

---

**Built with ❤️ for Maxi Store**
