import Link from 'next/link';
import type { TenantConfig } from '@/types/tenant';
import Nav from './Nav';

interface HeaderProps {
  tenant: TenantConfig;
  locale: string;
}

export default function Header({ tenant, locale }: HeaderProps) {
  const payoff = tenant.branding.payoff?.[locale] ?? tenant.branding.payoff?.en ?? '';

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          {/* Logo + payoff */}
          <Link href="/" className="flex items-center gap-3">
            {tenant.branding.logo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`${process.env.HB_API_URL ?? ''}${tenant.branding.logo}`}
                alt={tenant.displayName}
                className="h-8 w-auto"
              />
            ) : (
              <span className="text-xl font-heading font-bold text-primary">
                {tenant.displayName}
              </span>
            )}
            {payoff && (
              <span className="hidden sm:inline text-sm text-muted">
                {payoff}
              </span>
            )}
          </Link>

          {/* Navigation */}
          <Nav items={[]} featureFlags={tenant.featureFlags} locale={locale} />
        </div>
      </div>
    </header>
  );
}
