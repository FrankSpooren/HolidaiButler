import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { fetchTenantConfig } from '@/lib/api';
import { brandingToCssVars } from '@/lib/theme';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ChatbotWidget from '@/components/modules/ChatbotWidget';
import PoiDetailDrawer from '@/components/modules/PoiDetailDrawer';
import EventDetailDrawer from '@/components/modules/EventDetailDrawer';
import ScrollToTop from '@/components/ui/ScrollToTop';
import MobileBottomNav from '@/components/MobileBottomNav';
import MobileHeader from '@/components/MobileHeader';
import OnboardingSheet from '@/components/OnboardingSheet';
import MobileHomepage from '@/components/mobile/MobileHomepage';
import HoliBotProviderWrapper from '@/components/chatbot/HoliBotProviderWrapper';
import { resolveAssetUrl } from '@/lib/assets';
import Script from 'next/script';
import './globals.css';

/* ── Brand name mapping (destination-specific) ── */
const BRAND_NAMES: Record<string, string> = {
  calpe: 'CALPETRIP',
  texel: 'TEXELMAPS',
};

function resolveBrandName(tenant: { code: string; displayName: string }): string {
  return BRAND_NAMES[tenant.code] || tenant.displayName.toUpperCase();
}

interface ConfigNavItem {
  label: Record<string, string> | string;
  href: string;
  featureFlag?: string;
  isActive?: boolean;
  sortOrder?: number;
}

