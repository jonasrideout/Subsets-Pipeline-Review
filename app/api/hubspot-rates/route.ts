// app/api/hubspot-rates/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "redis";

const REDIS_HUBSPOT_RATES_KEY = "pipeline:hubspot_rates";

export interface HubSpotRates {
  disc_to_demo:   number | null;
  demo_to_prop:   number | null;
  prop_to_legal:  number | null;
  legal_to_close: number | null;
  avg_deal_value: number | null;
  as_of:          string;  // ISO timestamp of last recalculate run
}

const getRedis = () => createClient({ url: process.env.REDIS_URL });

export async function GET() {
  const redis = getRedis();
  try {
    await redis.connect();
    const raw = await redis.get(REDIS_HUBSPOT_RATES_KEY);
    if (raw) return NextResponse.json(JSON.parse(raw));
    return NextResponse.json(null);
  } catch (err) {
    console.error("Error fetching hubspot rates:", err);
    return NextResponse.json(null);
  } finally {
    await redis.disconnect();
  }
}

export async function POST(req: NextRequest) {
  const redis = getRedis();
  try {
    const body = await req.json();
    await redis.connect();
    await redis.set(REDIS_HUBSPOT_RATES_KEY, JSON.stringify(body));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error saving hubspot rates:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  } finally {
    await redis.disconnect();
  }
}
