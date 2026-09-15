// Professional barcode printing helper for admin panel
// Uses JsBarcode to render an SVG with confirmation dialog
// Displays selling price instead of SKU for better inventory management

import JsBarcode from 'jsbarcode';
import i18n from '../i18n/config';

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

function formatPrice(price) {
  if (!price) return 'N/A';
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(parseFloat(price));
}

/**
 * Create and show professional confirmation dialog before printing
 * @param {object} options - Dialog options including product details
 * @returns {Promise<object|null>} - Selected print fields, or null if user cancels
 */
function showPrintConfirmationDialog(options) {
  return new Promise((resolve) => {
    const { productName, price, barcode } = options;
    const priceDisplay = formatPrice(price);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    `;
    overlay.tabIndex = -1;

    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      padding: 32px;
      max-width: 480px;
      min-width: 360px;
      animation: slideUp 0.3s ease-out;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .print-dialog-header {
        display: flex;
        align-items: center;
        margin-bottom: 24px;
        gap: 12px;
      }
      .print-dialog-icon {
        width: 40px;
        height: 40px;
        background: #e0f2fe;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .print-dialog-header-text h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
      }
      .print-dialog-header-text p {
        margin: 4px 0 0 0;
        font-size: 14px;
        color: #64748b;
      }
      .print-dialog-content {
        margin-bottom: 24px;
      }
      .print-dialog-hint {
        margin: 0 0 10px;
        font-size: 13px;
        color: #64748b;
      }
      .print-dialog-option-row {
        display: grid;
        grid-template-columns: 22px 1fr;
        align-items: center;
        gap: 10px;
        padding: 12px 0;
        border-bottom: 1px solid #e2e8f0;
        cursor: pointer;
      }
      .print-dialog-option-row:last-child {
        border-bottom: none;
      }
      .print-dialog-option-row input {
        width: 18px;
        height: 18px;
        margin: 0;
        cursor: pointer;
        accent-color: #059669;
      }
      .print-dialog-option-body {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        min-width: 0;
      }
      .print-dialog-label {
        font-size: 13px;
        color: #64748b;
        font-weight: 500;
      }
      .print-dialog-value {
        font-size: 13px;
        color: #1e293b;
        font-weight: 600;
        text-align: right;
        max-width: 220px;
        word-break: break-word;
      }
      .print-dialog-price {
        color: #059669;
        font-size: 16px;
      }
      .print-dialog-warning {
        display: none;
        margin: 12px 0 0;
        padding: 10px 12px;
        border-radius: 6px;
        background: #fef2f2;
        color: #991b1b;
        font-size: 13px;
      }
      .print-dialog-warning.visible {
        display: block;
      }
      .print-dialog-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      .print-dialog-btn {
        padding: 8px 16px;
        border-radius: 6px;
        border: none;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .print-dialog-btn-cancel {
        background: #f1f5f9;
        color: #475569;
      }
      .print-dialog-btn-cancel:hover {
        background: #e2e8f0;
      }
      .print-dialog-btn-confirm {
        background: #059669;
        color: white;
      }
      .print-dialog-btn-confirm:hover:not(:disabled) {
        background: #047857;
      }
      .print-dialog-btn-confirm:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(style);

    // Create header
    const header = document.createElement('div');
    header.className = 'print-dialog-header';
    header.innerHTML = `
      <div class="print-dialog-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0369a1" stroke-width="2">
          <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
          <path d="M6 14h12v8H6z"/>
        </svg>
      </div>
      <div class="print-dialog-header-text">
        <h3>${escapeHtml(i18n.t('barcode.printLabel'))}</h3>
        <p>${escapeHtml(i18n.t('barcode.printDialogDesc'))}</p>
      </div>
    `;

    // Create content with checked-by-default print fields
    const content = document.createElement('div');
    content.className = 'print-dialog-content';
    content.innerHTML = `
      <p class="print-dialog-hint">${escapeHtml(i18n.t('barcode.printDialogHint'))}</p>
      <label class="print-dialog-option-row" for="print-include-title">
        <input type="checkbox" id="print-include-title" checked />
        <span class="print-dialog-option-body">
          <span class="print-dialog-label">${escapeHtml(i18n.t('barcode.productName'))}</span>
          <span class="print-dialog-value">${escapeHtml(productName || 'N/A')}</span>
        </span>
      </label>
      <label class="print-dialog-option-row" for="print-include-price">
        <input type="checkbox" id="print-include-price" checked />
        <span class="print-dialog-option-body">
          <span class="print-dialog-label">${escapeHtml(i18n.t('barcode.sellingPrice'))}</span>
          <span class="print-dialog-value print-dialog-price">${escapeHtml(priceDisplay)}</span>
        </span>
      </label>
      <label class="print-dialog-option-row" for="print-include-barcode">
        <input type="checkbox" id="print-include-barcode" checked />
        <span class="print-dialog-option-body">
          <span class="print-dialog-label">${escapeHtml(i18n.t('barcode.label'))}:</span>
          <span class="print-dialog-value">${escapeHtml(barcode)}</span>
        </span>
      </label>
      <div class="print-dialog-warning" id="print-dialog-warning">${escapeHtml(i18n.t('barcode.selectOne'))}</div>
    `;

    const titleCheckbox = content.querySelector('#print-include-title');
    const priceCheckbox = content.querySelector('#print-include-price');
    const barcodeCheckbox = content.querySelector('#print-include-barcode');
    const warning = content.querySelector('#print-dialog-warning');

    // Create actions
    const actions = document.createElement('div');
    actions.className = 'print-dialog-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'print-dialog-btn print-dialog-btn-cancel';
    cancelBtn.textContent = i18n.t('common.cancel');

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'print-dialog-btn print-dialog-btn-confirm';
    confirmBtn.textContent = i18n.t('barcode.printLabel');

    const getSelection = () => ({
      includeProductName: titleCheckbox.checked,
      includePrice: priceCheckbox.checked,
      includeBarcode: barcodeCheckbox.checked
    });

    const updateConfirmState = () => {
      const selection = getSelection();
      const hasSelection = selection.includeProductName || selection.includePrice || selection.includeBarcode;
      confirmBtn.disabled = !hasSelection;
      warning.classList.toggle('visible', !hasSelection);
    };

    [titleCheckbox, priceCheckbox, barcodeCheckbox].forEach((checkbox) => {
      checkbox.addEventListener('change', updateConfirmState);
    });

    // Handle button clicks
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
      style.remove();
      resolve(null);
    });

    confirmBtn.addEventListener('click', () => {
      if (confirmBtn.disabled) return;
      const selection = getSelection();
      overlay.remove();
      style.remove();
      resolve(selection);
    });

    // Handle escape key
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        style.remove();
        resolve(null);
      }
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    updateConfirmState();
    titleCheckbox.focus();
  });
}

export async function printSingleBarcode({ barcode, sku = '', productName = '', price = '', width = '200px', height = '150px' }) {
  if (!barcode) throw new Error('Barcode is required');

  // Show confirmation dialog with printable field selection
  const printSelection = await showPrintConfirmationDialog({
    productName,
    price,
    barcode
  });

  if (!printSelection) {
    return; // User cancelled
  }

  let barcodeSvg = '';
  if (printSelection.includeBarcode) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, barcode, {
      format: 'EAN13',
      width: 2,
      height: 60,
      displayValue: true,
      margin: 10
    });
    barcodeSvg = svg.outerHTML;
  }

  // Format price for display
  const priceDisplay = price
    ? new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(price))
    : '';

  const productNameHtml = printSelection.includeProductName
    ? `<div class="name">${escapeHtml(productName || '')}</div>`
    : '';
  const priceHtml = printSelection.includePrice
    ? `<div class="price">${escapeHtml(priceDisplay)}</div>`
    : '';

  // Build printable HTML with the same default layout, allowing selected parts to be hidden
  const html = `<!DOCTYPE html>
  <html>
    <head>
      <title>${escapeHtml(i18n.t('barcode.printTitle', { name: productName }))}</title>
      <style>
        body { margin: 0; padding: 12px; font-family: Arial, sans-serif; background: #f5f5f5; }
        .label-container { display: flex; flex-direction: column; gap: 10px; }
        .label { width: ${width}; height: ${height}; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px solid #333; background: white; page-break-after: always; }
        .name { font-size: 14px; font-weight: 600; margin-bottom: 6px; text-align: center; max-width: 180px; word-wrap: break-word; }
        .price { font-size: 16px; font-weight: bold; margin-top: 6px; color: #059669; letter-spacing: 0.5px; }
        svg { width: 90%; max-height: 50px; }
        @media print {
          body { margin: 0; padding: 8px; background: white; }
          .label { border: 2px solid #333; }
        }
      </style>
    </head>
    <body>
      <div class="label-container">
        <div class="label">
          ${productNameHtml}
          ${barcodeSvg}
          ${priceHtml}
        </div>
      </div>
      <script>
        window.onload = () => {
          window.print();
          setTimeout(() => window.close(), 500);
        };
      </script>
    </body>
  </html>`;

  // Open print window
  const printWindow = window.open('', '_blank', 'width=500,height=400');
  if (!printWindow) throw new Error(i18n.t('barcode.popupBlocked'));
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
