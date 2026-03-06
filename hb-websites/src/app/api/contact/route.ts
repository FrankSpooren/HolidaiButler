import { NextRequest, NextResponse } from 'next/server';

const HB_API_URL = process.env.HB_API_URL ?? 'http://localhost:3001';

export async function POST(request: NextRequest) {
  const tenantSlug = request.headers.get('x-tenant-slug') ?? 'calpe';
  const body = await request.json();

  const res = await fetch(`${HB_API_URL}/api/v1/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Destination-ID': tenantSlug,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
