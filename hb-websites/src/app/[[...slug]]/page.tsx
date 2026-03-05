import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchTenantConfig, fetchPage } from '@/lib/api';
import { generatePageMetadata } from '@/lib/seo';
import { getBlock } from '@/blocks/index';
import type { BlockConfig } from '@/types/blocks';
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
    return generatePageMetadata(page, tenant);
  } catch {
    return { title: 'HolidaiButler' };
  }
}

function shouldRenderBlock(block: BlockConfig, featureFlags: FeatureFlags): boolean {
  if (!block.featureFlag) return true;
  return featureFlags[block.featureFlag] === true;
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

  return (
    <>
      {blocks.map((block: BlockConfig) => {
        if (!shouldRenderBlock(block, tenant.featureFlags)) return null;

        const BlockComponent = getBlock(block.type);
        if (!BlockComponent) {
          console.warn(`Unknown block type: ${block.type}`);
          return null;
        }

        return <BlockComponent key={block.id} {...block.props} />;
      })}
    </>
  );
}
