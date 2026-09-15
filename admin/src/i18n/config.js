import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from './fr.json';
import ar from './ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      ar: { translation: ar }
    },
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false
    }
  }).then(() => {
    // Apply initial direction
    const lang = i18n.language || 'fr';
    document.dir = lang.startsWith('ar') ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  });

// Logic to change the document direction (RTL/LTR)
i18n.on('languageChanged', (lng) => {
  document.dir = lng.startsWith('ar') ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

export default i18n;