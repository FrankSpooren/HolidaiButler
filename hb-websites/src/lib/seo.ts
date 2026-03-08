import type { Metadata } from 'next';
import type { PageData } from '@/types/blocks';
import type { TenantConfig } from '@/types/tenant';

export function generatePageMetadata(
  page: PageData,
  tenant: TenantConfig,
  options?: { locale?: string; baseUrl?: string }
): Metadata {
  const title = page.seoTitle ?? page.title ?? tenant.displayName;
  const description = page.seoDescription ?? `${tenant.displayName} - ${page.title}`;
  const baseUrl = options?.baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://holidaibutler.com';
  const locale = options?.locale ?? 'en';
  const pageSlug = page.slug === 'home' ? '' : page.slug;
  const canonicalUrl = `${baseUrl}/${pageSlug}`.replace(/\/$/, '');

  const locales = ['nl', 'en', 'de', 'es'];
  const alternates: Record<string, string> = {};
  for (const lang of locales) {
    alternates[lang] = canonicalUrl;
  }

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: alternates,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: page.ogImageUrl ? [{ url: page.ogImageUrl }] : undefined,
      siteName: tenant.displayName,
      type: 'website',
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// JSON-LD structured data generators

export function generateWebSiteJsonLd(tenant: TenantConfig, baseUrl: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: tenant.displayName,
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/explore?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateLocalBusinessJsonLd(tenant: TenantConfig, baseUrl: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristInformationCenter',
    name: tenant.displayName,
    url: baseUrl,
    ...(tenant.branding?.logo && { logo: tenant.branding.logo }),
    ...(tenant.branding?.socialLinks?.instagram && {
      sameAs: Object.values(tenant.branding.socialLinks).filter(Boolean),
    }),
  };
}

export function generateBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateFaqJsonLd(
  items: Array<{ question: string; answer: string }>,
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function generateEventJsonLd(event: {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: { name?: string; address?: string };
  url?: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    ...(event.description && { description: event.description }),
    startDate: event.startDate,
    ...(event.endDate && { endDate: event.endDate }),
    ...(event.location && {
      location: {
        '@type': 'Place',
        name: event.location.name,
        address: event.location.address,
      },
    }),
    ...(event.url && { url: event.url }),
  };
}
