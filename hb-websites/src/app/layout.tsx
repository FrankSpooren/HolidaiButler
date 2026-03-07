import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { fetchTenantConfig } from '@/lib/api';
import { brandingToCssVars } from '@/lib/theme';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ChatbotWidget from '@/components/modules/ChatbotWidget';
import CookieBanner from '@/components/modules/CookieBanner';
import './globals.css';

export const metadata: Metadata = {
  title: 'HolidaiButler',
  description: 'Your AI Travel Companion',
};

/** Resolve asset URL: if path is already absolute (http/https), use directly; else prefix with public asset URL */
function resolveAssetUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const baseUrl = process.env.HB_ASSET_URL ?? process.env.HB_API_URL ?? '';
  return `${baseUrl}${path}`;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'nl';

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
        {tenant && <Header tenant={tenant} locale={locale} />}
        <main className="flex-1">{children}</main>
        {tenant && <Footer tenant={tenant} locale={locale} />}
        {tenant?.featureFlags.holibot && (
          <ChatbotWidget
            tenantSlug={tenantSlug}
            locale={locale}
            apiUrl={process.env.HB_API_URL ?? 'http://localhost:3001'}
          />
        )}
        <CookieBanner
          locale={locale}
          primaryColor={tenant?.branding?.colors?.primary}
          privacyPolicyUrl={tenant?.branding?.privacyPolicyUrl}
        />
      </body>
    </html>
  );
}
