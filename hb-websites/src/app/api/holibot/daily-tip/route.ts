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

  try {
    const url = new URL(`${HB_API_URL}/api/v1/holibot/daily-tip`);

    // Forward query params (language, interests, excludeIds)
    const { searchParams } = request.nextUrl;
    searchParams.forEach((value, key) => url.searchParams.set(key, value));

    const res = await fetch(url.toString(), {
      headers: {
        'X-Destination-ID': destinationId,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to connect to daily-tip service' },
      { status: 502 }
    );
  }
}
