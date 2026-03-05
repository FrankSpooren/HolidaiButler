import { NextRequest, NextResponse } from 'next/server';
import { fetchAvailableSlots } from '@/lib/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ poiId: string }> }
) {
  const tenantSlug = request.headers.get('x-tenant-slug') ?? 'calpe';
  const { poiId } = await params;
  const date = request.nextUrl.searchParams.get('date') ?? '';
  const partySize = request.nextUrl.searchParams.get('partySize');

  const slots = await fetchAvailableSlots(
    tenantSlug,
    Number(poiId),
    date,
    partySize ? Number(partySize) : undefined
  );
  return NextResponse.json({ data: slots });
}
