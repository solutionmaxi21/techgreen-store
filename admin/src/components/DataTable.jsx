import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import './DataTable.css';

function DataTable({
  columns = [],
  data = [],
  onSort,
  onRowClick,
  loading = false,
  emptyMessage,
  // Selection props
  selectable = false,
  selectedIds = [],
  onSelectAll,
  onSelectRow,
  idField = 'id',
  // Pagination props
  pagination = null, // { page, pageSize, total, onPageChange, onPageSizeChange }
}) {
  const { t } = useTranslation();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Handle Column Sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    if (onSort) {
      onSort(key, direction);
    }
  };

  // Helper to render sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} /> 
      : <ArrowDown size={14} />;
  };

  // Helper to check if row is selected
  const isSelected = (id) => selectedIds.includes(id);

  // Helper: Are all visible rows selected?
  const allSelected = data.length > 0 && data.every(row => isSelected(row[idField]));

  // --- RENDERING ---

  if (loading) {
    return (
      <div className="data-table-container">
        <div className="data-table-loading">
          <div className="spinner"></div>
              <span>{t('table.loading')}</span>
        </div>
      </div>
    );
  }

  if (!Array.isArray(columns) || columns.length === 0) {
    return <div className="data-table-container"><div className="data-table-empty">{t('table.no_columns')}</div></div>;
  }

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="data-table-container">
        <div className="data-table-empty">
          <div style={{ fontSize: '2rem', opacity: 0.5 }}>📂</div>
          {emptyMessage || t('dashboard.no_data')}
        </div>
      </div>
    );
  }

  // --- PAGINATION HELPERS ---
  const renderPagination = () => {
    if (!pagination) return null;
    const { page, pageSize, total, onPageChange, onPageSizeChange } = pagination;
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1 && total <= pageSize) return null;

    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    // Build page numbers to show: always first, last, current ±1
    const pageNumbers = [];
    const delta = 1;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        pageNumbers.push(i);
      }
    }
    // Insert ellipsis markers
    const withEllipsis = [];
    let prev = null;
    for (const num of pageNumbers) {
      if (prev !== null && num - prev > 1) withEllipsis.push('...');
      withEllipsis.push(num);
      prev = num;
    }

    return (
      <div className="pagination-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="pagination-info">
            {t('table.showing', { from, to, total }) || `${from}–${to} of ${total}`}
          </span>
          {onPageSizeChange && (
            <select
              style={{
                fontSize: '0.8rem',
                padding: '4px 8px',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                cursor: 'pointer',
              }}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {[25, 50, 100].map(n => (
                <option key={n} value={n}>{n} / {t('table.page') || 'page'}</option>
              ))}
            </select>
          )}
        </div>

        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            title={t('table.prev_page') || 'Previous page'}
          >
            <ChevronLeft size={16} />
          </button>

          {withEllipsis.map((item, i) =>
            item === '...' ? (
              <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'hsl(var(--muted-foreground))' }}>…</span>
            ) : (
              <button
                key={item}
                className={`pagination-btn ${item === page ? 'active' : ''}`}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            )
          )}

          <button
            className="pagination-btn"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            title={t('table.next_page') || 'Next page'}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="data-table-container">
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {/* CHECKBOX HEADER */}
              {selectable && (
                <th className="col-checkbox">
                  <input 
                    type="checkbox" 
                    className="table-checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
                  />
                </th>
              )}

              {/* DATA HEADERS */}
              {columns.map((column, index) => (
                <th
                  key={column.key || index}
                  onClick={() => column.sortable && handleSort(column.key)}
                  className={column.sortable ? 'sortable' : ''}
                  style={{ width: column.width }}
                >
                  <div className="th-content">
                    {column.label}
                    {column.sortable && (
                      <span className="sort-icon">{getSortIcon(column.key)}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {data.map((row, rowIndex) => {
              const rowId = row[idField];
              const selected = selectable ? isSelected(rowId) : false;

              return (
                <tr
                  key={rowId || rowIndex}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`${onRowClick ? 'clickable' : ''} ${selected ? 'selected' : ''}`}
                >
                  {/* CHECKBOX CELL */}
                  {selectable && (
                    <td className="col-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="table-checkbox"
                        checked={selected}
                        onChange={() => onSelectRow && onSelectRow(rowId)}
                      />
                    </td>
                  )}

                  {/* DATA CELLS */}
                  {columns.map((column, colIndex) => (
                    <td key={column.key || colIndex}>
                      {column.render
                        ? column.render(row[column.key], row) // Custom Render
                        : (row[column.key] != null ? row[column.key] : '-') // Default Render
                      }
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </div>
  );
}

export default DataTable;