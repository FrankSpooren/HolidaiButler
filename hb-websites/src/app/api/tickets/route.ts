import { NextRequest, NextResponse } from 'next/server';
import { fetchTickets } from '@/lib/api';

export async function GET(request: NextRequest) {
  const tenantSlug = request.headers.get('x-tenant-slug') ?? 'calpe';
  const limit = request.nextUrl.searchParams.get('limit');

  const tickets = await fetchTickets(tenantSlug, limit ? Number(limit) : undefined);
  return NextResponse.json({ data: tickets });
}
