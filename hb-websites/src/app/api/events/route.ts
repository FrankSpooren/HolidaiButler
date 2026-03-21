import { NextRequest, NextResponse } from 'next/server';

const HB_API_URL = process.env.HB_API_URL ?? 'http://localhost:3001';

const DESTINATION_IDS: Record<string, number> = {
  calpe: 1,
  texel: 2,
  alicante: 3,
  warrewijzer: 4,
};

export async function GET(request: NextRequest) {
  const tenantSlug = request.headers.get('x-tenant-slug') ?? 'calpe';
  const destinationId = String(DESTINATION_IDS[tenantSlug] ?? 1);
  const { searchParams } = new URL(request.url);

  try {
    const url = new URL('/api/v1/agenda/events', HB_API_URL);
    searchParams.forEach((value, key) => url.searchParams.set(key, value));

    const res = await fetch(url.toString(), {
      headers: {
        'X-Destination-ID': destinationId,
        'Accept-Language': request.headers.get('x-tenant-locale') ?? 'en',
      },
      next: { revalidate: 300 },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events' },
      { status: 502 }
    );
  }
}
