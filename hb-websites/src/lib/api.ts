import type { TenantConfig } from '@/types/tenant';
import type { PageData } from '@/types/blocks';
import type { POI, Category, AgendaEvent, Review, Ticket, ReservationSlot } from '@/types/poi';
import type { ApiResponse } from '@/types/api';

const HB_API_URL = process.env.HB_API_URL ?? 'http://localhost:3001';

// Destination code → numeric ID mapping (matches DB)
const DESTINATION_IDS: Record<string, number> = {
  calpe: 1,
  texel: 2,
  alicante: 3,
  warrewijzer: 4,
};

async function hbFetch<T>(
  path: string,
  tenantSlug: string,
  opts?: { revalidate?: number; locale?: string; params?: Record<string, string> }
): Promise<T> {
  const url = new URL(path, HB_API_URL);
  if (opts?.params) {
    Object.entries(opts.params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const destinationId = DESTINATION_IDS[tenantSlug] ?? 1;

  const res = await fetch(url.toString(), {
    headers: {
      'X-Destination-ID': String(destinationId),
      'Accept-Language': opts?.locale ?? 'en',
    },
    next: { revalidate: opts?.revalidate ?? 300 },
  });

  if (!res.ok) {
    console.error(`HB API error: ${res.status} ${res.statusText} for ${url.pathname}`);
    return null as unknown as T;
  }

  return res.json();
}

export async function fetchTenantConfig(slug: string): Promise<TenantConfig | null> {
  const res = await hbFetch<ApiResponse<TenantConfig>>(
    `/api/v1/pages/destinations/${slug}`,
    slug,
    { revalidate: 3600 }
  );
  return res?.data ?? null;
}

export async function fetchPage(
  tenantSlug: string,
  pageSlug: string,
  locale?: string
): Promise<PageData | null> {
  const params: Record<string, string> = {};
  if (locale) params.locale = locale;

  const res = await hbFetch<ApiResponse<PageData>>(
    `/api/v1/pages/${tenantSlug}/${pageSlug}`,
    tenantSlug,
    { revalidate: 300, locale, params }
  );
  return res?.data ?? null;
}

export async function fetchPois(
  tenantSlug: string,
  opts?: { categories?: string; limit?: number; locale?: string; min_rating?: number; min_reviews?: number; sort?: string }
): Promise<POI[]> {
  const params: Record<string, string> = {};
  if (opts?.categories) params.categories = opts.categories;
  if (opts?.limit) params.limit = String(opts.limit);
  if (opts?.min_rating) params.min_rating = String(opts.min_rating);
  if (opts?.min_reviews) params.min_reviews = String(opts.min_reviews);
  if (opts?.sort) params.sort = opts.sort;

  const res = await hbFetch<ApiResponse<POI[]>>(
    '/api/v1/pois',
    tenantSlug,
    { revalidate: 300, locale: opts?.locale, params }
  );
  return res?.data ?? [];
}

export async function fetchEvents(
  tenantSlug: string,
  locale?: string,
  limit?: number,
  distance?: number
): Promise<AgendaEvent[]> {
  const params: Record<string, string> = {};
  if (limit) params.limit = String(limit);
  if (distance) params.distance = String(distance);

  const res = await hbFetch<ApiResponse<AgendaEvent[]>>(
    '/api/v1/agenda/events',
    tenantSlug,
    { revalidate: 300, locale, params }
  );
  return res?.data ?? [];
}

export async function fetchEvent(
  tenantSlug: string,
  eventId: number,
  locale?: string
): Promise<AgendaEvent | null> {
  const res = await hbFetch<ApiResponse<AgendaEvent>>(
    `/api/v1/agenda/events/${eventId}`,
    tenantSlug,
    { revalidate: 300, locale }
  );
  return res?.data ?? null;
}

export async function fetchCategories(tenantSlug: string): Promise<Category[]> {
  const res = await hbFetch<ApiResponse<Category[]>>(
    '/api/v1/categories',
    tenantSlug,
    { revalidate: 3600 }
  );
  return res?.data ?? [];
}

export async function fetchReviews(
  tenantSlug: string,
  poiId?: number
): Promise<Review[]> {
  const params: Record<string, string> = {};
  if (poiId) params.poi_id = String(poiId);

  const res = await hbFetch<ApiResponse<Review[]>>(
    '/api/v1/reviews',
    tenantSlug,
    { revalidate: 300, params }
  );
  return res?.data ?? [];
}

export async function fetchPoi(
  tenantSlug: string,
  poiId: number,
  locale?: string
): Promise<POI | null> {
  const res = await hbFetch<ApiResponse<POI>>(
    `/api/v1/pois/${poiId}`,
    tenantSlug,
    { revalidate: 300, locale }
  );
  return res?.data ?? null;
}

export async function fetchPoiReviews(
  tenantSlug: string,
  poiId: number
): Promise<Review[]> {
  const res = await hbFetch<ApiResponse<Review[]>>(
    `/api/v1/pois/${poiId}/reviews`,
    tenantSlug,
    { revalidate: 300 }
  );
  return res?.data ?? [];
}

export async function fetchTickets(
  tenantSlug: string,
  limit?: number
): Promise<Ticket[]> {
  const destId = DESTINATION_IDS[tenantSlug] ?? 1;
  const params: Record<string, string> = {};
  if (limit) params.limit = String(limit);

  const res = await hbFetch<ApiResponse<Ticket[]>>(
    `/api/v1/tickets/${destId}`,
    tenantSlug,
    { revalidate: 300, params }
  );
  return res?.data ?? [];
}

export async function fetchReservablePois(
  tenantSlug: string
): Promise<POI[]> {
  const res = await hbFetch<ApiResponse<POI[]>>(
    '/api/v1/pois',
    tenantSlug,
    { revalidate: 300, params: { reservable: 'true' } }
  );
  return res?.data ?? [];
}

export async function fetchAvailableSlots(
  tenantSlug: string,
  poiId: number,
  date: string,
  partySize?: number
): Promise<ReservationSlot[]> {
  const params: Record<string, string> = { date };
  if (partySize) params.partySize = String(partySize);

  const res = await hbFetch<ApiResponse<ReservationSlot[]>>(
    `/api/v1/reservations/slots/${poiId}`,
    tenantSlug,
    { revalidate: 60, params }
  );
  return res?.data ?? [];
}

// ─── Blog API ───────────────────────────────────────────────

export interface BlogSummary {
  id: number;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  body?: string;
  image: string | null;
  seoScore: number;
  publishedAt: string;
  createdAt: string;
  bodyTranslations?: Record<string, string>;
}

export async function fetchBlogs(
  tenantSlug: string,
  locale?: string,
  limit = 12
): Promise<BlogSummary[]> {
  const res = await hbFetch<ApiResponse<{ blogs: BlogSummary[] }>>(
    '/api/v1/blogs',
    tenantSlug,
    { revalidate: 300, locale, params: { limit: String(limit) } }
  );
  return res?.data?.blogs ?? [];
}

export async function fetchBlog(
  tenantSlug: string,
  slug: string,
  locale?: string
): Promise<BlogSummary | null> {
  const res = await hbFetch<ApiResponse<BlogSummary>>(
    `/api/v1/blogs/${slug}`,
    tenantSlug,
    { revalidate: 300, locale }
  );
  return res?.data ?? null;
}
