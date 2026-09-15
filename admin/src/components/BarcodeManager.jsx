import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { productApi } from '../services/apiService';

/**
 * BarcodeManager Component - Compact Inline Version
 * Professional UI for barcode generation and management
 */
export const BarcodeManager = ({
  productId,
  currentBarcode,
  sku,
  productName,
  sellingPrice,
  onBarcodeUpdate,
  onGenerateBarcode,
  isLoading = false,
  compact = false,
  hideInternalLabel = false
}) => {
  const { t } = useTranslation();
  const [barcode, setBarcode] = useState(currentBarcode || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  useEffect(() => {
    setBarcode(currentBarcode || '');
  }, [currentBarcode]);

  const handleGenerateBarcode = async () => {
    if (!onGenerateBarcode && !productId) {
      setError(t('barcode.errors.productRequired'));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let newBarcode;
      let failureMessage;
      if (onGenerateBarcode) {
        newBarcode = await onGenerateBarcode();
      } else {
        const response = await productApi.generateBarcode(productId);
        newBarcode = response?.data?.barcode || response?.barcode || response?.data?.data?.barcode;
        failureMessage = response?.message;
      }

      if (!newBarcode) {
        throw new Error(failureMessage || t('barcode.errors.generate'));
      }

      setBarcode(newBarcode);
      setSuccess(true);

      if (onBarcodeUpdate) {
        onBarcodeUpdate(newBarcode);
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || t('barcode.errors.generate'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrintBarcode = async () => {
    if (!barcode) {
      setError(t('barcode.errors.noBarcode'));
      return;
    }

    try {
      const { printSingleBarcode } = await import('../lib/barcodePrinting.js');
      await printSingleBarcode({
        barcode,
        price: sellingPrice,
        productName,
        width: '200px',
        height: '150px'
      });
    } catch (err) {
      setError(t('barcode.errors.print'));
      console.error(err);
    }
  };

  const handleViewBarcode = () => {
    setShowModal(true);
  };

  const handleCopyBarcode = async () => {
    try {
      await navigator.clipboard.writeText(barcode);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(t('barcode.errors.copy'));
    }
  };

  if (compact) {
    return (
      <>
        <div className="barcode-compact">
          <div className="barcode-field">
            {!hideInternalLabel && (
              <div className="barcode-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path d="M6 6V4M10 6V4M14 6V4M18 6V4M6 18v2M10 18v2M14 18v2M18 18v2" />
                </svg>
                <span>{t('barcode.label')}</span>
              </div>
            )}
            <div className="barcode-value">
              {barcode ? (
                <>
                  <code>{barcode}</code>
                  <div className="barcode-actions-inline">
                    <button type="button" onClick={handleCopyBarcode} className="btn-icon" title={t('common.copy')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                    </button>
                    <button type="button" onClick={handleViewBarcode} className="btn-icon" title={t('common.view')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    <button type="button" onClick={handlePrintBarcode} className="btn-icon" title={t('barcode.print')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                        <path d="M6 14h12v8H6z" />
                      </svg>
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  disabled={loading || isLoading || (!productId && !onGenerateBarcode)}
                  className="btn-generate-compact"
                >
                  {loading ? (
                    <>
                      <span className="spinner-sm"></span>
                      <span>{t('barcode.generating')}</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span>{t('barcode.generate')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          {error && <div className="barcode-message error">{error}</div>}
          {success && <div className="barcode-message success">✓ {t('common.success')}</div>}
        </div>

        {showModal && barcode && (
          <BarcodePreviewModal
            barcode={barcode}
            sku={sku}
            productName={productName}
            onClose={() => setShowModal(false)}
          />
        )}

        <style>{`
          .barcode-compact {
            margin-top: 0;
          }

          .barcode-field {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem;
            background: #f8f9fa;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            min-height: 42px;
          }

          .barcode-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 13px;
            font-weight: 500;
            color: #24292e;
            min-width: 90px;
          }

          .barcode-label svg {
            color: #0366d6;
          }

          .barcode-value {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .barcode-value code {
            font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace;
            font-size: 14px;
            font-weight: 500;
            color: #0366d6;
            background: white;
            padding: 0.375rem 0.75rem;
            border-radius: 4px;
            border: 1px solid #d1d5da;
            letter-spacing: 0.5px;
          }

          .barcode-actions-inline {
            display: flex;
            gap: 0.25rem;
          }

          .btn-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            padding: 0;
            background: white;
            border: 1px solid #d1d5da;
            border-radius: 4px;
            color: #586069;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .btn-icon:hover {
            background: #f6f8fa;
            border-color: #0366d6;
            color: #0366d6;
          }

          .btn-generate-compact {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.375rem 0.875rem;
            background: #0366d6;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s ease;
          }

          .btn-generate-compact:hover:not(:disabled) {
            background: #0256c7;
          }

          .btn-generate-compact:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .spinner-sm {
            width: 12px;
            height: 12px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .barcode-message {
            margin-top: 0.5rem;
            padding: 0.5rem 0.75rem;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }

          .barcode-message.error {
            background: #ffeef0;
            color: #d73a49;
            border: 1px solid #fdaeb7;
          }

          .barcode-message.success {
            background: #dcffe4;
            color: #22863a;
            border: 1px solid #85e89d;
          }
        `}</style>
      </>
    );
  }

  return (
    <div className="barcode-manager">
      <div className="form-section">
        <h3>{t('barcode.management')}</h3>

        {/* Current Barcode Display */}
        <div className="barcode-display-box">
          <label>{t('barcode.current')}</label>
          <div className="barcode-input-group">
            <input
              type="text"
              value={barcode}
              readOnly
              className="barcode-display-input"
              placeholder={t('barcode.none')}
            />
            {barcode && (
              <button
                type="button"
                onClick={handleCopyBarcode}
                className="btn-copy"
                title={t('barcode.copy')}
              >
                📋 {t('common.copy')}
              </button>
            )}
          </div>
          {barcode && (
            <p className="barcode-info">
              {t('barcode.format', { sku })}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="barcode-actions">
          <button
            type="button"
            onClick={handleGenerateBarcode}
            disabled={loading || isLoading || !productId}
            className="btn btn-primary"
          >
            {loading ? t('barcode.generating') : `🔄 ${t('barcode.generate')}`}
          </button>

          {barcode && (
            <>
              <button
                type="button"
                onClick={handleViewBarcode}
                className="btn btn-secondary"
              >
                👁 {t('common.view')}
              </button>
              <button
                type="button"
                onClick={handlePrintBarcode}
                className="btn btn-success"
              >
                🖨 {t('barcode.print')}
              </button>
            </>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div className="alert alert-error">
            ❌ {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            ✅ {t('barcode.operationSuccess')}
          </div>
        )}
      </div>

      {/* Barcode Preview Modal */}
      {showModal && barcode && (
        <BarcodePreviewModal
          barcode={barcode}
          sku={sku}
          productName={productName}
          onClose={() => setShowModal(false)}
        />
      )}

      <style>{`
        .barcode-manager {
          margin-top: 2rem;
          padding: 1.5rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background-color: #f9f9f9;
        }

        .barcode-manager h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          color: #333;
          font-size: 16px;
          font-weight: 600;
        }

        .barcode-display-box {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background-color: white;
          border: 1px solid #ddd;
          border-radius: 6px;
        }

        .barcode-display-box label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #555;
          font-size: 14px;
        }

        .barcode-input-group {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .barcode-display-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .btn-copy {
          padding: 0.75rem 1rem;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .btn-copy:hover {
          background-color: #0056b3;
        }

        .barcode-info {
          margin-top: 0.5rem;
          font-size: 12px;
          color: #666;
        }

        .barcode-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .btn {
          padding: 0.75rem 1.25rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background-color: #28a745;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #218838;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #5a6268;
        }

        .btn-success {
          background-color: #17a2b8;
          color: white;
        }

        .btn-success:hover:not(:disabled) {
          background-color: #138496;
        }

        .alert {
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 0.5rem;
          font-size: 14px;
        }

        .alert-error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .alert-success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
      `}</style>
    </div>
  );
};

/**
 * BarcodePreviewModal Component
 * Modal for previewing barcode
 */
const BarcodePreviewModal = ({ barcode, sku, productName, onClose }) => {
  const { t } = useTranslation();
  const barcodeRef = React.useRef(null);

  React.useEffect(() => {
    if (barcode && barcodeRef.current) {
      import('jsbarcode').then((JsBarcode) => {
        JsBarcode.default(barcodeRef.current, barcode, {
          format: 'EAN13',
          width: 2,
          height: 80,
          displayValue: true,
          margin: 10,
          lineColor: '#000000'
        });
      });
    }
  }, [barcode]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('barcode.preview')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="modal-close"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="preview-box">
            <h4>{productName}</h4>
            <div className="barcode-container">
              <svg ref={barcodeRef} />
            </div>
            <p className="sku-label">{t('barcode.sku', { sku })}</p>
            <p className="barcode-label">{barcode}</p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            {t('common.close')}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          max-width: 400px;
          width: 90%;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #eee;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #999;
        }

        .modal-close:hover {
          color: #333;
        }

        .modal-body {
          padding: 2rem 1.5rem;
        }

        .preview-box {
          text-align: center;
        }

        .preview-box h4 {
          margin-top: 0;
          margin-bottom: 1rem;
          color: #333;
        }

        .barcode-container {
          margin: 1.5rem 0;
          padding: 1rem;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .sku-label,
        .barcode-label {
          margin: 0.5rem 0;
          font-size: 13px;
          color: #666;
          font-family: 'Courier New', monospace;
        }

        .modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
};

export default BarcodeManager;
