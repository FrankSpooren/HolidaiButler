import { NextRequest, NextResponse } from 'next/server';

const HB_API_URL = process.env.HB_API_URL ?? 'http://localhost:3001';

const DESTINATION_IDS: Record<string, number> = {
  calpe: 1, texel: 2, alicante: 3, warrewijzer: 4,
};

export async function POST(request: NextRequest) {
  const tenantSlug = request.headers.get('x-tenant-slug') ?? 'calpe';
  const destId = DESTINATION_IDS[tenantSlug] ?? 1;

  try {
    const body = await request.json();

    const res = await fetch(`${HB_API_URL}/api/v1/holibot/itinerary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Destination-ID': String(destId),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to connect to itinerary service' },
      { status: 502 }
    );
  }
}
