import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';
import './LanguageSwitcher.css';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const languages = [
        { code: 'ar', name: 'العربية', short: 'AR', flag: '🇩🇿' },
        { code: 'fr', name: 'Français', short: 'FR', flag: '🇫🇷' }
    ];

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[1];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageChange = (code) => {
        i18n.changeLanguage(code);
        setIsOpen(false);
    };

    return (
        <div className="language-switcher-container" ref={dropdownRef}>
            <button
                className={`lang-btn ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="true"
                aria-expanded={isOpen}
                title={currentLanguage.name}
            >
                <span className="lang-flag">{currentLanguage.flag}</span>
                <span className="lang-short">{currentLanguage.short}</span>
                <ChevronDown size={14} className={`chevron ${isOpen ? 'rotate' : ''}`} />
            </button>

            {isOpen && (
                <div className="lang-dropdown">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            className={`lang-option ${i18n.language === lang.code ? 'selected' : ''}`}
                            onClick={() => handleLanguageChange(lang.code)}
                        >
                            <span className="option-flag">{lang.flag}</span>
                            <span className="option-name">{lang.name}</span>
                            {i18n.language === lang.code && <Check size={16} className="check-icon" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;
