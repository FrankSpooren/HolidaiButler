import { NextRequest, NextResponse } from 'next/server';

const HB_API_URL = process.env.HB_API_URL ?? 'http://localhost:3001';

const DESTINATION_IDS: Record<string, number> = {
  calpe: 1, texel: 2, alicante: 3, warrewijzer: 4,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantSlug = request.headers.get('x-tenant-slug') ?? 'calpe';
  const destId = DESTINATION_IDS[tenantSlug] ?? 1;
  const locale = request.headers.get('x-tenant-locale') ?? 'en';

  try {
    const eventRes = await fetch(`${HB_API_URL}/api/v1/agenda/events/${id}`, {
      headers: { 'X-Destination-ID': String(destId), 'Accept-Language': locale },
    });

    const eventData = await eventRes.json();

    return NextResponse.json({
      event: eventData?.data ?? null,
    });
  } catch {
    return NextResponse.json(
      { event: null, error: 'Failed to fetch event' },
      { status: 502 }
    );
  }
}
