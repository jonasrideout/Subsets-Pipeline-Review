// app/api/assumptions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "redis";
import { DEFAULT_ASSUMPTIONS, REDIS_ASSUMPTIONS_KEY } from "@/lib/assumptions";
import type { Assumptions } from "@/types/deals";

const getRedis = () => createClient({ url: process.env.REDIS_URL });

export async function GET() {
  const redis = getRedis();
  try {
    await redis.connect();
    const raw = await redis.get(REDIS_ASSUMPTIONS_KEY);
    const data: Assumptions = raw ? JSON.parse(raw) : DEFAULT_ASSUMPTIONS;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error fetching assumptions:", err);
    // Fall back to defaults if Redis is unavailable
    return NextResponse.json(DEFAULT_ASSUMPTIONS);
  } finally {
    await redis.disconnect();
  }
}

export async function POST(req: NextRequest) {
  const redis = getRedis();
  try {
    const body = await req.json();

    // Merge with defaults to ensure all keys are present
    const assumptions: Assumptions = { ...DEFAULT_ASSUMPTIONS, ...body };

    await redis.connect();
    await redis.set(REDIS_ASSUMPTIONS_KEY, JSON.stringify(assumptions));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error saving assumptions:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  } finally {
    await redis.disconnect();
  }
}
