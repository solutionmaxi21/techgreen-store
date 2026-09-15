import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './BilingualInput.css';

/**
 * BilingualInput Component
 * A reusable input component that supports French/Arabic bilingual data entry
 * 
 * @param {Object} props
 * @param {Object} props.value - Bilingual object { fr: string, ar: string }
 * @param {Function} props.onChange - Callback with updated bilingual object
 * @param {string} props.label - Input label
 * @param {string} props.id - Input element ID
 * @param {string} props.type - Input type: 'text' or 'textarea'
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.required - Whether the field is required
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {number} props.rows - Number of rows for textarea
 * @param {string} props.error - Error message to display
 * @param {string} props.className - Additional CSS classes
 */
const BilingualInput = ({
    value = { fr: '', ar: '' },
    onChange,
    label,
    id,
    type = 'text',
    placeholder = '',
    required = false,
    disabled = false,
    rows = 3,
    error,
    className = ''
}) => {
    const { t } = useTranslation();
    const [activeLocale, setActiveLocale] = useState('fr');

    // Normalize value to ensure we always have fr and ar properties
    const normalizedValue = {
        fr: value?.fr || (typeof value === 'string' ? value : ''),
        ar: value?.ar || ''
    };

    const handleChange = (e) => {
        const newValue = e.target.value;
        const updatedValue = {
            ...normalizedValue,
            [activeLocale]: newValue
        };
        onChange(updatedValue);
    };

    const handleLocaleSwitch = (locale) => {
        setActiveLocale(locale);
    };

    const currentValue = normalizedValue[activeLocale] || '';
    const isArabicEmpty = !normalizedValue.ar || normalizedValue.ar.trim() === '';
    const isFrenchEmpty = !normalizedValue.fr || normalizedValue.fr.trim() === '';

    const inputId = `${id}-${activeLocale}`;
    const isArabic = activeLocale === 'ar';

    const commonProps = {
        id: inputId,
        value: currentValue,
        onChange: handleChange,
        placeholder: placeholder,
        disabled: disabled,
        className: `bilingual-input__field ${isArabic ? 'rtl' : 'ltr'}`,
        dir: isArabic ? 'rtl' : 'ltr'
    };

    return (
        <div className={`bilingual-input ${className} ${error ? 'bilingual-input--error' : ''}`}>
            {label && (
                <label className="bilingual-input__label" htmlFor={inputId}>
                    {label}
                    {required && <span className="bilingual-input__required">*</span>}
                </label>
            )}

            <div className="bilingual-input__tabs">
                <button
                    type="button"
                    className={`bilingual-input__tab ${activeLocale === 'fr' ? 'active' : ''} ${isFrenchEmpty && activeLocale !== 'fr' ? 'empty' : ''}`}
                    onClick={() => handleLocaleSwitch('fr')}
                    title={t('bilingualInput.switchTo', { language: t('bilingualInput.tabs.french') })}
                >
                    <span className="bilingual-input__tab-flag">🇫🇷</span>
                    <span className="bilingual-input__tab-text">{t('bilingualInput.tabs.french', 'Français')}</span>
                    {isFrenchEmpty && activeLocale !== 'fr' && (
                        <span className="bilingual-input__tab-warning" title={t('bilingualInput.emptyFrench', 'Traduction française manquante')}>!</span>
                    )}
                </button>
                <button
                    type="button"
                    className={`bilingual-input__tab ${activeLocale === 'ar' ? 'active' : ''} ${isArabicEmpty && activeLocale !== 'ar' ? 'empty' : ''}`}
                    onClick={() => handleLocaleSwitch('ar')}
                    title={t('bilingualInput.switchTo', { language: t('bilingualInput.tabs.arabic') })}
                >
                    <span className="bilingual-input__tab-flag">🇩🇿</span>
                    <span className="bilingual-input__tab-text">{t('bilingualInput.tabs.arabic', 'العربية')}</span>
                    {isArabicEmpty && activeLocale !== 'ar' && (
                        <span className="bilingual-input__tab-warning" title={t('bilingualInput.emptyArabic', 'الترجمة العربية مفقودة')}>!</span>
                    )}
                </button>
            </div>

            <div className="bilingual-input__field-wrapper">
                {type === 'textarea' ? (
                    <textarea
                        {...commonProps}
                        rows={rows}
                    />
                ) : (
                    <input
                        {...commonProps}
                        type="text"
                    />
                )}

                {isArabic && (
                    <span className="bilingual-input__rtl-indicator">RTL</span>
                )}
            </div>

            {error && (
                <span className="bilingual-input__error-message">{error}</span>
            )}

            {/* Hidden preview of other language */}
            {activeLocale === 'fr' && normalizedValue.ar && (
                <div className="bilingual-input__preview" dir="rtl">
                    <span className="bilingual-input__preview-label">AR:</span>
                    <span className="bilingual-input__preview-text">{normalizedValue.ar}</span>
                </div>
            )}
            {activeLocale === 'ar' && normalizedValue.fr && (
                <div className="bilingual-input__preview">
                    <span className="bilingual-input__preview-label">FR:</span>
                    <span className="bilingual-input__preview-text">{normalizedValue.fr}</span>
                </div>
            )}
        </div>
    );
};

export default BilingualInput;
