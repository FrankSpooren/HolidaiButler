import Link from 'next/link';
import type { TenantConfig } from '@/types/tenant';

interface FooterProps {
  tenant: TenantConfig;
  locale: string;
}

export default function Footer({ tenant, locale }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-on-primary mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-heading font-bold mb-2">
              {tenant.displayName}
            </h3>
            <p className="text-sm opacity-70">
              {tenant.branding.payoff?.[locale] ?? tenant.branding.payoff?.en ?? ''}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-3 opacity-70">
              {locale === 'nl' ? 'Navigatie' : 'Navigation'}
            </h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link href="/" className="hover:opacity-100 transition-opacity">Home</Link></li>
              <li><Link href="/explore" className="hover:opacity-100 transition-opacity">{locale === 'nl' ? 'Ontdekken' : 'Explore'}</Link></li>
              <li><Link href="/restaurants" className="hover:opacity-100 transition-opacity">Restaurants</Link></li>
              {tenant.featureFlags.agenda && (
                <li><Link href="/events" className="hover:opacity-100 transition-opacity">{locale === 'nl' ? 'Evenementen' : 'Events'}</Link></li>
              )}
              <li><Link href="/about" className="hover:opacity-100 transition-opacity">{locale === 'nl' ? 'Over ons' : 'About'}</Link></li>
              <li><Link href="/contact" className="hover:opacity-100 transition-opacity">Contact</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-3 opacity-70">
              Contact
            </h4>
            <p className="text-sm opacity-80">info@holidaibutler.com</p>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 text-center text-sm opacity-60">
          &copy; {year} {tenant.displayName}. Powered by HolidaiButler.
        </div>
      </div>
    </footer>
  );
}
