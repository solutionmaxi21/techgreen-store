import { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, Printer, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate } from '../utils/formatters';
import logoSrc from '../assets/logo.jpg';
import stampSrc from '../assets/stamp.png';
import './InvoiceModal.css';

// ============================================
// Company Configuration
// Update these values with your real business info
// ============================================
const COMPANY_INFO = {
  ownerName: 'MELIANI Moufid',
  address: '7 Lots CFPA 21003 – EL HARROUCH Skikda (DZ) Algérie',
  rc: '06A0738153',
  nif: '180240101278195',
  nis: '198024010127835',
  ai: '21235186571',
  brandName: 'SOLUTION MAXI',
  tagline: 'Plus de temps à perdre !',
  phone: '0555 00 00 00 / 0666 00 00 00',
  email: 'contact@solutionmaxi.dz',
  website: 'www.solutionmaxi.dz',
};

/**
 * Generate invoice number from order data
 * Format: XXX/YYYY (e.g., 142/2026)
 */
const generateInvoiceNumber = (order) => {
  const date = new Date(order.createdAt || order.date || Date.now());
  const year = date.getFullYear();
  const orderId = order.id || order.orderNumber?.replace(/\D/g, '') || '000';
  const paddedId = String(orderId).padStart(3, '0');
  return `${paddedId}/${year}`;
};

/**
 * Convert number to French words for total amount
 */
const numberToFrenchWords = (num) => {
  if (num === 0) return 'zéro';

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  const convertGroup = (n) => {
    if (n === 0) return '';
    if (n < 20) return units[n];
    if (n < 70) {
      const t = Math.floor(n / 10);
      const u = n % 10;
      if (u === 0) return tens[t];
      if (u === 1 && t !== 8) return `${tens[t]} et un`;
      return `${tens[t]}-${units[u]}`;
    }
    if (n < 80) {
      const u = n - 60;
      if (u === 1) return 'soixante et onze';
      return `soixante-${units[u]}`;
    }
    if (n < 100) {
      const u = n - 80;
      if (u === 0) return 'quatre-vingts';
      return `quatre-vingt-${units[u]}`;
    }
    if (n < 200) {
      const rest = n - 100;
      return rest === 0 ? 'cent' : `cent ${convertGroup(rest)}`;
    }
    if (n < 1000) {
      const h = Math.floor(n / 100);
      const rest = n % 100;
      const prefix = `${units[h]} cent`;
      return rest === 0 ? `${prefix}s` : `${prefix} ${convertGroup(rest)}`;
    }
    return String(n);
  };

  const integer = Math.floor(Math.abs(num));

  if (integer === 0) return 'zéro';
  if (integer >= 1000000) {
    const millions = Math.floor(integer / 1000000);
    const rest = integer % 1000000;
    let result = millions === 1 ? 'un million' : `${convertGroup(millions)} millions`;
    if (rest > 0) result += ` ${numberToFrenchWords(rest)}`;
    return result;
  }
  if (integer >= 1000) {
    const thousands = Math.floor(integer / 1000);
    const rest = integer % 1000;
    let result = thousands === 1 ? 'mille' : `${convertGroup(thousands)} mille`;
    if (rest > 0) result += ` ${convertGroup(rest)}`;
    return result;
  }
  return convertGroup(integer);
};

