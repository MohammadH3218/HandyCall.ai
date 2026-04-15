import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth-config';

const NEST_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.handycall.org/api/v1';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  const bearerToken = (session as any)?.idToken || (session as any)?.accessToken;

  if (!session || !bearerToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const upstream = await fetch(`${NEST_API_URL}/portal-messaging/pro/stream`, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      Accept: 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
  });

  if (!upstream.ok || !upstream.body) {
    const raw = await upstream.text().catch(() => '');
    return NextResponse.json(
      { error: 'Failed to open realtime stream', raw: raw.slice(0, 1000) },
      { status: upstream.status || 502 },
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
