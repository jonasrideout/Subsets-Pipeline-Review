// app/api/commits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "redis";

const getRedis = () => createClient({ url: process.env.REDIS_URL });
const REDIS_KEY = "pipeline:commits";

export async function GET() {
  const redis = getRedis();
  try {
    await redis.connect();
    const raw = await redis.get(REDIS_KEY);
    const data: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error fetching commits:", err);
    return NextResponse.json({}, { status: 500 });
  } finally {
    await redis.disconnect();
  }
}

export async function POST(req: NextRequest) {
  const redis = getRedis();
  try {
    const { dealId } = await req.json();
    if (!dealId) {
      return NextResponse.json({ error: "dealId required" }, { status: 400 });
    }
    await redis.connect();
    const raw = await redis.get(REDIS_KEY);
    const data: Record<string, boolean> = raw ? JSON.parse(raw) : {};

    // Toggle: if committed, uncommit; if not, commit
    if (data[dealId]) {
      delete data[dealId];
    } else {
      data[dealId] = true;
    }

    await redis.set(REDIS_KEY, JSON.stringify(data));
    return NextResponse.json({ ok: true, committed: !!data[dealId] });
  } catch (err) {
    console.error("Error toggling commit:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  } finally {
    await redis.disconnect();
  }
}