function InvoiceModal({ order, isOpen, onClose }) {
  const { t } = useTranslation();
  const invoiceRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  // ============================================
  // Print: uses a hidden iframe (works in Electron)
  // ============================================
  const handlePrint = useCallback(() => {
    const printContent = invoiceRef.current;
    if (!printContent) return;

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Facture</title>
        <style>${getInvoicePrintStyles()}</style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `);
    doc.close();

    // Wait for images to load, then print
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          console.error('Print failed:', e);
          // Fallback: try window.print on main window
          window.print();
        }
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    };
  }, []);

  // ============================================
  // Download: html2canvas + jsPDF → direct .pdf file
  // ============================================
  const handleDownload = useCallback(async () => {
    const el = invoiceRef.current;
    if (!el || downloading) return;

    setDownloading(true);
    try {
      // Save original styles and temporarily remove paper chrome
      // so the captured content fills edge-to-edge (no double margins)
      const origStyles = {
        padding: el.style.padding,
        maxWidth: el.style.maxWidth,
        boxShadow: el.style.boxShadow,
        borderRadius: el.style.borderRadius,
        margin: el.style.margin,
      };
      el.style.padding = '12mm';
      el.style.maxWidth = 'none';
      el.style.boxShadow = 'none';
      el.style.borderRadius = '0';
      el.style.margin = '0';

      // Render at high resolution
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Restore original styles immediately
      Object.assign(el.style, origStyles);

      // A4 in mm
      const A4_W = 210;
      const A4_H = 297;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgData = canvas.toDataURL('image/png');
      const canvasRatio = canvas.height / canvas.width;
      const pdfHeight = A4_W * canvasRatio;

      // Place edge-to-edge, scale down only if taller than one page
      if (pdfHeight > A4_H) {
        const scaledWidth = A4_H / canvasRatio;
        const xOffset = (A4_W - scaledWidth) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, 0, scaledWidth, A4_H);
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, A4_W, pdfHeight);
      }

      const orderNum = order.orderNumber || order.id || 'facture';
      pdf.save(`Facture-${orderNum}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setDownloading(false);
    }
  }, [order, downloading]);

  if (!isOpen || !order) return null;

  const invoiceNumber = generateInvoiceNumber(order);
  const invoiceDate = formatDate(order.createdAt || order.date);
  const items = order.items || [];
  const subtotal = order.subtotal || 0;
  const shipping = order.shipping || 0;
  const tax = order.tax || 0;
  const total = order.total || 0;

  // Calculate HT and TVA from total (19% TVA in Algeria)
  const TVA_RATE = 0.19;
  const totalHT = Math.round(total / (1 + TVA_RATE));
  const tvaAmount = total - totalHT;

  const customerName = order.customerName || order.customer?.name || '';
  const customerPhone = order.customerPhone || order.customer?.phone || '';
  const address = order.shippingAddress;

  const totalInWords = numberToFrenchWords(Math.round(total));

  return (
    <div className="invoice-modal-overlay" onClick={onClose}>
      <div className="invoice-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header with Actions */}
        <div className="invoice-modal-header">
          <h2>{t('invoice.title')} — {invoiceNumber}</h2>
          <div className="invoice-modal-actions">
            <button className="btn-secondary" onClick={handlePrint} title={t('invoice.print')}>
              <Printer size={18} />
              {t('invoice.print')}
            </button>
            <button
              className="btn-primary"
              onClick={handleDownload}
              disabled={downloading}
              title={t('invoice.downloadPdf')}
            >
              {downloading ? <Loader2 size={18} className="spin" /> : <Download size={18} />}
              {downloading ? t('common.processing') : t('invoice.downloadPdf')}
            </button>
            <button className="invoice-close-btn" onClick={onClose} title={t('common.cancel')}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Invoice Content (Printable Area) */}
        <div className="invoice-scroll-area">
          <div className="invoice-paper" ref={invoiceRef}>

            {/* === TOP HEADER: Company Info (left) + Logo (right) === */}
            <div className="inv-top-header">
              <div className="inv-company-box">
                <div className="inv-company-owner">{COMPANY_INFO.ownerName}</div>
                <div className="inv-company-address">{COMPANY_INFO.address}</div>
                <div className="inv-company-reg">{t('invoice.rc')} : {COMPANY_INFO.rc}</div>
                <div className="inv-company-reg">{t('invoice.nif')} : {COMPANY_INFO.nif}</div>
                <div className="inv-company-reg">{t('invoice.nis')} : {COMPANY_INFO.nis}</div>
                <div className="inv-company-reg">A.I : {COMPANY_INFO.ai}</div>
              </div>
              <div className="inv-logo-section">
                <img src={logoSrc} alt={COMPANY_INFO.brandName} className="inv-logo" />
                <div className="inv-tagline">{COMPANY_INFO.tagline}</div>
              </div>
            </div>

            {/* === FACTURE TITLE === */}
            <div className="inv-title">
              {t('invoice.invoiceNumber')}: {invoiceNumber}
            </div>

            {/* === RED SEPARATOR === */}
            <div className="inv-red-separator" />

            {/* === CLIENT + DATE ROW === */}
            <div className="inv-client-date-row">
              <div className="inv-client-box">
                <div className="inv-client-label">{t('invoice.billedTo')} :</div>
                <div className="inv-client-name">
                  {customerName}
                  {customerPhone && <span className="inv-client-phone"> — {customerPhone}</span>}
                </div>
                {address && (
                  <div className="inv-client-addr">
                    {[address.street, address.city, address.state].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
              <div className="inv-date-box">
                {t('invoice.dateLabel')} : {invoiceDate}
              </div>
            </div>

            {/* === ITEMS TABLE === */}
            <table className="inv-table">
              <thead>
                <tr>
                  <th className="inv-col-num">{t('invoice.itemNumber')}</th>
                  <th className="inv-col-desc">{t('invoice.designation')}</th>
                  <th className="inv-col-qty">{t('invoice.quantityShort')}</th>
                  <th className="inv-col-price">{t('invoice.unitPriceHt')}</th>
                  <th className="inv-col-total">{t('invoice.amountHt')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const unitPriceHT = Math.round(item.price / (1 + TVA_RATE));
                  const lineTotal = unitPriceHT * item.quantity;
                  return (
                    <tr key={index}>
                      <td className="inv-col-num">{index + 1}</td>
                      <td className="inv-col-desc">
                        {item.productName}
                        {item.variantName && (
                          <span className="inv-item-variant"> ({item.variantName})</span>
                        )}
                      </td>
                      <td className="inv-col-qty">{item.quantity}</td>
                      <td className="inv-col-price">{formatCurrency(unitPriceHT)}</td>
                      <td className="inv-col-total"><strong>{formatCurrency(lineTotal)}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* === SPACER (like in the PDF) === */}
            <div className="inv-spacer" />

            {/* === TOTALS (right-aligned) === */}
            <div className="inv-totals-wrapper">
              <div className="inv-totals">
                <div className="inv-totals-row">
                  <span>{t('invoice.totalHt')}</span>
                  <span>{formatCurrency(totalHT)}</span>
                </div>
                <div className="inv-totals-row">
                  <span>{t('invoice.taxRate')}</span>
                  <span>{formatCurrency(tvaAmount)}</span>
                </div>
                <div className="inv-totals-separator" />
                <div className="inv-totals-row inv-total-ttc">
                  <span>{t('invoice.totalAmount')}</span>
                  <span className="inv-total-amount">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* === SIGNATURE & STAMP SECTION === */}
            <div className="inv-signature-stamp">
              <div className="inv-signature-left" />
              <div className="inv-signature-right">
                <img src={stampSrc} alt={t('invoice.stampAlt')} className="inv-stamp-img" />
              </div>
            </div>

            {/* === AMOUNT IN WORDS === */}
            <div className="inv-amount-words-box">
              <p>{t('invoice.amountInWords')} :</p>
              <p className="inv-amount-words-value">{t('invoice.amountWordsValue', { amount: totalInWords })}</p>
            </div>

            {/* === VALIDITY NOTE === */}
            <div className="inv-validity-note">
              {t('invoice.validityNote')}
            </div>

            {/* === FOOTER === */}
            <div className="inv-footer">
              <div className="inv-footer-text">
                {t('invoice.contactNote')}
              </div>
              <div className="inv-footer-contacts">
                <div className="inv-footer-col">
                  <div className="inv-footer-label">{t('invoice.mobile')} :</div>
                  <div className="inv-footer-value">{COMPANY_INFO.phone}</div>
                </div>
                <div className="inv-footer-col">
                  <div className="inv-footer-label">{t('invoice.email')} :</div>
                  <div className="inv-footer-value">{COMPANY_INFO.email}</div>
                </div>
                <div className="inv-footer-col">
                  <div className="inv-footer-label">{t('invoice.site')} :</div>
                  <div className="inv-footer-value">{COMPANY_INFO.website}</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Returns CSS for the print window — matches the PDF layout exactly
 */
function getInvoicePrintStyles() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page {
      size: A4;
      margin: 12mm;
    }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      background: white;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .invoice-paper { max-width: 210mm; margin: 0 auto; }

    /* Top Header */
    .inv-top-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
    }

    .inv-company-box {
      border: 1.5px solid #333;
      border-radius: 8px;
      padding: 14px 18px;
      font-size: 11px;
      line-height: 1.7;
      max-width: 380px;
    }

    .inv-company-owner {
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 2px;
    }

    .inv-company-address { color: #333; margin-bottom: 4px; }
    .inv-company-reg { color: #444; font-size: 11px; }

    .inv-logo-section {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }

    .inv-logo {
      width: 160px;
      height: auto;
      max-height: 50px;
      object-fit: contain;
    }

    .inv-tagline {
      font-size: 11px;
      color: #e67e22;
      font-style: italic;
    }

    /* Title */
    .inv-title {
      text-align: center;
      font-size: 26px;
      font-weight: 800;
      color: #111;
      margin-bottom: 12px;
    }

    /* Red Separator */
    .inv-red-separator {
      height: 3px;
      background: #e74c3c;
      border-radius: 2px;
      margin-bottom: 16px;
    }

    /* Client + Date Row */
    .inv-client-date-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .inv-client-box {
      border: 1.5px solid #ccc;
      border-radius: 6px;
      padding: 12px 16px;
      min-width: 320px;
      max-width: 400px;
    }

    .inv-client-label {
      font-size: 12px;
      font-weight: 700;
      color: #333;
      margin-bottom: 4px;
    }

    .inv-client-name {
      font-size: 13px;
      color: #111;
      font-weight: 600;
    }

    .inv-client-phone { font-weight: 400; color: #555; }
    .inv-client-addr { font-size: 11px; color: #555; margin-top: 2px; }

    .inv-date-box {
      border: 1.5px solid #ccc;
      border-radius: 6px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 700;
      color: #111;
    }

    /* Items Table */
    .inv-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
      border: 1.5px solid #333;
    }

    .inv-table thead tr {
      background: #2c3e50;
    }

    .inv-table th {
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 700;
      color: white;
      text-align: left;
      border-right: 1px solid #4a6274;
    }

    .inv-table th:last-child { border-right: none; }

    .inv-table th.inv-col-num { width: 60px; text-align: center; }
    .inv-table th.inv-col-qty { width: 70px; text-align: center; }
    .inv-table th.inv-col-price { width: 120px; text-align: right; }
    .inv-table th.inv-col-total { width: 130px; text-align: right; }

    .inv-table tbody tr {
      border-bottom: 1px solid #ddd;
    }

    .inv-table td {
      padding: 10px 12px;
      font-size: 12px;
      border-right: 1px solid #eee;
    }

    .inv-table td:last-child { border-right: none; }

    .inv-table td.inv-col-num { text-align: center; color: #555; }
    .inv-table td.inv-col-qty { text-align: center; }
    .inv-table td.inv-col-price { text-align: right; }
    .inv-table td.inv-col-total { text-align: right; }

    .inv-item-variant { color: #888; font-size: 11px; }

    /* Spacer */
    .inv-spacer { height: 60px; }

    /* Totals */
    .inv-totals-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }

    .inv-totals { width: 280px; }

    .inv-totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      color: #333;
    }

    .inv-totals-separator {
      border-top: 2px solid #333;
      margin: 4px 0;
    }

    .inv-totals-row.inv-total-ttc {
      font-size: 16px;
      font-weight: 800;
      color: #111;
    }

    .inv-total-amount {
      color: #e74c3c;
      font-weight: 800;
    }

    /* Signature & Stamp */
    .inv-signature-stamp {
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
      margin: 24px 0 20px;
      min-height: 120px;
    }
    .inv-signature-left { flex: 1; }
    .inv-signature-right {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .inv-stamp-img {
      width: 200px;
      height: auto;
      object-fit: contain;
    }

    /* Amount in Words */
    .inv-amount-words-box {
      border: 1.5px solid #ccc;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 12px;
      max-width: 450px;
      font-size: 12px;
      color: #333;
    }

    .inv-amount-words-value {
      font-style: italic;
      font-weight: 600;
      margin-top: 2px;
      text-transform: capitalize;
    }

    /* Validity Note */
    .inv-validity-note {
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 8px 14px;
      font-size: 11px;
      color: #555;
      display: inline-block;
      margin-bottom: 32px;
    }

    /* Footer */
    .inv-footer {
      border-top: 2px solid #555;
      padding-top: 10px;
    }

    .inv-footer-text {
      text-align: center;
      font-size: 11px;
      color: #666;
      margin-bottom: 10px;
    }

    .inv-footer-contacts {
      display: flex;
      border: 1.5px solid #333;
      border-radius: 6px;
      overflow: hidden;
    }

    .inv-footer-col {
      flex: 1;
      padding: 10px 14px;
      border-right: 1px solid #ddd;
      font-size: 11px;
    }

    .inv-footer-col:last-child { border-right: none; }

    .inv-footer-label {
      font-weight: 700;
      color: #333;
      margin-bottom: 2px;
    }

    .inv-footer-value { color: #555; }
  `;
}

export default InvoiceModal;
