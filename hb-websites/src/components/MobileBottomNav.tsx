'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface MobileBottomNavProps {
  locale: string;
  primaryColor?: string;
}

const LABELS: Record<string, Record<string, string>> = {
  home:    { nl: 'Home',    en: 'Home',    de: 'Home',    es: 'Inicio' },
  agenda:  { nl: 'Agenda',  en: 'Agenda',  de: 'Termine', es: 'Agenda' },
  chat:    { nl: 'Chat',    en: 'Chat',    de: 'Chat',    es: 'Chat' },
  pois:    { nl: 'POIs',    en: 'POIs',    de: 'POIs',    es: 'POIs' },
  profiel: { nl: 'Profiel', en: 'Profile', de: 'Profil',  es: 'Perfil' },
};

export default function MobileBottomNav({ locale, primaryColor }: MobileBottomNavProps) {
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

  const accentColor = primaryColor || 'var(--hb-primary)';

  const tabs = [
    { key: 'home', href: '/', icon: HomeIcon },
    { key: 'agenda', href: '/events', icon: AgendaIcon },
    { key: 'chat', href: null, icon: ChatIcon, raised: true },
    { key: 'pois', href: '/explore', icon: PoisIcon },
    { key: 'profiel', href: '/profiel', icon: ProfielIcon, badge: showBadge },
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
                  style={{ backgroundColor: accentColor, color: '#fff' }}
                >
                  <IconComponent size={26} />
                </div>
                <span
                  className="text-[10px] font-medium mt-0.5 leading-tight"
                  style={{ color: accentColor }}
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
                  color={active ? accentColor : '#9CA3AF'}
                />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                    1
                  </span>
                )}
              </div>
              <span
                className="text-[10px] mt-0.5 leading-tight"
                style={{
                  color: active ? accentColor : '#9CA3AF',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {l(tab.key)}
              </span>
            </>
          );

          if (tab.href) {
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className="flex flex-col items-center justify-center transition-opacity duration-150"
                style={{ minHeight: 44, minWidth: 44, opacity: active ? 1 : 0.7 }}
                aria-label={l(tab.key)}
                aria-current={active ? 'page' : undefined}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={tab.key}
              onClick={openChatbot}
              className="flex flex-col items-center justify-center transition-opacity duration-150"
              style={{ minHeight: 44, minWidth: 44, opacity: 0.7 }}
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

/* ── SVG Icon components (inline, no dependency) ── */

function HomeIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function AgendaIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ChatIcon({ size = 26, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function PoisIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ProfielIcon({ size = 22, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
