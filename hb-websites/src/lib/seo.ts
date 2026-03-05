import type { Metadata } from 'next';
import type { PageData } from '@/types/blocks';
import type { TenantConfig } from '@/types/tenant';

export function generatePageMetadata(
  page: PageData,
  tenant: TenantConfig
): Metadata {
  const title = page.seoTitle ?? page.title ?? tenant.displayName;
  const description = page.seoDescription ?? `${tenant.displayName} - ${page.title}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: page.ogImageUrl ? [{ url: page.ogImageUrl }] : undefined,
      siteName: tenant.displayName,
      type: 'website',
    },
  };
}
