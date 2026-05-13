import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Only import the default language synchronously — others loaded on demand
import nl from './nl.json';

// Domain-based language detection for Publiqio branded domains
function getDefaultLang() {
  const host = window.location.hostname;
  if (host.endsWith('.es') || host === 'publiqio.es') return 'es';
  if (host.endsWith('.com') || host === 'publiqio.com') return 'en';
  if (host.endsWith('.nl') || host === 'publiqio.nl') return 'nl';
  return 'nl';
}

const savedLang = localStorage.getItem('hb-admin-lang') || getDefaultLang();

// Lazy language loaders — only fetched when needed
const langLoaders = {
  en: () => import('./en.json'),
  de: () => import('./de.json'),
  es: () => import('./es.json'),
  fr: () => import('./fr.json'),
};

i18n.use(initReactI18next).init({
  resources: {
    nl: { translation: nl },
  },
  lng: savedLang === 'nl' ? 'nl' : 'nl', // start with nl, switch after async load
  fallbackLng: 'nl',
  interpolation: { escapeValue: false }
});

// Load requested language if not nl
if (savedLang !== 'nl' && langLoaders[savedLang]) {
  langLoaders[savedLang]().then(mod => {
    i18n.addResourceBundle(savedLang, 'translation', mod.default || mod);
    i18n.changeLanguage(savedLang);
  });
}

// Patch changeLanguage to lazy-load bundles on switch
const originalChangeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = async (lng, callback) => {
  if (lng !== 'nl' && !i18n.hasResourceBundle(lng, 'translation') && langLoaders[lng]) {
    const mod = await langLoaders[lng]();
    i18n.addResourceBundle(lng, 'translation', mod.default || mod);
  }
  return originalChangeLanguage(lng, callback);
};

export default i18n;
