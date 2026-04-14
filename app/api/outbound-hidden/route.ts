// app/api/outbound-hidden/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "redis";

const REDIS_KEY = "outbound:hiddenIds";

const getClient = async () => {
  const client = createClient({ url: process.env.REDIS_URL });
  await client.connect();
  return client;
};

export async function GET() {
  let client;
  try {
    client = await getClient();
    const raw = await client.get(REDIS_KEY);
    const hiddenIds: string[] = raw ? JSON.parse(raw) : [];
    return NextResponse.json({ hiddenIds });
  } catch (err) {
    return NextResponse.json({ hiddenIds: [] }, { status: 200 });
  } finally {
    await client?.disconnect();
  }
}

export async function POST(req: NextRequest) {
  let client;
  try {
    const { hiddenIds } = await req.json();
    client = await getClient();
    await client.set(REDIS_KEY, JSON.stringify(hiddenIds));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  } finally {
    await client?.disconnect();
  }
}
