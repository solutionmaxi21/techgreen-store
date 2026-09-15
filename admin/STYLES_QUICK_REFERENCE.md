# 🎨 Admin Panel Styles System - Quick Reference

## 📦 Import Pattern

```jsx
// In any page component, import only what you need:
import '../styles/layout.css';   // For page structure
import '../styles/forms.css';    // For forms
import '../styles/tables.css';   // For data tables
// buttons, actions, ui-enhancements, utilities auto-loaded via index.css
```

## 🎯 Common Patterns

### 1. Page Structure
```jsx
<div className="page-container">           {/* Main wrapper */}
  <div className="page-header">            {/* Header section */}
    <div className="page-header-left">
      <h1>
        <span className="page-icon">📦</span>
        Page Title
      </h1>
      <p className="page-subtitle">Description</p>
    </div>
    <div className="page-header-right">
      <button className="btn-primary">+ Add New</button>
    </div>
  </div>
  {/* Content */}
</div>
```

### 2. Stats Cards
```jsx
<div className="stats-grid">
  <div className="stat-card">
    <div className="stat-icon">📊</div>
    <div className="stat-content">
      <p className="stat-label">Label</p>
      <p className="stat-value">1,234</p>
      <p className="stat-change up">↑ 12%</p>
    </div>
  </div>
</div>
```

### 3. Search & Filters
```jsx
<div className="filters-section">
  <div className="filters-header">
    <h3 className="filters-title">🔍 Filters</h3>
    <button className="clear-filters">Clear All</button>
  </div>
  
  <div className="search-box">
    <span className="search-icon">🔍</span>
    <input type="text" placeholder="Search..." />
  </div>
  
  <div className="filters-grid">
    <div className="filter-group">
      <label className="filter-label">Category</label>
      <select className="form-select">
        <option>All</option>
      </select>
    </div>
  </div>
</div>
```

### 4. Forms
```jsx
<div className="form-container">
  <div className="form-section">
    <h3 className="form-section-title">Section Title</h3>
    
    <div className="form-grid">                {/* 2 columns */}
      <div className="form-group">
        <label className="form-label form-label-required">Name</label>
        <input type="text" className="form-input" />
        <span className="form-help">Helper text</span>
      </div>
      
      <div className="form-group">
        <label className="form-label">Status</label>
        <select className="form-select">
          <option>Active</option>
        </select>
      </div>
      
      <div className="form-group form-grid-full">  {/* Full width */}
        <label className="form-label">Description</label>
        <textarea className="form-textarea"></textarea>
      </div>
    </div>
  </div>
  
  <div className="form-actions form-actions-right">
    <button className="btn-secondary">Cancel</button>
    <button className="btn-primary">Save</button>
  </div>
</div>
```

### 5. Data Tables
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
    <div className="table-info">Showing 1-10 of 100</div>
    <div className="pagination">
      <button className="pagination-button">Previous</button>
      <button className="pagination-button active">1</button>
      <button className="pagination-button">2</button>
      <button className="pagination-button">Next</button>
    </div>
  </div>
</div>
```

## 🎨 Button Variants

```jsx
<button className="btn-primary">Primary</button>
<button className="btn-secondary">Secondary</button>
<button className="btn-success">Success</button>
<button className="btn-danger">Danger</button>
<button className="btn-warning">Warning</button>

<button className="btn-primary btn-sm">Small</button>
<button className="btn-primary btn-lg">Large</button>

<button className="btn-outline btn-primary">Outline</button>
<button className="btn-loading">Loading...</button>

<button className="btn-icon">📦</button>
```

## 🏷️ Badges

```jsx
<span className="badge badge-primary">Primary</span>
<span className="badge badge-success">Success</span>
<span className="badge badge-warning">Warning</span>
<span className="badge badge-danger">Danger</span>
<span className="badge badge-info">Info</span>
<span className="badge badge-gray">Gray</span>
```

## 🎴 Cards

```jsx
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Card Title</h3>
  </div>
  <p>Card content goes here</p>
  <div className="card-footer">
    <button className="btn-primary btn-sm">Action</button>
  </div>
</div>
```

## 🚨 Alerts

```jsx
<div className="alert alert-info">Information message</div>
<div className="alert alert-success">Success message</div>
<div className="alert alert-warning">Warning message</div>
<div className="alert alert-danger">Error message</div>
```

## 📊 Progress Bars

```jsx
<div className="progress">
  <div className="progress-bar" style={{ width: '75%' }}></div>
</div>

<div className="progress">
  <div className="progress-bar success" style={{ width: '100%' }}></div>
</div>
```

## 🔄 Loading States

```jsx
{/* Spinner */}
<div className="spinner"></div>
<div className="spinner spinner-lg"></div>

{/* Page Loading */}
<div className="loading-container">
  <div className="spinner spinner-lg"></div>
  <p className="loading-text">Loading data...</p>
</div>

{/* Table Loading */}
<div className="table-loading">
  <div className="spinner"></div>
  <p className="table-loading-text">Loading...</p>
</div>
```

## 📭 Empty States

```jsx
<div className="empty-state">
  <div className="empty-state-icon">📦</div>
  <h3 className="empty-state-title">No products found</h3>
  <p className="empty-state-description">
    Get started by creating your first product
  </p>
  <button className="btn-primary">+ Add Product</button>
</div>
```

## 🛠️ Utility Classes

```jsx
{/* Spacing */}
<div className="mt-2 mb-3 pt-1 pb-2">Margins & Padding</div>

{/* Text */}
<p className="text-center text-lg font-bold text-primary">
  Centered, Large, Bold, Primary Color
</p>

{/* Flex */}
<div className="flex items-center justify-between gap-2">
  <span>Left</span>
  <span>Right</span>
</div>

{/* Display */}
<div className="hidden">Hidden on all screens</div>
<div className="mobile-hidden">Hidden on mobile</div>
<div className="desktop-hidden">Hidden on desktop</div>

{/* Borders & Shadows */}
<div className="border rounded-lg shadow-md">Box</div>

{/* Width & Height */}
<div className="w-full h-full">Full width and height</div>
```

## 🎭 Status Badges (StatusBadge Component)

```jsx
import StatusBadge from '../components/StatusBadge';

<StatusBadge status="active" />
<StatusBadge status="draft" />
<StatusBadge status="archived" />
<StatusBadge status="pending" />
<StatusBadge status="completed" />
<StatusBadge status="cancelled" />
```

## 📋 Best Practices

1. **Always import shared styles** instead of creating custom CSS
2. **Use utility classes** for one-off adjustments
3. **Combine classes** for complex layouts: `flex items-center gap-2`
4. **Follow semantic naming** - classes describe purpose, not appearance
5. **Mobile-first** - styles are responsive by default
6. **Dark mode ready** - all components support dark theme

## 🎯 Class Naming Convention

- **Component**: `.component` (e.g., `.card`, `.badge`)
- **Element**: `.component-element` (e.g., `.card-header`, `.stat-value`)
- **Modifier**: `.component-modifier` (e.g., `.btn-primary`, `.badge-success`)
- **State**: `.component.state` (e.g., `.btn.active`, `.sortable.sorted`)

## 📖 Full Documentation

For complete documentation, see: `/admin/src/styles/README.md`

---

**Quick Start**: Copy any pattern above and customize the content!
