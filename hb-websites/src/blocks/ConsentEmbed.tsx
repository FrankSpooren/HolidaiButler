'use client';

import { useState, useEffect } from 'react';

/**
 * ConsentEmbed Block — VII-E2 Batch C, Block C4
 *
 * GDPR-compliant embed block. Shows placeholder + consent button
 * before loading ANY third-party content (YouTube, Vimeo, Maps, etc).
 * No third-party requests until user clicks.
 */

export interface ConsentEmbedProps {
  embedType?: 'youtube' | 'vimeo' | 'twitter' | 'instagram' | 'google_maps' | 'spotify' | 'iframe';
  embedUrl?: string;
  aspectRatio?: '16:9' | '4:3' | '1:1';
  consentText?: string;
  privacyNoteText?: string;
  privacyPolicyUrl?: string;
  thumbnailImage?: string;
  rememberConsent?: boolean;
  height?: number;
}

const CONSENT_STORAGE_PREFIX = 'hb_consent_';

function getConsentKey(type: string): string {
  return `${CONSENT_STORAGE_PREFIX}${type}`;
}

function hasStoredConsent(type: string): boolean {
  try {
    return localStorage.getItem(getConsentKey(type)) === 'true';
  } catch { return false; }
}

function storeConsent(type: string) {
  try { localStorage.setItem(getConsentKey(type), 'true'); } catch { /* */ }
}

const TYPE_LABELS: Record<string, { name: string; icon: string; color: string }> = {
  youtube: { name: 'YouTube', icon: '▶', color: '#FF0000' },
  vimeo: { name: 'Vimeo', icon: '▶', color: '#1AB7EA' },
  twitter: { name: 'X / Twitter', icon: '𝕏', color: '#1DA1F2' },
  instagram: { name: 'Instagram', icon: '📷', color: '#E1306C' },
  google_maps: { name: 'Google Maps', icon: '🗺', color: '#4285F4' },
  spotify: { name: 'Spotify', icon: '🎵', color: '#1DB954' },
  iframe: { name: 'External content', icon: '🌐', color: '#6B7280' },
};

function getEmbedSrc(type: string, url: string): string {
  if (!url) return '';
  switch (type) {
    case 'youtube': {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
      return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : url;
    }
    case 'vimeo': {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}?dnt=1` : url;
    }
    default:
      return url;
  }
}

const ASPECT_RATIOS: Record<string, string> = {
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '1:1': 'aspect-square',
};

export default function ConsentEmbed(props: ConsentEmbedProps) {
  const {
    embedType = 'iframe',
    embedUrl = '',
    aspectRatio = '16:9',
    consentText,
    privacyNoteText,
    privacyPolicyUrl,
    thumbnailImage,
    rememberConsent = true,
    height,
  } = props;

  const [consented, setConsented] = useState(false);
  const [mounted, setMounted] = useState(false);

  const locale = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';

  useEffect(() => {
    setMounted(true);
    if (rememberConsent && hasStoredConsent(embedType)) {
      setConsented(true);
    }
  }, [embedType, rememberConsent]);

  const handleConsent = () => {
    setConsented(true);
    if (rememberConsent) storeConsent(embedType);
    if ((window as any).sa_event) {
      (window as any).sa_event('consent_embed_accepted', { type: embedType });
    }
  };

  if (!mounted) return null;

  const typeInfo = TYPE_LABELS[embedType] || TYPE_LABELS.iframe;

  const defaultConsentText: Record<string, string> = {
    en: `Click to load ${typeInfo.name} content`,
    nl: `Klik om ${typeInfo.name}-inhoud te laden`,
    de: `Klicken um ${typeInfo.name}-Inhalte zu laden`,
    es: `Haz clic para cargar contenido de ${typeInfo.name}`,
  };

  const defaultPrivacyText: Record<string, string> = {
    en: `By clicking, you agree to load content from ${typeInfo.name}. This may set cookies and transfer data to third parties.`,
    nl: `Door te klikken ga je akkoord met het laden van ${typeInfo.name}-inhoud. Dit kan cookies plaatsen en gegevens naar derden versturen.`,
    de: `Durch Klicken stimmen Sie dem Laden von ${typeInfo.name}-Inhalten zu. Dies kann Cookies setzen und Daten an Dritte ubertragen.`,
    es: `Al hacer clic, acepta cargar contenido de ${typeInfo.name}. Esto puede establecer cookies y transferir datos a terceros.`,
  };

  const aspectClass = height ? '' : (ASPECT_RATIOS[aspectRatio] || 'aspect-video');
  const containerStyle = height ? { height: `${height}px` } : undefined;

  // POST-CONSENT: render iframe
  if (consented) {
    const src = getEmbedSrc(embedType, embedUrl);
    return (
      <section className="consent-embed-block" role="region" aria-label={`${typeInfo.name} embed`}>
        <div className={`relative rounded-xl overflow-hidden bg-black ${aspectClass}`} style={containerStyle}>
          <iframe
            src={src}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
            title={`${typeInfo.name} content`}
          />
        </div>
      </section>
    );
  }

  // PRE-CONSENT: placeholder
  return (
    <section className="consent-embed-block" role="region" aria-label={`${typeInfo.name} embed — consent required`}>
      <div
        className={`relative rounded-xl overflow-hidden bg-gray-900 ${aspectClass} flex items-center justify-center`}
        style={containerStyle}
      >
        {/* Thumbnail background */}
        {thumbnailImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnailImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-black/50" />
          </>
        )}

        {/* Consent UI */}
        <div className="relative z-10 text-center px-6 py-8 max-w-md">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
            style={{ backgroundColor: `${typeInfo.color}20`, color: typeInfo.color }}
          >
            {typeInfo.icon}
          </div>

          <p className="text-white font-medium mb-2">
            {consentText || defaultConsentText[locale] || defaultConsentText.en}
          </p>

          <p className="text-white/60 text-xs mb-4 leading-relaxed">
            {privacyNoteText || defaultPrivacyText[locale] || defaultPrivacyText.en}
          </p>

          <button
            onClick={handleConsent}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-white text-gray-900 hover:bg-gray-100 transition-colors min-h-[44px]"
          >
            {locale === 'nl' ? 'Inhoud laden' : locale === 'de' ? 'Inhalte laden' : locale === 'es' ? 'Cargar contenido' : 'Load content'}
          </button>

          {privacyPolicyUrl && (
            <a
              href={privacyPolicyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 text-xs text-white/40 hover:text-white/60 underline"
            >
              {locale === 'nl' ? 'Privacybeleid' : 'Privacy policy'}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
