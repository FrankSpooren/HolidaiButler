import { NextRequest } from 'next/server';

const HB_API_URL = process.env.HB_API_URL ?? 'http://localhost:3001';

export async function POST(request: NextRequest) {
  const tenantSlug = request.headers.get('x-tenant-slug') ?? 'calpe';

  try {
    const body = await request.json();

    const res = await fetch(`${HB_API_URL}/api/v1/holibot/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Destination-ID': request.headers.get('x-destination-id') ?? tenantSlug,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      return new Response(
        JSON.stringify({ success: false, error: `API error: ${res.status}` }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stream the SSE response back to the browser
    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to connect to chatbot service' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
