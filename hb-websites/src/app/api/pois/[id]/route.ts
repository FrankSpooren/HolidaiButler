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
  const locale = request.headers.get('accept-language') ?? 'en';

  try {
    const [poiRes, reviewsRes] = await Promise.all([
      fetch(`${HB_API_URL}/api/v1/pois/${id}`, {
        headers: { 'X-Destination-ID': String(destId), 'Accept-Language': locale },
      }),
      fetch(`${HB_API_URL}/api/v1/pois/${id}/reviews`, {
        headers: { 'X-Destination-ID': String(destId) },
      }),
    ]);

    const poiData = await poiRes.json();
    const reviewsData = await reviewsRes.json();

    return NextResponse.json({
      poi: poiData?.data ?? null,
      reviews: reviewsData?.data ?? [],
    });
  } catch {
    return NextResponse.json(
      { poi: null, reviews: [], error: 'Failed to fetch POI' },
      { status: 502 }
    );
  }
}
