import { jsPDF } from 'jspdf';

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

const REPORT_COLUMNS = [
  { key: 'productName', width: 40 },
  { key: 'warehouse', width: 30 },
  { key: 'stockQuantity', width: 14, align: 'right' },
  { key: 'purchasePrice', width: 31, align: 'right' },
  { key: 'calculatedCost', width: 31, align: 'right' },
  { key: 'sellingPrice', width: 31, align: 'right' },
  { key: 'productActive', width: 13, align: 'center' }
];

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

function getMoneyParts(value) {
  const text = String(value ?? '-').trim();
  if (!text || text === '-') return { amount: text || '-', currency: '' };

  const match = text.match(/^(.*?)[\s\u00a0\u202f]+([A-Za-z]{1,4})$/u);
  if (!match) return { amount: text, currency: '' };

  return {
    amount: match[1].trim(),
    currency: match[2].trim()
  };
}

function renderMoneyValue(value) {
  const { amount, currency } = getMoneyParts(value);
  if (!currency) return escapeHtml(amount);

  return `<span class="money"><span class="money-amount">${escapeHtml(amount)}</span><span class="money-currency">${escapeHtml(currency)}</span></span>`;
}

function getLocalizedText(value, language = 'fr') {
  if (value && typeof value === 'object') {
    return value[language] || value.fr || value.ar || value.en || '';
  }
  return value || '';
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasMeaningfulDecimals(number) {
  return Math.abs(number - Math.round(number)) >= 0.005;
}

function formatReportNumber(value, locale, { maxFractionDigits = 2 } = {}) {
  const number = toNumberOrNull(value);
  if (number === null) return null;

  const formatter = new Intl.NumberFormat(locale || 'fr-DZ', {
    useGrouping: false,
    minimumFractionDigits: hasMeaningfulDecimals(number) ? Math.min(2, maxFractionDigits) : 0,
    maximumFractionDigits: maxFractionDigits
  });

  return formatter
    .format(number)
    .replace(/[\u00a0\u202f]/g, '')
    .replace(/\//g, '')
    .replace(/\s+/g, '');
}

function formatMoney(value, locale) {
  const number = formatReportNumber(value, locale);
  return number === null ? '-' : `${number} DA`;
}

function formatQuantity(value, locale) {
  const number = formatReportNumber(value, locale, { maxFractionDigits: 2 });
  return number === null ? '0' : number;
}

function getWarehouseRows(product, labels, locale) {
  const warehouseStock = product.warehouseStock || product.warehouse_stock || [];

  if (Array.isArray(warehouseStock) && warehouseStock.length > 0) {
    return warehouseStock.map((stockEntry) => ({
      warehouse: stockEntry.warehouse_name || stockEntry.warehouseName || `${labels.warehouseFallback} #${stockEntry.warehouse_id || stockEntry.warehouseId || '-'}`,
      stockQuantity: formatQuantity(stockEntry.quantity, locale)
    }));
  }

  return [{
    warehouse: product.warehouseName || product.warehouse_name || labels.allWarehouses,
    stockQuantity: formatQuantity(product.totalStock ?? product.total_stock ?? product.stock, locale)
  }];
}

function getProductName(product, language) {
  return getLocalizedText(product.product_name ?? product.productName ?? product.name, language) || '-';
}

function getPurchasePrice(product) {
  return toNumberOrNull(product.costPrice ?? product.cost_price);
}

function getProductFees(product) {
  return toNumberOrNull(product.productFees ?? product.product_fees) || 0;
}

function getCalculatedCost(product) {
  const explicit = toNumberOrNull(product.calculatedCost ?? product.calculated_cost);
  if (explicit !== null) return explicit;

  const purchasePrice = getPurchasePrice(product);
  if (purchasePrice === null) return null;
  return purchasePrice + getProductFees(product);
}

function coerceActiveValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'active', 'published', 'enabled'].includes(normalized)) return true;
  if (['false', '0', 'no', 'inactive', 'draft', 'archived', 'disabled'].includes(normalized)) return false;

  return null;
}

function getProductActiveLabel(product, labels) {
  const activeValue = coerceActiveValue(product.is_active ?? product.isActive ?? product.active ?? product.status);
  if (activeValue === null) return '-';
  return activeValue ? (labels.activeYes || labels.active) : (labels.activeNo || labels.inactive);
}

function getSellingPrice(product) {
  return toNumberOrNull(product.currentPrice ?? product.current_price ?? product.price);
}

