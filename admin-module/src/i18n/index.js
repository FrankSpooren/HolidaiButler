import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import nl from './nl.json';
import en from './en.json';
import de from './de.json';
import es from './es.json';
import fr from './fr.json';

// Domain-based language detection for Publiqio branded domains
function getDefaultLang() {
  const host = window.location.hostname;
  if (host.endsWith('.es') || host === 'publiqio.es') return 'es';
  if (host.endsWith('.com') || host === 'publiqio.com') return 'en';
  if (host.endsWith('.nl') || host === 'publiqio.nl') return 'nl';
  return 'nl';
}

const savedLang = localStorage.getItem('hb-admin-lang') || getDefaultLang();

i18n.use(initReactI18next).init({
  resources: {
    nl: { translation: nl },
    en: { translation: en },
    de: { translation: de },
    es: { translation: es },
    fr: { translation: fr }
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;
