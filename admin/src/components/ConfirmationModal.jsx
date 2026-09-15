import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './ConfirmationModal.css';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    isDangerous = false,
    type = 'warning', // 'warning', 'danger', 'info', 'success'
    showInput = false,
    inputValue = '',
    onInputChange = () => { },
    inputPlaceholder = '',
    inputType = 'text'
}) => {
    const { t } = useTranslation();
    const modalRef = useRef(null);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
            document.body.style.paddingRight = '0px';
        };
    }, [isOpen, onClose]);

    // Focus trap could be added here, but keeping it simple for now

    if (!isOpen) return null;

    // Resolve icon and color based on type/isDangerous
    let Icon = AlertCircle;
    let colorClass = 'modal-warning';

    if (isDangerous || type === 'danger') {
        Icon = AlertTriangle;
        colorClass = 'modal-danger';
    } else if (type === 'success') {
        Icon = CheckCircle;
        colorClass = 'modal-success';
    } else if (type === 'info') {
        Icon = Info;
        colorClass = 'modal-info';
    }

    return (
        <div className="confirmation-modal-overlay" onClick={onClose}>
            <div
                className={`confirmation-modal-content ${colorClass}`}
                onClick={(e) => e.stopPropagation()}
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                aria-describedby="modal-desc"
            >
                <div className="modal-header">
                    <div className={`modal-icon-wrapper ${colorClass}`}>
                        <Icon size={24} />
                    </div>
                    <div className="modal-title-wrapper">
                        <h3 id="modal-title">{title}</h3>
                    </div>
                    <button
                        className="modal-close-btn"
                        onClick={onClose}
                        aria-label={t('common.close')}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <p id="modal-desc">{message}</p>
                    {showInput && (
                        <div className="modal-input-wrapper">
                            <input
                                type={inputType}
                                className="modal-input"
                                value={inputValue}
                                onChange={(e) => onInputChange(e.target.value)}
                                placeholder={inputPlaceholder}
                                autoComplete={inputType === 'password' ? 'current-password' : 'off'}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        onConfirm();
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        className="btn-cancel"
                        onClick={onClose}
                    >
                        {cancelText || t('common.cancel')}
                    </button>
                    <button
                        className={`btn-confirm ${isDangerous ? 'btn-danger' : 'btn-primary'}`}
                        onClick={onConfirm}
                        autoFocus
                    >
                        {confirmText || t('common.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