export function createInventoryReport({ categories, productsByCategory, labels, language, locale }) {
  const generatedAt = new Date();
  const generatedAtText = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(generatedAt);

  const sections = categories.map((category) => {
    const categoryId = Number(category.category_id ?? category.id);
    const products = productsByCategory.get(categoryId) || [];
    const rows = products.flatMap((product) => {
      const base = {
        productName: getProductName(product, language),
        purchasePrice: formatMoney(getPurchasePrice(product), locale),
        calculatedCost: formatMoney(getCalculatedCost(product), locale),
        sellingPrice: formatMoney(getSellingPrice(product), locale),
        productActive: getProductActiveLabel(product, labels)
      };

      return getWarehouseRows(product, labels, locale).map((warehouseRow) => ({
        ...base,
        warehouse: warehouseRow.warehouse,
        stockQuantity: warehouseRow.stockQuantity
      }));
    });

    return {
      id: categoryId,
      title: getLocalizedText(category.category_name, language) || '-',
      productCount: products.length,
      rows
    };
  });

  return {
    title: labels.title,
    generatedAt,
    generatedAtText,
    locale,
    language,
    labels,
    sections
  };
}

export function getReportFilename(report) {
  const dateStamp = report.generatedAt.toISOString().slice(0, 10);
  const categoryPart = report.sections.length === 1
    ? report.sections[0].title
    : report.labels.selectedFilename;
  const safeName = String(categoryPart || 'categories')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'categories';

  return `category-inventory-${safeName}-${dateStamp}.pdf`;
}

