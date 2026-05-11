import { redirect } from 'next/navigation';

/**
 * POI Detail slug-based route — VII-E3 Sub-batch 1
 * /poi/[id]/[slug] → resolves to existing /poi/[id] page
 * Slug is for SEO only — ID is authoritative.
 */

interface PageProps {
  params: Promise<{ id: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { generateMetadata: gen } = await import('../../[id]/page');
  return gen({ params: Promise.resolve({ id }) });
}

export default async function PoiSlugPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/poi/${id}`);
}
