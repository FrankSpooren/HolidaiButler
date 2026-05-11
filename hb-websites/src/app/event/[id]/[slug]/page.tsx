import { redirect } from 'next/navigation';

/**
 * Event Detail slug-based route — VII-E3 Sub-batch 1
 * /event/[id]/[slug] → resolves to existing /event/[id] page
 * Slug is for SEO only — ID is authoritative.
 */

interface PageProps {
  params: Promise<{ id: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  // Delegate to the existing /event/[id] metadata generator
  const { id } = await params;
  const { generateMetadata: gen } = await import('../../[id]/page');
  return gen({ params: Promise.resolve({ id }) });
}

export default async function EventSlugPage({ params }: PageProps) {
  const { id } = await params;
  // Redirect to canonical /event/[id] — slug is cosmetic for SEO
  redirect(`/event/${id}`);
}