export function createInventoryReportHtml(report, { autoPrint = false } = {}) {
  const { labels } = report;
  const columnHeadings = `
    <tr>
      <th>${escapeHtml(labels.productName)}</th>
      <th>${escapeHtml(labels.warehouse)}</th>
      <th class="number">${escapeHtml(labels.stockQuantity)}</th>
      <th class="number">${escapeHtml(labels.purchasePrice)}</th>
      <th class="number">${escapeHtml(labels.calculatedCost)}</th>
      <th class="number">${escapeHtml(labels.sellingPrice)}</th>
      <th class="center">${escapeHtml(labels.activeProduct)}</th>
    </tr>
  `;

  const sections = report.sections.map((section) => {
    const rows = section.rows.length > 0
      ? section.rows.map((row) => `
          <tr>
            <td class="text-cell">${escapeHtml(row.productName)}</td>
            <td class="text-cell">${escapeHtml(row.warehouse)}</td>
            <td class="number quantity-cell">${escapeHtml(row.stockQuantity)}</td>
            <td class="money-cell">${renderMoneyValue(row.purchasePrice)}</td>
            <td class="money-cell">${renderMoneyValue(row.calculatedCost)}</td>
            <td class="money-cell">${renderMoneyValue(row.sellingPrice)}</td>
            <td class="center status-cell">${escapeHtml(row.productActive)}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="7" class="empty-cell">${escapeHtml(labels.emptyCategory)}</td></tr>`;

    return `
      <section class="category-section">
        <header class="category-heading">
          <h2>${escapeHtml(section.title)}</h2>
          <span>${escapeHtml(section.productCount.toLocaleString(report.locale))} ${escapeHtml(labels.products)}</span>
        </header>
        <table class="inventory-table">
          <colgroup>
            <col class="col-product" />
            <col class="col-warehouse" />
            <col class="col-stock" />
            <col class="col-money" />
            <col class="col-money" />
            <col class="col-money" />
            <col class="col-active" />
          </colgroup>
          <thead>${columnHeadings}</thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
    `;
  }).join('');

  return `
    <!doctype html>
    <html lang="${escapeHtml(report.language || 'fr')}" dir="${report.language === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(report.title)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 13mm 10mm 17mm;
            @bottom-left { content: "${escapeHtml(labels.generatedAt)}: ${escapeHtml(report.generatedAtText)}"; }
            @bottom-right { content: "${escapeHtml(labels.page)} " counter(page) " / " counter(pages); }
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #ffffff;
            color: #111827;
            font-family: Arial, "Segoe UI", sans-serif;
            font-size: 10.5px;
            line-height: 1.35;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-toolbar {
            position: sticky;
            top: 0;
            z-index: 2;
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 10px 0;
            background: #ffffff;
          }
          .print-toolbar button {
            border: 1px solid #111827;
            border-radius: 6px;
            padding: 8px 12px;
            background: #111827;
            color: #ffffff;
            font-weight: 700;
            cursor: pointer;
          }
          .report-title {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 18px;
            padding-bottom: 10px;
            border-bottom: 2px solid #111827;
          }
          h1 { margin: 0 0 4px; font-size: 22px; line-height: 1.1; }
          .meta { margin: 0; color: #4b5563; }
          .summary { text-align: end; color: #374151; font-weight: 700; }
          .category-section { break-before: page; page-break-before: always; padding-top: 1mm; }
          .category-section:first-of-type { break-before: auto; page-break-before: auto; margin-top: 12px; }
          .category-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 8px 10px;
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            border-bottom: 0;
          }
          h2 { margin: 0; font-size: 15px; line-height: 1.2; }
          .category-heading span { color: #065f46; font-weight: 700; white-space: nowrap; }
          .inventory-table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #d1d5db; }
          .inventory-table col.col-product { width: 22%; }
          .inventory-table col.col-warehouse { width: 16%; }
          .inventory-table col.col-stock { width: 7%; }
          .inventory-table col.col-money { width: 16%; }
          .inventory-table col.col-active { width: 7%; }
          thead { display: table-header-group; }
          .inventory-table th,
          .inventory-table td {
            padding: 5px 5px;
            border: 1px solid #e5e7eb;
            text-align: start;
            vertical-align: top;
            overflow: hidden;
            font-size: 9px;
            line-height: 1.2;
          }
          .inventory-table th {
            background: #fafafa;
            color: #374151;
            font-size: 8px;
            line-height: 1.15;
            text-transform: uppercase;
            letter-spacing: 0;
            overflow-wrap: normal;
          }
          .text-cell { overflow-wrap: anywhere; word-break: normal; }
          .number { text-align: end; }
          .quantity-cell { white-space: nowrap; font-variant-numeric: tabular-nums; }
          .money-cell { text-align: end; padding-inline: 3px; white-space: normal; }
          .money {
            display: grid;
            justify-items: end;
            align-items: baseline;
            gap: 1px;
            max-width: 100%;
            min-width: 0;
            line-height: 1.05;
            font-variant-numeric: tabular-nums;
          }
          .money-amount { max-width: 100%; white-space: normal; overflow-wrap: anywhere; word-break: break-word; font-size: 8.2px; }
          .money-currency { white-space: nowrap; color: #4b5563; font-size: 6.8px; font-weight: 700; letter-spacing: 0; }
          .center { text-align: center; }
          .status-cell { font-weight: 700; font-size: 8px; white-space: nowrap; }
          .empty-cell { text-align: center; color: #6b7280; padding: 14px; }
          .print-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-between;
            color: #6b7280;
            font-size: 9px;
            border-top: 1px solid #e5e7eb;
            padding-top: 4px;
          }
          @media print {
            .print-toolbar { display: none; }
            .print-footer { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="print-toolbar">
          <button type="button" onclick="window.print()">${escapeHtml(labels.print)}</button>
        </div>
        <header class="report-title">
          <div>
            <h1>${escapeHtml(report.title)}</h1>
            <p class="meta">${escapeHtml(labels.generatedAt)}: ${escapeHtml(report.generatedAtText)}</p>
          </div>
          <div class="summary">${escapeHtml(report.sections.length.toLocaleString(report.locale))} ${escapeHtml(labels.categories)}</div>
        </header>
        <main>${sections}</main>
        <footer class="print-footer">
          <span>${escapeHtml(labels.generatedAt)}: ${escapeHtml(report.generatedAtText)}</span>
          <span>${escapeHtml(labels.pageNumbersPrintHint)}</span>
        </footer>
        ${autoPrint ? '<script>window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 250); });</script>' : ''}
      </body>
    </html>
  `;
}

function drawPageFooter(doc, report, pageNumber, pageCount) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(229, 231, 235);
  doc.line(10, pageHeight - 12, pageWidth - 10, pageHeight - 12);
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`${report.labels.generatedAt}: ${report.generatedAtText}`, 10, pageHeight - 7);
  doc.text(`${report.labels.page} ${pageNumber} / ${pageCount}`, pageWidth - 10, pageHeight - 7, { align: 'right' });
}

function getColumnTextX(column, x) {
  if (column.align === 'right') return x + column.width - 2;
  if (column.align === 'center') return x + (column.width / 2);
  return x + 2;
}

function wrapPdfCellText(doc, value, column) {
  return doc.splitTextToSize(String(value ?? ''), Math.max(4, column.width - 4));
}

