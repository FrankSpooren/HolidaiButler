import { NextRequest, NextResponse } from 'next/server';
import { fetchReservablePois } from '@/lib/api';

export async function GET(request: NextRequest) {
  const tenantSlug = request.headers.get('x-tenant-slug') ?? 'calpe';

  const pois = await fetchReservablePois(tenantSlug);
  return NextResponse.json({ data: pois });
}
