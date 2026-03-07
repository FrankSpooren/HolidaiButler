'use client';

import { useState } from 'react';

export type ConsentLevel = 'essential' | 'analytics' | 'marketing';

interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const COOKIE_NAME = 'hb_consent';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days in seconds

const translations: Record<string, Record<string, string>> = {
  en: {
    title: 'Cookie Settings',
    description: 'We use cookies to improve your experience. You can choose which cookies you allow.',
    essential: 'Essential',
    essentialDesc: 'Required for the website to function properly.',
    analytics: 'Analytics',
    analyticsDesc: 'Help us understand how visitors use our site.',
    marketing: 'Marketing',
    marketingDesc: 'Used for social media embeds and personalized content.',
    acceptAll: 'Accept All',
    acceptSelected: 'Accept Selected',
    essentialOnly: 'Essential Only',
    privacyPolicy: 'Privacy Policy',
  },
  nl: {
    title: 'Cookie-instellingen',
    description: 'Wij gebruiken cookies om uw ervaring te verbeteren. U kunt kiezen welke cookies u toestaat.',
    essential: 'Essentieel',
    essentialDesc: 'Noodzakelijk voor het functioneren van de website.',
    analytics: 'Analytisch',
    analyticsDesc: 'Helpt ons te begrijpen hoe bezoekers onze site gebruiken.',
    marketing: 'Marketing',
    marketingDesc: 'Gebruikt voor social media-embeds en gepersonaliseerde inhoud.',
    acceptAll: 'Alles accepteren',
    acceptSelected: 'Selectie accepteren',
    essentialOnly: 'Alleen essentieel',
    privacyPolicy: 'Privacybeleid',
  },
  de: {
    title: 'Cookie-Einstellungen',
    description: 'Wir verwenden Cookies, um Ihre Erfahrung zu verbessern. Sie können wählen, welche Cookies Sie zulassen.',
    essential: 'Notwendig',
    essentialDesc: 'Erforderlich für die ordnungsgemäße Funktion der Website.',
    analytics: 'Analytisch',
    analyticsDesc: 'Helfen uns zu verstehen, wie Besucher unsere Website nutzen.',
    marketing: 'Marketing',
    marketingDesc: 'Verwendet für Social-Media-Einbettungen und personalisierte Inhalte.',
    acceptAll: 'Alle akzeptieren',
    acceptSelected: 'Auswahl akzeptieren',
    essentialOnly: 'Nur notwendige',
    privacyPolicy: 'Datenschutzerklärung',
  },
  es: {
    title: 'Configuración de cookies',
    description: 'Utilizamos cookies para mejorar su experiencia. Puede elegir qué cookies permite.',
    essential: 'Esenciales',
    essentialDesc: 'Necesarias para el funcionamiento correcto del sitio web.',
    analytics: 'Analíticas',
    analyticsDesc: 'Nos ayudan a entender cómo los visitantes usan nuestro sitio.',
    marketing: 'Marketing',
    marketingDesc: 'Utilizadas para incrustar redes sociales y contenido personalizado.',
    acceptAll: 'Aceptar todas',
    acceptSelected: 'Aceptar seleccionadas',
    essentialOnly: 'Solo esenciales',
    privacyPolicy: 'Política de privacidad',
  },
  fr: {
    title: 'Paramètres des cookies',
    description: 'Nous utilisons des cookies pour améliorer votre expérience. Vous pouvez choisir quels cookies vous autorisez.',
    essential: 'Essentiels',
    essentialDesc: 'Nécessaires au bon fonctionnement du site.',
    analytics: 'Analytiques',
    analyticsDesc: 'Nous aident à comprendre comment les visiteurs utilisent notre site.',
    marketing: 'Marketing',
    marketingDesc: 'Utilisés pour les intégrations de réseaux sociaux et le contenu personnalisé.',
    acceptAll: 'Tout accepter',
    acceptSelected: 'Accepter la sélection',
    essentialOnly: 'Essentiels uniquement',
    privacyPolicy: 'Politique de confidentialité',
  },
};

function getCookieConsent(): CookieConsent | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function setCookieConsent(consent: CookieConsent) {
  const value = encodeURIComponent(JSON.stringify(consent));
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** Check if a specific consent level has been granted */
export function hasConsent(level: ConsentLevel): boolean {
  const consent = getCookieConsent();
  if (!consent) return level === 'essential';
  return consent[level] === true;
}

interface CookieBannerProps {
  locale?: string;
  primaryColor?: string;
  privacyPolicyUrl?: string;
}

export default function CookieBanner({ locale = 'en', primaryColor, privacyPolicyUrl }: CookieBannerProps) {
  const [visible, setVisible] = useState(() => {
    if (typeof document === 'undefined') return false;
    return !getCookieConsent();
  });
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  const t = translations[locale] || translations.en;
  const btnColor = primaryColor || 'var(--hb-primary, #3b82f6)';

  const saveConsent = (consent: Omit<CookieConsent, 'timestamp'>) => {
    setCookieConsent({ ...consent, timestamp: new Date().toISOString() });
    setVisible(false);
    // Dispatch event so other components (like SocialFeed) can react
    window.dispatchEvent(new CustomEvent('hb-consent-update', { detail: consent }));
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        color: '#fff',
        padding: '1.5rem',
        borderTop: `3px solid ${btnColor}`,
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>{t.title}</h3>
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', opacity: 0.85, lineHeight: 1.5 }}>
          {t.description}
        </p>

        {/* Consent toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {/* Essential — always on */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input type="checkbox" checked disabled style={{ accentColor: btnColor }} />
            <strong>{t.essential}</strong>
            <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>— {t.essentialDesc}</span>
          </label>

          {/* Analytics */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              style={{ accentColor: btnColor }}
            />
            <strong>{t.analytics}</strong>
            <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>— {t.analyticsDesc}</span>
          </label>

          {/* Marketing */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              style={{ accentColor: btnColor }}
            />
            <strong>{t.marketing}</strong>
            <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>— {t.marketingDesc}</span>
          </label>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => saveConsent({ essential: true, analytics: true, marketing: true })}
            style={{
              backgroundColor: btnColor,
              color: '#fff',
              border: 'none',
              padding: '0.6rem 1.5rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.acceptAll}
          </button>
          <button
            onClick={() => saveConsent({ essential: true, analytics, marketing })}
            style={{
              backgroundColor: 'transparent',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '0.6rem 1.5rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.acceptSelected}
          </button>
          <button
            onClick={() => saveConsent({ essential: true, analytics: false, marketing: false })}
            style={{
              backgroundColor: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              border: 'none',
              padding: '0.6rem 1rem',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {t.essentialOnly}
          </button>
          {privacyPolicyUrl && (
            <a
              href={privacyPolicyUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.8rem',
                marginLeft: 'auto',
              }}
            >
              {t.privacyPolicy}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
