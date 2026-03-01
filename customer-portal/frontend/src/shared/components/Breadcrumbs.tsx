/**
 * Breadcrumbs - Navigation breadcrumb trail (Fase II-D.3)
 *
 * Renders Home > Section > Page breadcrumb trail.
 * Supports multi-language via useLanguage().
 */

import { Link, useLocation } from 'react-router';
import { useLanguage } from '../../i18n/LanguageContext';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

// Route label mapping per language
const routeLabels: Record<string, Record<string, string>> = {
  en: {
    pois: 'Explore',
    favorites: 'Favorites',
    agenda: 'Events',
    account: 'Account',
    about: 'About',
    'how-it-works': 'How It Works',
    partners: 'Partners',
    faq: 'FAQ',
    contact: 'Contact',
    help: 'Help',
    privacy: 'Privacy',
    terms: 'Terms',
    cookies: 'Cookies',
  },
  nl: {
    pois: 'Ontdekken',
    favorites: 'Favorieten',
    agenda: 'Evenementen',
    account: 'Account',
    about: 'Over ons',
    'how-it-works': 'Hoe het werkt',
    partners: 'Partners',
    faq: 'FAQ',
    contact: 'Contact',
    help: 'Help',
    privacy: 'Privacy',
    terms: 'Voorwaarden',
    cookies: 'Cookies',
  },
  de: {
    pois: 'Entdecken',
    favorites: 'Favoriten',
    agenda: 'Veranstaltungen',
    account: 'Konto',
    about: 'Über uns',
    'how-it-works': 'So funktioniert es',
    partners: 'Partner',
    faq: 'FAQ',
    contact: 'Kontakt',
    help: 'Hilfe',
    privacy: 'Datenschutz',
    terms: 'AGB',
    cookies: 'Cookies',
  },
  es: {
    pois: 'Explorar',
    favorites: 'Favoritos',
    agenda: 'Eventos',
    account: 'Cuenta',
    about: 'Sobre nosotros',
    'how-it-works': 'Cómo funciona',
    partners: 'Socios',
    faq: 'FAQ',
    contact: 'Contacto',
    help: 'Ayuda',
    privacy: 'Privacidad',
    terms: 'Términos',
    cookies: 'Cookies',
  },
};

interface BreadcrumbsProps {
  /** Override the last breadcrumb label (e.g., POI name) */
  currentLabel?: string;
}

export function Breadcrumbs({ currentLabel }: BreadcrumbsProps) {
  const location = useLocation();
  const { language } = useLanguage();

  // Don't show on homepage
  if (location.pathname === '/') return null;

  const segments = location.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const labels = routeLabels[language] || routeLabels.en;
  const homeLabel = language === 'nl' ? 'Home' : language === 'de' ? 'Startseite' : language === 'es' ? 'Inicio' : 'Home';

  const items: BreadcrumbItem[] = [{ label: homeLabel, path: '/' }];

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;
    const path = '/' + segments.slice(0, index + 1).join('/');

    if (isLast && currentLabel) {
      items.push({ label: currentLabel });
    } else if (labels[segment]) {
      items.push({ label: labels[segment], path: isLast ? undefined : path });
    }
    // Skip numeric segments (IDs) unless we have a currentLabel
  });

  // Don't render if only "Home" (single segment pages like /about)
  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs-nav">
      <ol className="breadcrumbs-list">
        {items.map((item, index) => (
          <li key={index} className="breadcrumbs-item">
            {index > 0 && <ChevronRight size={14} className="breadcrumbs-separator" aria-hidden="true" />}
            {item.path ? (
              <Link to={item.path} className="breadcrumbs-link">
                {index === 0 && <Home size={14} className="breadcrumbs-home-icon" aria-hidden="true" />}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span className="breadcrumbs-current" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