function drawTableHeader(doc, report, y) {
  const margin = 10;
  let x = margin;
  const headers = [
    report.labels.productName,
    report.labels.warehouse,
    report.labels.stockQuantity,
    report.labels.purchasePrice,
    report.labels.calculatedCost,
    report.labels.sellingPrice,
    report.labels.activeProduct
  ];

  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(209, 213, 219);
  const headerHeight = 9.5;
  doc.rect(margin, y, 190, headerHeight, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(55, 65, 81);

  REPORT_COLUMNS.forEach((column, index) => {
    const textX = getColumnTextX(column, x);
    const headerText = wrapPdfCellText(doc, headers[index], column);
    doc.text(headerText, textX, y + 3.5, { align: column.align || 'left', maxWidth: column.width - 4, lineHeightFactor: 1.05 });
    if (index < REPORT_COLUMNS.length - 1) {
      doc.line(x + column.width, y, x + column.width, y + headerHeight);
    }
    x += column.width;
  });

  return y + headerHeight;
}

function drawCategoryHeader(doc, report, section, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text(section.title, 10, y, { maxWidth: 145 });
  doc.setFontSize(8.5);
  doc.setTextColor(6, 95, 70);
  doc.text(`${section.productCount.toLocaleString(report.locale)} ${report.labels.products}`, 200, y, { align: 'right' });
  return y + 7;
}

function addReportTitle(doc, report) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text(report.title, 10, 14, { maxWidth: 145 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`${report.labels.generatedAt}: ${report.generatedAtText}`, 10, 20);
  doc.text(`${report.sections.length.toLocaleString(report.locale)} ${report.labels.categories}`, 200, 14, { align: 'right' });
  doc.setDrawColor(17, 24, 39);
  doc.line(10, 24, 200, 24);
}

function addNewPage(doc, report, includeTitle = false) {
  doc.addPage('a4', 'portrait');
  if (includeTitle) {
    addReportTitle(doc, report);
    return 32;
  }
  return 16;
}

export function createInventoryReportPdfBlob(report) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomLimit = pageHeight - 18;
  let y = 32;

  addReportTitle(doc, report);

  report.sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) {
      y = addNewPage(doc, report, true);
    }

    y = drawCategoryHeader(doc, report, section, y);
    y = drawTableHeader(doc, report, y);

    if (section.rows.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      doc.text(report.labels.emptyCategory, 105, y + 7, { align: 'center' });
      y += 12;
      return;
    }

    section.rows.forEach((row) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      const values = [
        wrapPdfCellText(doc, row.productName, REPORT_COLUMNS[0]),
        wrapPdfCellText(doc, row.warehouse, REPORT_COLUMNS[1]),
        wrapPdfCellText(doc, row.stockQuantity, REPORT_COLUMNS[2]),
        wrapPdfCellText(doc, row.purchasePrice, REPORT_COLUMNS[3]),
        wrapPdfCellText(doc, row.calculatedCost, REPORT_COLUMNS[4]),
        wrapPdfCellText(doc, row.sellingPrice, REPORT_COLUMNS[5]),
        wrapPdfCellText(doc, row.productActive, REPORT_COLUMNS[6])
      ];
      const lineCount = Math.max(...values.map((value) => value.length), 1);
      const rowHeight = Math.max(7.5, lineCount * 3.2 + 3.8);

      if (y + rowHeight > bottomLimit) {
        y = addNewPage(doc, report, false);
        y = drawCategoryHeader(doc, report, section, y);
        y = drawTableHeader(doc, report, y);
      }

      let x = 10;
      doc.setDrawColor(229, 231, 235);
      doc.rect(10, y, 190, rowHeight);
      doc.setTextColor(17, 24, 39);

      REPORT_COLUMNS.forEach((column, index) => {
        const text = values[index];
        const textX = getColumnTextX(column, x);
        const textY = y + 4.8;
        doc.text(text, textX, textY, { align: column.align || 'left', maxWidth: column.width - 4, lineHeightFactor: 1.08 });
        if (index < REPORT_COLUMNS.length - 1) {
          doc.line(x + column.width, y, x + column.width, y + rowHeight);
        }
        x += column.width;
      });

      y += rowHeight;
    });
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    drawPageFooter(doc, report, page, pageCount);
  }

  return doc.output('blob');
}

export function saveInventoryReportPdf(report) {
  const blob = createInventoryReportPdfBlob(report);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getReportFilename(report);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return blob;
}
