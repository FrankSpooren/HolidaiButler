import Link from 'next/link';
import type { TenantConfig } from '@/types/tenant';

import Nav from './Nav';
import WcagButton from '@/components/ui/WcagButton';

interface HeaderProps {
  tenant: TenantConfig;
  locale: string;
}

interface NavItemStyle {
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  borderRadius?: string;
  backgroundColor?: string;
}

interface NavItem {
  label: string;
  href: string;
  featureFlag?: string;
  style?: NavItemStyle;
}

interface ConfigNavItem {
  label: Record<string, string> | string;
  href: string;
  featureFlag?: string;
  isActive?: boolean;
  sortOrder?: number;
  style?: NavItemStyle;
}

/* ── Brand name mapping (destination-specific, matches MobileHeader) ── */
const BRAND_NAMES: Record<string, string> = {
  calpe: 'CALPETRIP',
  texel: 'TEXELMAPS',
};

/** Hardcoded fallback when no nav_items are configured in Admin Portal */
function getDefaultNavItems(locale: string): NavItem[] {
  const nl = locale === 'nl';
  return [
    { label: nl ? 'Ontdekken' : 'Explore', href: '/explore' },
    { label: nl ? 'Restaurants' : 'Restaurants', href: '/restaurants' },
    { label: nl ? 'Evenementen' : 'Events', href: '/events', featureFlag: 'agenda' },
    { label: nl ? 'Over ons' : 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];
}

/** Resolve nav items: prefer config.nav_items from Admin Portal, fallback to hardcoded */
function resolveNavItems(tenant: TenantConfig, locale: string): NavItem[] {
  const configItems: ConfigNavItem[] | undefined = tenant.config?.nav_items as ConfigNavItem[] | undefined;

  if (!Array.isArray(configItems) || configItems.length === 0) {
    return getDefaultNavItems(locale);
  }

  return configItems
    .filter(item => item.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(item => ({
      label: typeof item.label === 'object'
        ? (item.label[locale] || item.label.en || item.label.nl || '')
        : String(item.label),
      href: item.href,
      featureFlag: item.featureFlag || undefined,
      style: item.style || undefined,
    }));
}

export default function Header({ tenant, locale }: HeaderProps) {
  const payoff = tenant.branding.payoff?.[locale] ?? tenant.branding.payoff?.en ?? '';
  const navItems = resolveNavItems(tenant, locale).filter(
    item => !item.featureFlag || tenant.featureFlags[item.featureFlag] === true
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headerStyle = (tenant.branding as any)?.headerStyle;
  const isTransparent = headerStyle?.variant === 'transparent';
  const isSticky = headerStyle?.sticky !== false;

  const headerClasses = [
    isSticky ? 'sticky top-0' : '',
    'z-40',
    isTransparent ? 'absolute top-0 left-0 right-0 bg-transparent' : 'bg-surface/95 backdrop-blur-sm border-b border-gray-100',
  ].filter(Boolean).join(' ');

  return (
    <header className={headerClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          {/* Brand name + payoff */}
          <Link href="/" className="flex items-center gap-3" data-sa-event="logo_clicked">
            <span
              className="text-lg sm:text-xl font-bold tracking-widest uppercase"
              style={{ color: tenant.branding.colors?.primary || 'var(--hb-primary)', fontFamily: 'var(--hb-font-heading), sans-serif' }}
            >
              {BRAND_NAMES[tenant.code] || tenant.displayName}
            </span>
            {payoff && (
              <span className="hidden sm:inline text-sm text-muted">
                {payoff}
              </span>
            )}
          </Link>

          {/* Navigation + WCAG */}
          <div className="flex items-center gap-2">
            <Nav items={navItems} featureFlags={tenant.featureFlags} locale={locale} />
            <WcagButton locale={locale} />
          </div>
        </div>
      </div>
    </header>
  );
}
