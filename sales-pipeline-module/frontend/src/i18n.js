/**
 * i18n Configuration - Internationalization setup
 * Supports English (en) and Dutch (nl)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import nl from './locales/nl.json';

const resources = {
  en: { translation: en },
  nl: { translation: nl }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'nl'],

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    },

    interpolation: {
      escapeValue: false // React already escapes
    },

    react: {
      useSuspense: true
    }
  });

export default i18n;

// Helper to get current language
export const getCurrentLanguage = () => i18n.language;

// Helper to change language
export const changeLanguage = (lang) => {
  i18n.changeLanguage(lang);
  localStorage.setItem('i18nextLng', lang);
};

// Available languages
export const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' }
];