function resolveNavItemsForMobile(
  tenant: { config?: { nav_items?: ConfigNavItem[]; [key: string]: unknown }; featureFlags: Record<string, boolean | undefined> },
  locale: string
): { label: string; href: string }[] {
  const items = tenant.config?.nav_items as ConfigNavItem[] | undefined;
  const nl = locale === 'nl';

  const defaults = [
    { label: nl ? 'Ontdekken' : 'Explore', href: '/explore' },
    { label: nl ? 'Restaurants' : 'Restaurants', href: '/restaurants' },
    { label: nl ? 'Evenementen' : 'Events', href: '/events' },
    { label: nl ? 'Over ons' : 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  if (!Array.isArray(items) || items.length === 0) return defaults;

  return items
    .filter(i => i.isActive !== false)
    .filter(i => !i.featureFlag || tenant.featureFlags[i.featureFlag] === true)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(i => ({
      label: typeof i.label === 'object'
        ? (i.label[locale] || i.label.en || i.label.nl || '')
        : String(i.label),
      href: i.href,
    }));
}

export const metadata: Metadata = {
  title: 'HolidaiButler',
  description: 'Your AI Travel Companion',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const pathname = headersList.get('x-invoke-path') || headersList.get('x-matched-path') || '';
  const isPreview = pathname.startsWith('/preview');
  const locale = headersList.get('x-tenant-locale') ?? 'en';

  let tenant;
  try {
    tenant = await fetchTenantConfig(tenantSlug);
  } catch {
    // Fallback when API is unavailable (build time)
    tenant = null;
  }

  const cssVars = tenant?.branding ? brandingToCssVars(tenant.branding) : {};
  const fontLinks = tenant?.branding?.fonts
    ? [tenant.branding.fonts.headingUrl, tenant.branding.fonts.bodyUrl].filter(Boolean)
    : [];

  return (
    <html lang={locale} style={cssVars}>
      <head>
        {fontLinks.map((url) => (
          <link key={`preload-${url}`} rel="preload" as="style" href={url!} />
        ))}
        {fontLinks.map((url) => (
          <link key={url} rel="stylesheet" href={url!} />
        ))}
        {tenant?.branding?.favicon && (
          <link rel="icon" href={resolveAssetUrl(tenant.branding.favicon)} />
        )}
        {tenant?.branding?.navicon && (
          <link rel="apple-touch-icon" href={resolveAssetUrl(tenant.branding.navicon)} />
        )}
        {tenant?.branding?.colors?.primary && (
          <meta name="theme-color" content={tenant.branding.colors.primary} />
        )}
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground font-body antialiased">
        <HoliBotProviderWrapper>
        {/* Desktop header — hidden on /preview */}
        {!isPreview && tenant && (
          <div className="hidden md:block">
            <Header tenant={tenant} locale={locale} />
          </div>
        )}
        {/* Mobile header — hidden on /preview */}
        {!isPreview && tenant && (() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mh = (tenant.branding as any)?.mobileHomepage;
          const greeting = mh?.greeting
            ? `${mh.greeting} ${mh.greetingEmoji || ''}`.trim()
            : undefined;
          return (
            <MobileHeader
              brandName={mh?.brandName || resolveBrandName(tenant)}
              locale={locale}
              greeting={greeting}
              primaryColor={tenant.branding?.colors?.primary}
              secondaryColor={tenant.branding?.colors?.secondary}
              navItems={resolveNavItemsForMobile(tenant, locale)}
              subtitle={mh?.subtitle}
              chatbotName={(tenant.branding as any)?.chatbotConfig?.name || undefined}
            />
          );
        })()}
        <main className="flex-1 pb-[78px] md:pb-0">
          {children}
          {/* Calpe: standalone MobileHomepage (originele template). Texel: page builder mobile blocks */}
          {!isPreview && tenantSlug !== 'texel' && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <MobileHomepage
              locale={locale}
              destinationName={tenant?.displayName || 'Calpe'}
              destinationSlug={tenantSlug}
              mobileConfig={(tenant?.branding as any)?.mobileHomepage}
            />
          )}
        </main>
        {!isPreview && tenant && (
          <div className="hidden md:block">
            <Footer tenant={tenant} locale={locale} />
          </div>
        )}
        {!isPreview && <MobileBottomNav
          locale={locale}
          primaryColor={tenant?.branding?.colors?.primary}
          chatbotColor={
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (tenant?.branding as any)?.chatbotConfig?.color || undefined
          }
        />}
        {!isPreview && tenant?.featureFlags.holibot && (
          <ChatbotWidget
            tenantSlug={tenantSlug}
            locale={locale}
            chatbotName={
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (tenant.branding as any)?.chatbotConfig?.name || undefined
            }
            quickActionFilter={
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (tenant.branding as any)?.chatbotConfig?.quickActions || undefined
            }
            chatbotColor={
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (tenant.branding as any)?.chatbotConfig?.color || undefined
            }
            welcomeMessage={
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (tenant.branding as any)?.chatbotConfig?.welcomeMessage || undefined
            }
          />
        )}
        <PoiDetailDrawer locale={locale} />
        <EventDetailDrawer locale={locale} />
        <ScrollToTop />
        <OnboardingSheet
          locale={locale}
          primaryColor={tenant?.branding?.colors?.primary}
        />
        {/* CookieBanner disabled for now */}
        {/* 100% privacy-first analytics */}
        <Script
          src="https://scripts.simpleanalyticscdn.com/latest.js"
          strategy="afterInteractive"
        />
        {/* Automated events: outbound links, emails, downloads */}
        <Script
          src="https://scripts.simpleanalyticscdn.com/auto-events.js"
          data-collect="outbound,emails,downloads"
          data-extensions="pdf,csv,docx,xlsx,zip"
          data-use-title="true"
          strategy="afterInteractive"
        />
        {/* inline.js removed — script no longer exists on SA CDN, tracking handled by analytics.ts sendBeacon */}
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://queue.simpleanalyticscdn.com/noscript.gif" alt="" referrerPolicy="no-referrer-when-downgrade" />
        </noscript>
        {/* Meta Pixel — Calpe only (Facebook/Instagram ads tracking) */}
        {tenantSlug === 'calpe' && (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">
              {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','630148300193979');fbq('track','PageView');`}
            </Script>
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img height="1" width="1" style={{ display: 'none' }} src="https://www.facebook.com/tr?id=630148300193979&ev=PageView&noscript=1" alt="" />
            </noscript>
          </>
        )}
        </HoliBotProviderWrapper>
      </body>
    </html>
  );
}
