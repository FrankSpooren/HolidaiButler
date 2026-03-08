import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchTenantConfig, fetchPage } from '@/lib/api';
import { generatePageMetadata, generateWebSiteJsonLd, generateBreadcrumbJsonLd } from '@/lib/seo';
import { resolveLocalizedProps } from '@/lib/i18n';
import { getBlock } from '@/blocks/index';
import BlockRenderer from '@/components/ui/BlockRenderer';
import type { BlockConfig, BlockStyle } from '@/types/blocks';
import type { FeatureFlags } from '@/types/tenant';

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';
  const pageSlug = slug?.join('/') || 'home';

  try {
    const [tenant, page] = await Promise.all([
      fetchTenantConfig(tenantSlug),
      fetchPage(tenantSlug, pageSlug, locale),
    ]);
    if (!tenant || !page) return { title: 'HolidaiButler' };
    return generatePageMetadata(page, tenant, { locale });
  } catch {
    return { title: 'HolidaiButler' };
  }
}

function shouldRenderBlock(block: BlockConfig, featureFlags: FeatureFlags): boolean {
  if (!block.featureFlag) return true;
  return featureFlags[block.featureFlag] === true;
}

const paddingMap: Record<string, string> = {
  none: '0',
  small: '1rem',
  medium: '2rem',
  large: '3rem',
  xlarge: '5rem',
};

function getBlockWrapperStyle(style?: BlockStyle): React.CSSProperties | undefined {
  if (!style) return undefined;
  const css: React.CSSProperties = {};
  if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
  if (style.backgroundImage) {
    css.backgroundImage = `url(${style.backgroundImage})`;
    css.backgroundSize = 'cover';
    css.backgroundPosition = 'center';
  }
  if (style.borderColor) {
    css.borderTop = `2px solid ${style.borderColor}`;
    css.borderBottom = `2px solid ${style.borderColor}`;
  }
  if (style.paddingY && style.paddingY !== 'none') {
    const py = paddingMap[style.paddingY] || '2rem';
    css.paddingTop = py;
    css.paddingBottom = py;
  }
  if (Object.keys(css).length === 0) return undefined;
  return css;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const headersList = await headers();
  const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
  const locale = headersList.get('x-tenant-locale') ?? 'en';
  const pageSlug = slug?.join('/') || 'home';

  const [tenant, page] = await Promise.all([
    fetchTenantConfig(tenantSlug),
    fetchPage(tenantSlug, pageSlug, locale),
  ]);

  if (!tenant || !page) {
    notFound();
  }

  const blocks = page.layout?.blocks ?? [];
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://holidaibutler.com';

  // JSON-LD structured data
  const jsonLdItems: object[] = [];

  // WebSite schema on homepage
  if (pageSlug === 'home') {
    jsonLdItems.push(generateWebSiteJsonLd(tenant, baseUrl));
  }

  // Breadcrumb
  const breadcrumbs = [{ name: tenant.displayName, url: baseUrl }];
  if (pageSlug !== 'home') {
    breadcrumbs.push({ name: page.title ?? pageSlug, url: `${baseUrl}/${pageSlug}` });
  }
  jsonLdItems.push(generateBreadcrumbJsonLd(breadcrumbs));

  return (
    <>
      {jsonLdItems.map((jsonLd, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ))}
      {blocks.map((block: BlockConfig) => {
        if (!shouldRenderBlock(block, tenant.featureFlags)) return null;

        const BlockComponent = getBlock(block.type);
        if (!BlockComponent) {
          if (process.env.NODE_ENV === 'development') console.warn(`Unknown block type: ${block.type}`);
          return null;
        }

        const resolvedProps = resolveLocalizedProps(block.props, locale);
        const wrapperStyle = getBlockWrapperStyle(block.style);
        const wrapperClass = block.style?.fullWidth ? 'w-full' : '';

        if (wrapperStyle || wrapperClass) {
          return (
            <BlockRenderer key={block.id} blockType={block.type}>
              <div className={wrapperClass || undefined} style={wrapperStyle}>
                <BlockComponent {...resolvedProps} />
              </div>
            </BlockRenderer>
          );
        }

        return (
          <BlockRenderer key={block.id} blockType={block.type}>
            <BlockComponent {...resolvedProps} />
          </BlockRenderer>
        );
      })}
    </>
  );
}
