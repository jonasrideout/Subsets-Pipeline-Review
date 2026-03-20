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
    if (raw) {
      // Merge with defaults so any new fields (e.g. prop_to_legal) fall back
      // to their default values if not present in the saved data
      const saved = JSON.parse(raw);
      const merged: Assumptions = {
        ...DEFAULT_ASSUMPTIONS,
        ...saved,
        ch: { ...DEFAULT_ASSUMPTIONS.ch, ...(saved.ch ?? {}) },
        annual_closes: { ...DEFAULT_ASSUMPTIONS.annual_closes, ...(saved.annual_closes ?? {}) },
      };
      return NextResponse.json(merged);
    }
    return NextResponse.json(DEFAULT_ASSUMPTIONS);
  } catch (err) {
    console.error("Error fetching assumptions:", err);
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
    const assumptions: Assumptions = {
      ...DEFAULT_ASSUMPTIONS,
      ...body,
      ch: { ...DEFAULT_ASSUMPTIONS.ch, ...(body.ch ?? {}) },
      annual_closes: { ...DEFAULT_ASSUMPTIONS.annual_closes, ...(body.annual_closes ?? {}) },
    };
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
