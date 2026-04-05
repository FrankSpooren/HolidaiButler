import Link from 'next/link';
import type { TenantConfig } from '@/types/tenant';
import { resolveAssetUrl } from '@/lib/assets';
import { analytics } from '@/lib/analytics';

interface FooterProps {
  tenant: TenantConfig;
  locale: string;
}

const socialIcons: Record<string, { label: string; svg: string }> = {
  instagram: {
    label: 'Instagram',
    svg: '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>',
  },
  facebook: {
    label: 'Facebook',
    svg: '<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>',
  },
  tiktok: {
    label: 'TikTok',
    svg: '<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>',
  },
  youtube: {
    label: 'YouTube',
    svg: '<path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>',
  },
  twitter: {
    label: 'X',
    svg: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
  },
  x: {
    label: 'X',
    svg: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
  },
  linkedin: {
    label: 'LinkedIn',
    svg: '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>',
  },
  pinterest: {
    label: 'Pinterest',
    svg: '<path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/>',
  },
  snapchat: {
    label: 'Snapchat',
    svg: '<path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.603.603 0 01.272-.067c.12 0 .24.03.34.082.15.075.27.18.315.345.038.12.045.24.015.36-.067.27-.27.48-.51.63-.15.09-.33.165-.495.225-.15.06-.345.12-.48.165-.21.06-.33.105-.39.18-.06.09-.03.21.09.42l.01.022c.44.84 1.05 1.545 1.785 2.07.405.285.855.495 1.29.615.15.045.39.105.435.375.03.21-.135.39-.27.51-.285.255-.615.39-.795.45a5.49 5.49 0 01-.36.12c-.09.03-.18.06-.24.09-.135.06-.18.12-.195.225-.015.15.09.3.21.45.405.495 1.02.84 1.785.975a.42.42 0 01.345.465c-.03.21-.15.375-.345.48-.315.165-.735.27-1.23.315a4.3 4.3 0 01-.345.03c-.135.015-.255.03-.345.075-.12.06-.195.165-.24.3-.06.195-.195.375-.405.45-.135.045-.285.06-.42.06-.21 0-.405-.045-.585-.105-.27-.09-.585-.165-.885-.165-.15 0-.315.015-.465.045a3.346 3.346 0 00-1.47.87c-.405.39-.87.645-1.365.75-.135.03-.27.045-.405.045-.135 0-.27-.015-.39-.045-.51-.105-.975-.36-1.38-.75-.435-.42-.93-.72-1.47-.87a2.78 2.78 0 00-.465-.045c-.3 0-.615.075-.885.165-.18.06-.375.105-.585.105-.135 0-.285-.015-.42-.06-.21-.075-.345-.255-.405-.45-.045-.135-.12-.24-.24-.3-.09-.045-.21-.06-.345-.075-.12-.015-.24-.015-.345-.03-.495-.045-.915-.15-1.23-.315-.195-.105-.315-.27-.345-.48a.42.42 0 01.345-.465c.765-.135 1.38-.48 1.785-.975.12-.15.225-.3.21-.45-.015-.105-.06-.165-.195-.225a1.17 1.17 0 00-.24-.09 5.49 5.49 0 01-.36-.12c-.18-.06-.51-.195-.795-.45-.135-.12-.3-.3-.27-.51.045-.27.285-.33.435-.375.435-.12.885-.33 1.29-.615.735-.525 1.35-1.23 1.785-2.07l.01-.022c.12-.21.15-.33.09-.42-.06-.075-.18-.12-.39-.18a6.65 6.65 0 01-.48-.165 2.37 2.37 0 01-.495-.225c-.24-.15-.45-.36-.51-.63a.48.48 0 01.015-.36c.045-.165.165-.27.315-.345a.57.57 0 01.34-.082c.09 0 .18.015.272.067.374.18.733.285 1.033.301.198 0 .326-.045.401-.09a8.2 8.2 0 01-.033-.57c-.104-1.628-.23-3.654.299-4.847C7.859 1.069 11.216.793 12.206.793z"/>',
  },
};

interface FooterColumn {
  type: string;
  title?: string | Record<string, string>;
  content?: string | Record<string, string>;
}

/** Resolve title: supports both plain string and i18n object {en: "...", nl: "..."} */
function resolveTitle(value: string | Record<string, string> | undefined, locale: string): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? value.en ?? value.nl ?? Object.values(value)[0] ?? '';
}

