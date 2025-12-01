import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { Language, Translations } from './translations';
import { translations } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Get initial language from localStorage or default to 'en'
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    const validLanguages: Language[] = ['nl', 'en', 'de', 'es', 'sv', 'pl'];
    if (saved && validLanguages.includes(saved as Language)) {
      return saved as Language;
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    console.log('Language changing from', language, 'to', lang);
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  // Memoize translations to ensure they update when language changes
  const t = useMemo(() => translations[language], [language]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    t
  }), [language, t]);

  console.log('LanguageContext render - current language:', language);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
