# Admin Panel Shared Styles System

## Overview

The admin panel uses a comprehensive, reusable styles system located in `/admin/src/styles/`. This system provides consistent design patterns across all pages, reducing code duplication and ensuring a unified user experience.

## Style Files

### 1. **buttons.css** - Button System
Complete button components with variants, sizes, and states.

**Classes:**
- `btn-primary` - Primary action button (gradient blue)
- `btn-secondary` - Secondary action (white with border)
- `btn-success` - Success actions (green gradient)
- `btn-danger` - Destructive actions (red gradient)
- `btn-warning` - Warning actions (orange gradient)
- `btn-outline` - Outline variants (combine with color classes)
- `btn-icon` - Icon-only buttons
- `btn-sm`, `btn-lg`, `btn-xl` - Size variants
- `btn-loading` - Loading state with spinner
- `btn-group`, `btn-group-joined` - Button groups

**Example:**
```jsx
<button className="btn-primary">Save Changes</button>
<button className="btn-secondary btn-sm">Cancel</button>
<button className="btn-danger btn-outline">Delete</button>
```

### 2. **actions.css** - Action Buttons
Small action buttons for inline actions (table rows, cards, etc.)

**Classes:**
- `action-btn` - Base action button
- `action-btn.edit`, `.delete`, `.approve`, `.reject` - Contextual variants
- `action-btn-icon` - Icon-only action buttons
- `action-button` - Full-width action buttons
- `back-button` - Navigation back button
- `clear-filters` - Filter reset button
- `action-buttons` - Container for action button groups

**Example:**
```jsx
<div className="action-buttons">
  <button className="action-btn edit">✏️ Edit</button>
  <button className="action-btn delete">🗑️ Delete</button>
</div>
```

### 3. **ui-enhancements.css** - UI Components
Reusable UI components and micro-interactions.

**Classes:**
- `card`, `card-header`, `card-title`, `card-footer` - Card containers
- `badge`, `badge-primary`, `badge-success`, etc. - Status badges
- `alert`, `alert-info`, `alert-success`, etc. - Alert messages
- `avatar`, `avatar-sm`, `avatar-lg`, `avatar-xl` - User avatars
- `progress`, `progress-bar` - Progress indicators
- `spinner`, `spinner-sm`, `spinner-lg` - Loading spinners
- `skeleton`, `skeleton-text`, `skeleton-title` - Skeleton loaders
- `empty-state`, `empty-state-icon`, `empty-state-title` - Empty states
- `divider`, `divider-vertical` - Visual separators

**Example:**
```jsx
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Product Details</h3>
  </div>
  <span className="badge badge-success">Active</span>
</div>
```

### 4. **layout.css** - Page Layout & Structure
Page containers, headers, grids, and section layouts.

**Classes:**
- `page-container`, `page-container-sm/md/lg/full` - Page wrappers
- `page-header`, `page-header-left`, `page-header-right` - Page headers
- `page-icon`, `page-subtitle` - Header decorations
- `stat-badge`, `stat-badge-success/warning/danger` - Header stats
- `stats-grid`, `stat-card`, `stat-icon`, `stat-value` - Stats displays
- `section`, `section-header`, `section-title` - Section containers
- `grid-2`, `grid-3`, `grid-4`, `grid-auto`, `grid-sidebar` - Grid systems
- `flex-row`, `flex-col`, `flex-between`, `flex-center` - Flex layouts
- `loading-container`, `loading-text` - Loading states

**Example:**
```jsx
<div className="page-container">
  <div className="page-header">
    <div className="page-header-left">
      <h1>
        <span className="page-icon">📦</span>
        Products
      </h1>
      <p className="page-subtitle">
        Manage your inventory
        <span className="stat-badge stat-badge-success">156 Active</span>
      </p>
    </div>
    <div className="page-header-right">
      <button className="btn-primary">+ Add Product</button>
    </div>
  </div>
  
  <div className="stats-grid">
    <div className="stat-card">
      <div className="stat-icon">📦</div>
      <div className="stat-content">
        <p className="stat-label">Total Products</p>
        <p className="stat-value">1,234</p>
        <p className="stat-change up">↑ 12% from last month</p>
      </div>
    </div>
  </div>
</div>
```

### 5. **forms.css** - Form Components
Complete form system with inputs, validation, and layouts.

**Classes:**
- `form-container`, `form-section`, `form-section-title` - Form structure
- `form-grid`, `form-grid-3`, `form-grid-full` - Form layouts
- `form-group`, `form-label`, `form-label-required` - Field groups
- `form-input`, `form-select`, `form-textarea` - Input fields
- `form-help`, `form-error` - Helper text
- `form-checkbox-group`, `form-checkbox` - Checkboxes
- `form-radio-group`, `form-radio` - Radio buttons
- `form-switch`, `switch-toggle` - Toggle switches
- `form-file-upload` - File upload area
- `form-actions`, `form-actions-right/center/between` - Form buttons
- `search-box`, `search-icon` - Search inputs
- `filters-section`, `filters-grid`, `filter-group` - Filter panels

