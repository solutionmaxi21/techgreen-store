import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { productApi } from '../services/apiService';
import { AlertCircle, Loader2, CheckCircle, XCircle } from 'lucide-react';
import './BarcodeScannerPage.css';

/**
 * Barcode Scanner Page
 * Allows admin to scan product barcodes and navigate directly to product details
 * Works with physical barcode scanners that input text + Enter key
 */
const BarcodeScannerPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [lastScannedProduct, setLastScannedProduct] = useState(null);
  const scanInputRef = useRef(null);

  // Auto-focus scanner input on mount
  useEffect(() => {
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, []);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(false);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleScan = async (e) => {
    e.preventDefault();
    
    if (!barcode.trim()) {
      setError(t('scanner.enterBarcode'));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Call backend to find product by barcode
      const response = await productApi.getProductByBarcode(barcode.trim());
      
      // Handle response structure (could be direct data or wrapped in data property)
      const product = response.data || response;
      
      if (!product || !product.id) {
        setError(t('scanner.notFound', { barcode }));
        setLoading(false);
        setBarcode('');
        if (scanInputRef.current) {
          scanInputRef.current.focus();
        }
        return;
      }

      const productId = product.id;
      setLastScannedProduct(product);
      setSuccess(true);

      // Navigate to product details after a brief delay for user feedback
      setTimeout(() => {
        navigate(`/products/${productId}`);
      }, 500);

    } catch (err) {
      console.error('Scan error:', err);
      setError(err.message || t('scanner.failed'));
      setLoading(false);
      setBarcode('');
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
    }
  };

  const handleClearInput = () => {
    setBarcode('');
    setError(null);
    setSuccess(false);
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  };

  return (
    <div className="barcode-scanner-page" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Header */}
      <div className="scanner-header">
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>
          {t('barcode_scanner.title')}
        </h1>
        <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '8px', marginBottom: 0 }}>
          {t('barcode_scanner.subtitle')}
        </p>
      </div>

      {/* Main Scanner Card */}
      <div className="scanner-card">
        <form onSubmit={handleScan} className="scanner-form">
          {/* Scanner Input */}
          <div className="scanner-input-group">
            <label className="scanner-label">
              {t('barcode_scanner.label')}
            </label>
            <input
              ref={scanInputRef}
              type="text"
              className="scanner-input"
              placeholder={t('barcode_scanner.placeholder')}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              disabled={loading}
              autoComplete="off"
              autoFocus
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="scanner-message error">
              <XCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="scanner-message success">
              <CheckCircle size={18} />
              <span>
                {lastScannedProduct 
                  ? `Found: ${lastScannedProduct.product_name || lastScannedProduct.name}` 
                  : t('scanner.productFound')}
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="scanner-buttons">
            <button
              type="submit"
              disabled={loading || !barcode.trim()}
              className="btn btn-primary"
              style={{ 
                width: '100%',
                padding: '12px 24px',
                fontSize: '1rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading && <Loader2 size={18} className="spinner" />}
              {loading ? (t('barcode_scanner.scanning')) : (t('barcode_scanner.scan_button'))}
            </button>

            {barcode && (
              <button
                type="button"
                onClick={handleClearInput}
                className="btn btn-outline"
                style={{ 
                  width: '100%',
                  padding: '12px 24px',
                  fontSize: '1rem'
                }}
              >
                {t('barcode_scanner.clear_button')}
              </button>
            )}
          </div>
        </form>

        {/* Instructions */}
        <div className="scanner-instructions">
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '0.95rem', fontWeight: '600' }}>
            💡 {t('barcode_scanner.instructions_title')}:
          </h3>
          <ul style={{ 
            margin: 0, 
            paddingLeft: isRTL ? 0 : '20px',
            paddingRight: isRTL ? '20px' : 0,
            fontSize: '0.9rem',
            lineHeight: '1.6',
            color: 'hsl(var(--muted-foreground))'
          }}>
            <li>{t('barcode_scanner.instruction_1')}</li>
            <li>{t('barcode_scanner.instruction_2')}</li>
            <li>{t('barcode_scanner.instruction_3')}</li>
            <li>{t('barcode_scanner.instruction_4')}</li>
          </ul>
        </div>

        {/* Supported Formats */}
        <div className="scanner-formats" style={{ 
          padding: '12px 16px', 
          backgroundColor: 'hsl(var(--muted))',
          borderRadius: '6px',
          fontSize: '0.85rem',
          color: 'hsl(var(--muted-foreground))'
        }}>
          <strong style={{ display: 'block', marginBottom: '6px' }}>
            {t('barcode_scanner.supported_formats')}:
          </strong>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span>✓ EAN-13</span>
            <span>✓ UPC-A</span>
            <span>✓ Code128</span>
            <span>✓ SKU</span>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="scanner-info" style={{
        display: 'flex',
        gap: '12px',
        padding: '16px',
        backgroundColor: 'hsl(var(--muted))',
        borderLeft: '4px solid hsl(var(--primary))',
        borderRadius: '6px',
        marginTop: '24px'
      }}>
        <AlertCircle size={20} style={{ color: 'hsl(var(--primary))', flexShrink: 0 }} />
        <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
          <strong>{t('barcode_scanner.info_title')}:</strong> {t('barcode_scanner.info_description')}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScannerPage;