export default function Footer({ tenant, locale }: FooterProps) {
  const year = new Date().getFullYear();
  const socialLinks = tenant.socialLinks ?? {};
  const activeSocials = Object.entries(socialLinks).filter(
    ([platform, url]) => url && socialIcons[platform]
  );

  const footerConfig = tenant.branding.footer;
  const columns: FooterColumn[] = footerConfig?.columns ?? [
    { type: 'brand', title: '' },
    { type: 'navigation', title: locale === 'nl' ? 'Navigatie' : 'Navigation' },
    { type: 'contact', title: 'Contact' },
    { type: 'social', title: 'Social' }
  ];
  const copyright = resolveTitle(footerConfig?.copyright, locale) || `\u00A9 ${year} ${tenant.displayName}. Powered by HolidaiButler.`;

  const renderColumn = (col: FooterColumn) => {
    switch (col.type) {
      case 'brand': {
        const logoUrl = tenant.branding.logo ? resolveAssetUrl(tenant.branding.logo) : null;
        return (
          <>
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={tenant.displayName} className="h-10 w-auto mb-3" />
            )}
            <h3 className="text-lg font-heading font-bold mb-2">
              {tenant.displayName}
            </h3>
            <p className="text-sm opacity-70 mb-4">
              {tenant.branding.payoff?.[locale] ?? tenant.branding.payoff?.en ?? ''}
            </p>
            {activeSocials.length > 0 && (
              <div className="flex gap-3 mt-2">
                {activeSocials.map(([platform, url]) => {
                  const icon = socialIcons[platform];
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={icon.label}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
                      onClick={() => analytics.social_link_clicked(platform)}
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" dangerouslySetInnerHTML={{ __html: icon.svg }} />
                    </a>
                  );
                })}
              </div>
            )}
          </>
        );
      }

      case 'navigation': {
        const configItems = tenant.config?.nav_items as Array<{
          label: Record<string, string> | string;
          href: string;
          featureFlag?: string;
          isActive?: boolean;
          sortOrder?: number;
        }> | undefined;

        const navLinks = (Array.isArray(configItems) && configItems.length > 0)
          ? configItems
              .filter(item => item.isActive !== false)
              .filter(item => !item.featureFlag || tenant.featureFlags[item.featureFlag] === true)
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
              .map(item => ({
                label: typeof item.label === 'object'
                  ? (item.label[locale] || item.label.en || item.label.nl || '')
                  : String(item.label),
                href: item.href,
              }))
          : [
              { label: 'Home', href: '/' },
              { label: locale === 'nl' ? 'Ontdekken' : 'Explore', href: '/explore' },
              { label: 'Restaurants', href: '/restaurants' },
              ...(tenant.featureFlags.agenda ? [{ label: locale === 'nl' ? 'Evenementen' : 'Events', href: '/events' }] : []),
              { label: locale === 'nl' ? 'Over ons' : 'About', href: '/about' },
              { label: 'Contact', href: '/contact' },
            ];

        return (
          <>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-3 opacity-70">
              {resolveTitle(col.title, locale) || (locale === 'nl' ? 'Navigatie' : 'Navigation')}
            </h4>
            <ul className="space-y-2 text-sm opacity-80">
              {navLinks.map((link, idx) => (
                <li key={idx}>
                  <Link href={link.href} className="hover:opacity-100 transition-opacity" onClick={() => analytics.footer_link_clicked(link.label)}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        );
      }

      case 'contact':
        return (
          <>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-3 opacity-70">
              {resolveTitle(col.title, locale) || 'Contact'}
            </h4>
            <p className="text-sm opacity-80">{tenant.branding.contactEmail || 'info@holidaibutler.com'}</p>
          </>
        );

      case 'social':
        return (
          <>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-3 opacity-70">
              {resolveTitle(col.title, locale) || 'Social'}
            </h4>
            {activeSocials.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {activeSocials.map(([platform, url]) => {
                  const icon = socialIcons[platform];
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={icon.label}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      onClick={() => analytics.social_link_clicked(platform)}
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" dangerouslySetInnerHTML={{ __html: icon.svg }} />
                    </a>
                  );
                })}
              </div>
            )}
          </>
        );

      case 'newsletter':
        return (
          <>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-3 opacity-70">
              {resolveTitle(col.title, locale) || 'Newsletter'}
            </h4>
            <p className="text-sm opacity-80 mb-2">
              {locale === 'nl' ? 'Blijf op de hoogte' : 'Stay updated'}
            </p>
          </>
        );

      case 'custom':
      default: {
        const resolvedCustomTitle = resolveTitle(col.title, locale);
        const resolvedCustomContent = resolveTitle(col.content, locale);
        const isHtml = resolvedCustomContent.includes('<');
        return (
          <>
            {resolvedCustomTitle && (
              <h4 className="text-sm font-semibold uppercase tracking-wider mb-3 opacity-70">
                {resolvedCustomTitle}
              </h4>
            )}
            {resolvedCustomContent && (
              isHtml
                ? <div className="text-sm opacity-80 [&_a]:block [&_a]:py-1 [&_a]:opacity-80 [&_a]:hover:opacity-100 [&_a]:transition-opacity" dangerouslySetInnerHTML={{ __html: resolvedCustomContent }} />
                : <p className="text-sm opacity-80">{resolvedCustomContent}</p>
            )}
          </>
        );
      }
    }
  };

  const gridCols = columns.length <= 2 ? 'md:grid-cols-2' : columns.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4';

  return (
    <footer className="bg-foreground text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className={`grid grid-cols-1 ${gridCols} gap-8`}>
          {columns.map((col, i) => (
            <div key={i}>{renderColumn(col)}</div>
          ))}
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-sm opacity-60">
          <span>{copyright}</span>
          <span>Gemaakt met ❤️ op {tenant.displayName || 'Texel'}</span>
        </div>
      </div>
    </footer>
  );
}
