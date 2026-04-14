// app/api/outbound-hidden/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "redis";

const KEY_HIDDEN = "outbound:hiddenIds";
const KEY_RSVPS  = "outbound:rsvps";

const getClient = async () => {
  const client = createClient({ url: process.env.REDIS_URL });
  await client.connect();
  return client;
};

export async function GET() {
  let client;
  try {
    client = await getClient();
    const [rawHidden, rawRsvps] = await Promise.all([
      client.get(KEY_HIDDEN),
      client.get(KEY_RSVPS),
    ]);
    return NextResponse.json({
      hiddenIds: rawHidden ? JSON.parse(rawHidden) : [],
      rsvps:     rawRsvps  ? JSON.parse(rawRsvps)  : [],
    });
  } catch (err) {
    return NextResponse.json({ hiddenIds: [], rsvps: [] }, { status: 200 });
  } finally {
    await client?.disconnect();
  }
}

export async function POST(req: NextRequest) {
  let client;
  try {
    const { hiddenIds, rsvps } = await req.json();
    client = await getClient();
    await Promise.all([
      client.set(KEY_HIDDEN, JSON.stringify(hiddenIds ?? [])),
      client.set(KEY_RSVPS,  JSON.stringify(rsvps     ?? [])),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  } finally {
    await client?.disconnect();
  }
}
