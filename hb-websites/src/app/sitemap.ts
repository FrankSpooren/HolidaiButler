import type { MetadataRoute } from 'next';

const API_URL = process.env.HB_API_URL ?? 'http://localhost:3001';

interface PageRecord {
  slug: string;
  updated_at?: string;
  status?: string;
}

async function fetchPages(destinationId: number): Promise<PageRecord[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/pages?limit=999`, {
      headers: { 'X-Destination-ID': String(destinationId) },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.pages || []).filter((p: PageRecord) => p.status === 'published');
  } catch {
    return [];
  }
}

async function fetchPoiIds(destinationId: number): Promise<Array<{ id: number; updated_at?: string }>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/pois?limit=100&fields=id,updated_at`, {
      headers: { 'X-Destination-ID': String(destinationId) },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.pois || [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://holidaibutler.com';
  const destinationId = process.env.DESTINATION_ID ? parseInt(process.env.DESTINATION_ID) : 1;

  const [pages, pois] = await Promise.all([
    fetchPages(destinationId),
    fetchPoiIds(destinationId),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  // Homepage
  entries.push({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1,
  });

  // Pages
  for (const page of pages) {
    if (page.slug === 'home') continue; // Already added as root
    entries.push({
      url: `${baseUrl}/${page.slug}`,
      lastModified: page.updated_at ? new Date(page.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // POI detail pages (top 100)
  for (const poi of pois.slice(0, 100)) {
    entries.push({
      url: `${baseUrl}/poi/${poi.id}`,
      lastModified: poi.updated_at ? new Date(poi.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  return entries;
}