**Example:**
```jsx
<div className="form-container">
  <div className="form-section">
    <h3 className="form-section-title">Basic Information</h3>
    <div className="form-grid">
      <div className="form-group">
        <label className="form-label form-label-required">Product Name</label>
        <input type="text" className="form-input" placeholder="Enter product name" />
        <span className="form-help">Unique name for your product</span>
      </div>
      
      <div className="form-group">
        <label className="form-label">Category</label>
        <select className="form-select">
          <option>Select category</option>
        </select>
      </div>
    </div>
  </div>
  
  <div className="form-actions form-actions-right">
    <button className="btn-secondary">Cancel</button>
    <button className="btn-primary">Save Product</button>
  </div>
</div>
```

### 6. **tables.css** - Data Tables
Complete table system with sorting, pagination, and bulk actions.

**Classes:**
- `table-container`, `table-wrapper` - Table wrappers
- `data-table` - Base table
- `table-cell-image`, `table-cell-avatar`, `table-cell-user` - Cell types
- `table-cell-actions` - Actions column
- `table-footer`, `table-info` - Table footer
- `pagination`, `pagination-button` - Pagination controls
- `bulk-actions`, `bulk-actions-info`, `bulk-action-btn` - Bulk operations
- `table-checkbox` - Checkbox column
- `table-empty`, `table-loading` - Empty/loading states
- `table-filters` - Filter row
- `sort-indicator` - Sort arrows

**Example:**
```jsx
<div className="table-container">
  <div className="table-wrapper">
    <table className="data-table">
      <thead>
        <tr>
          <th className="table-checkbox">
            <input type="checkbox" />
          </th>
          <th className="sortable">Name</th>
          <th>Status</th>
          <th className="table-cell-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="table-checkbox">
            <input type="checkbox" />
          </td>
          <td>
            <div className="table-cell-user">
              <div className="table-cell-avatar">JD</div>
              <div className="table-cell-user-info">
                <div className="table-cell-name">John Doe</div>
                <div className="table-cell-email">john@example.com</div>
              </div>
            </div>
          </td>
          <td><span className="badge badge-success">Active</span></td>
          <td className="table-cell-actions">
            <button className="action-btn-icon edit">✏️</button>
            <button className="action-btn-icon delete">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  
  <div className="table-footer">
    <div className="table-info">Showing 1-10 of 156 results</div>
    <div className="pagination">
      <button className="pagination-button" disabled>Previous</button>
      <button className="pagination-button active">1</button>
      <button className="pagination-button">2</button>
      <button className="pagination-button">3</button>
      <button className="pagination-button">Next</button>
    </div>
  </div>
</div>
```

### 7. **utilities.css** - Utility Classes
Tailwind-like utility classes for quick styling.

**Available Utilities:**
- Spacing: `mt-1`, `mb-2`, `pt-3`, `gap-2`, etc.
- Text: `text-center`, `text-lg`, `font-bold`, `text-primary`, `truncate`
- Display: `block`, `flex`, `grid`, `hidden`
- Flexbox: `flex-row`, `items-center`, `justify-between`, `flex-1`
- Sizing: `w-full`, `h-full`, `min-h-screen`
- Position: `relative`, `absolute`, `fixed`, `sticky`
- Borders: `border`, `rounded-md`, `rounded-full`
- Shadows: `shadow-sm`, `shadow-md`, `shadow-lg`
- Background: `bg-white`, `bg-gray-50`, `bg-primary`
- Opacity: `opacity-50`, `opacity-75`
- Cursor: `cursor-pointer`, `cursor-not-allowed`
- Transitions: `transition`, `transition-fast`
- Responsive: `mobile-hidden`, `desktop-hidden`

**Example:**
```jsx
<div className="flex items-center justify-between gap-2 p-3 rounded-md bg-white shadow-sm">
  <span className="text-lg font-bold text-primary">Title</span>
  <button className="cursor-pointer transition">Click</button>
</div>
```

## Dark Mode Support

All components include dark mode variants that automatically activate with `[data-theme='dark']`. Colors adjust to use darker backgrounds and lighter text.

## Responsive Design

All components are mobile-responsive with breakpoints:
- Mobile: `< 768px`
- Tablet: `768px - 1024px`
- Desktop: `> 1024px`

## Best Practices

1. **Always use shared styles first** - Check if a component exists before creating custom CSS
2. **Combine utility classes** - Use utilities for one-off adjustments instead of custom CSS
3. **Keep page-specific CSS minimal** - Only page-unique layouts should be in page CSS files
4. **Follow naming conventions** - Use BEM-like naming (`.component-element-modifier`)
5. **Use semantic class names** - Prefer `.form-actions` over `.button-container`

## Migration Guide

To migrate existing pages to use shared styles:

1. Import shared styles in `index.css` (already done)
2. Remove duplicate CSS from page-specific files
3. Replace custom classes with shared equivalents:
   - `products-list-page` → `page-container`
   - Custom button styles → `btn-primary`, `btn-secondary`
   - Custom form styles → `form-grid`, `form-group`
4. Import only necessary shared style files in pages (or use index.css for all)

## Example Page Structure

```jsx
import '../styles/layout.css';
import '../styles/forms.css';
import '../styles/tables.css';

function ProductsPage() {
  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>
            <span className="page-icon">📦</span>
            Products
          </h1>
        </div>
        <div className="page-header-right">
          <button className="btn-primary">+ Add Product</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search products..." />
        </div>
        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">Category</label>
            <select className="form-select">
              <option>All Categories</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-wrapper">
          <table className="data-table">
            {/* Table content */}
          </table>
        </div>
      </div>
    </div>
  );
}
```

## Support

For questions or issues with the styles system, refer to this documentation or check existing pages for implementation examples.
