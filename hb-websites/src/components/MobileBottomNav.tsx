'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getPortalUrl } from '@/lib/portal-url';
import { analytics } from '@/lib/analytics';

interface MobileBottomNavProps {
  locale: string;
  primaryColor?: string;
  chatbotColor?: string;
}

const LABELS: Record<string, Record<string, string>> = {
  home:    { nl: 'Home',    en: 'Home',    de: 'Home',    es: 'Inicio' },
  agenda:  { nl: 'Agenda',  en: 'Agenda',  de: 'Termine', es: 'Agenda' },
  chat:    { nl: 'Chat',    en: 'Chat',    de: 'Chat',    es: 'Chat' },
  pois:    { nl: 'POIs',    en: 'POIs',    de: 'POIs',    es: 'POIs' },
  profiel: { nl: 'Profiel', en: 'Profile', de: 'Profil',  es: 'Perfil' },
};

export default function MobileBottomNav({ locale, primaryColor, chatbotColor }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    const complete = localStorage.getItem('hb_onboarding_complete');
    setShowBadge(complete !== 'true');

    const onStorage = () => {
      setShowBadge(localStorage.getItem('hb_onboarding_complete') !== 'true');
    };
    window.addEventListener('storage', onStorage);
    // Also listen for custom event from OnboardingSheet
    const onOnboardingUpdate = () => {
      setShowBadge(localStorage.getItem('hb_onboarding_complete') !== 'true');
    };
    window.addEventListener('hb:onboarding-update', onOnboardingUpdate);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('hb:onboarding-update', onOnboardingUpdate);
    };
  }, []);

  const l = (key: string) => LABELS[key]?.[locale] || LABELS[key]?.en || key;

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/' || pathname === '';
    return pathname?.startsWith(path);
  };

  const openChatbot = () => {
    window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { message: 'general' } }));
  };

  const handleProfile = () => {
    const complete = localStorage.getItem('hb_onboarding_complete');
    if (complete === 'true') {
      // Onboarding done → go to account/login page on customer-portal
      const langParam = locale !== 'en' ? `?lang=${locale}` : '';
      window.location.href = `${getPortalUrl()}/login${langParam}`;
    } else {
      // Onboarding not done → open onboarding sheet
      localStorage.removeItem('hb_onboarding_complete');
      sessionStorage.removeItem('hb_onboarding_dismissed');
      window.dispatchEvent(new CustomEvent('hb:onboarding-open'));
    }
  };

  const accentColor = primaryColor || 'var(--hb-primary)';

  // POIs + Agenda link to the destination's customer-portal
  const langParam = locale !== 'en' ? `?lang=${locale}` : '';
  const base = getPortalUrl();
  const tabs = [
    { key: 'home', href: '/', icon: HomeIcon },
    { key: 'agenda', href: `${base}/agenda${langParam}`, icon: AgendaIcon, external: true },
    { key: 'chat', href: null, icon: ChatIcon, raised: true },
    { key: 'pois', href: `${base}/pois${langParam}`, icon: PoisIcon, external: true },
    { key: 'profiel', href: null, icon: ProfielIcon, badge: showBadge, profileTrigger: true },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{ height: 78 }}
      role="navigation"
      aria-label="Mobile navigation"
    >
      {/* Frosted glass background */}
      <div
        className="absolute inset-0 border-t border-white/20"
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          backgroundColor: 'rgba(255,255,255,0.88)',
        }}
      />

      <div className="relative flex items-end justify-around h-full px-2 pb-2 pt-1 safe-area-pb">
        {tabs.map((tab) => {
          const active = tab.href ? isActive(tab.href) : false;
          const IconComponent = tab.icon;

          // Raised center Chat button
          if (tab.raised) {
            const chatColor = chatbotColor || '#D4AF37';
            return (
              <button
                key={tab.key}
                onClick={openChatbot}
                className="flex flex-col items-center justify-center -mt-5 min-w-[56px]"
                aria-label={l(tab.key)}
                style={{ minHeight: 44, minWidth: 44 }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 active:scale-95"
                  style={{ backgroundColor: chatColor, color: '#fff' }}
                >
                  <IconComponent size={26} />
                </div>
                <span
                  className="text-[10px] font-medium mt-0.5 leading-tight"
                  style={{ color: chatColor }}
                >
                  {l(tab.key)}
                </span>
              </button>
            );
          }

          const content = (
            <>
              <div className="relative">
                <IconComponent
                  size={22}
                />
                {tab.badge && (
                  <span
                    className="absolute -top-1 -right-2 rounded-full text-white text-[9px] font-bold flex items-center justify-center notif-badge"
                    style={{ width: 18, height: 18, backgroundColor: '#E74C3C', border: '2px solid white' }}
                  >
                    1
                  </span>
                )}
              </div>
              <span
                className="text-[10px] mt-0.5 leading-tight"
                style={{
                  color: active ? accentColor : '#6B7280',
                  fontWeight: active ? 600 : 500,
                }}
              >
                {l(tab.key)}
              </span>
            </>
          );

          if (tab.href && (tab as any).external) {
            return (
              <a
                key={tab.key}
                href={tab.href}
                className="flex flex-col items-center justify-center transition-opacity duration-150"
                style={{ minHeight: 44, minWidth: 44 }}
                aria-label={l(tab.key)}
                onClick={() => analytics.mobile_bottom_nav(tab.key)}
              >
                {content}
              </a>
            );
          }

          if (tab.href) {
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className="flex flex-col items-center justify-center transition-opacity duration-150"
                style={{ minHeight: 44, minWidth: 44 }}
                aria-label={l(tab.key)}
                aria-current={active ? 'page' : undefined}
                onClick={() => analytics.mobile_bottom_nav(tab.key)}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={tab.key}
              onClick={(tab as any).profileTrigger ? handleProfile : openChatbot}
              className="flex flex-col items-center justify-center transition-opacity duration-150"
              style={{ minHeight: 44, minWidth: 44 }}
              aria-label={l(tab.key)}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ── Colored SVG Icon components (matching production template) ── */

function HomeIcon({ size = 22 }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Roof — orange/red */}
      <path d="M12 3L2 12h3v8a1 1 0 001 1h12a1 1 0 001-1v-8h3L12 3z" fill="#E8734A" />
      {/* Wall — lighter beige */}
      <rect x="6" y="12" width="12" height="9" rx="1" fill="#F4C78E" />
      {/* Door — brown */}
      <rect x="10" y="15" width="4" height="6" rx="0.5" fill="#C0724A" />
      {/* Window — light blue */}
      <rect x="7.5" y="13.5" width="3" height="2.5" rx="0.5" fill="#87CEEB" />
    </svg>
  );
}

function AgendaIcon({ size = 22 }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Calendar body — light blue */}
      <rect x="3" y="5" width="18" height="17" rx="2.5" fill="#B8D4E8" />
      {/* Header — darker blue */}
      <rect x="3" y="5" width="18" height="6" rx="2.5" fill="#7BAFD4" />
      <rect x="3" y="8" width="18" height="3" fill="#7BAFD4" />
      {/* Rings */}
      <rect x="7.5" y="2.5" width="1.5" height="5" rx="0.75" fill="#5A8BAF" />
      <rect x="15" y="2.5" width="1.5" height="5" rx="0.75" fill="#5A8BAF" />
      {/* Date dots — colored */}
      <circle cx="8" cy="14" r="1.2" fill="#E8734A" />
      <circle cx="12" cy="14" r="1.2" fill="#7BAFD4" />
      <circle cx="16" cy="14" r="1.2" fill="#E8734A" />
      <circle cx="8" cy="18" r="1.2" fill="#7BAFD4" />
      <circle cx="12" cy="18" r="1.2" fill="#E8734A" />
      <circle cx="16" cy="18" r="1.2" fill="#7BAFD4" />
    </svg>
  );
}

function ChatIcon({ size = 26 }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function PoisIcon({ size = 22 }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Pin body — pink/magenta */}
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#E88CA5" />
      {/* Inner circle — white */}
      <circle cx="12" cy="9" r="3" fill="white" />
      {/* Inner dot — pink */}
      <circle cx="12" cy="9" r="1.3" fill="#E88CA5" />
    </svg>
  );
}

function ProfielIcon({ size = 22 }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Body — purple */}
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" fill="#C4A8D8" />
      {/* Head — purple */}
      <circle cx="12" cy="7" r="4" fill="#B794C8" />
    </svg>
  );
}
