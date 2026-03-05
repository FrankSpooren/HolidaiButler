import type { TenantConfig } from '@/types/tenant';
import { fetchTenantConfig } from './api';

const tenantCache = new Map<string, { config: TenantConfig; fetchedAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getTenantConfig(slug: string): Promise<TenantConfig | null> {
  const cached = tenantCache.get(slug);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.config;
  }

  const config = await fetchTenantConfig(slug);
  if (config) {
    tenantCache.set(slug, { config, fetchedAt: Date.now() });
  }
  return config;
}

export function getDestinationId(slug: string): number {
  const ids: Record<string, number> = {
    calpe: 1,
    texel: 2,
    alicante: 3,
    warrewijzer: 4,
  };
  return ids[slug] ?? 1;
}
