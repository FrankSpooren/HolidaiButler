import { NextRequest, NextResponse } from 'next/server';

const HB_API_URL = process.env.HB_API_URL ?? 'http://localhost:3001';

export async function GET(request: NextRequest) {
  const tenantSlug = request.headers.get('x-tenant-slug') ?? 'calpe';
  const { searchParams } = new URL(request.url);

  try {
    const url = new URL('/api/v1/pois', HB_API_URL);
    searchParams.forEach((value, key) => url.searchParams.set(key, value));

    const res = await fetch(url.toString(), {
      headers: {
        'X-Destination-ID': tenantSlug,
        'Accept-Language': request.headers.get('x-tenant-locale') ?? 'en',
      },
      next: { revalidate: 300 },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch POIs' },
      { status: 502 }
    );
  }
}
