// app/api/closeplans/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "redis";

const getRedis = () => createClient({ url: process.env.REDIS_URL });

const REDIS_KEY = "pipeline:closeplans";

export async function GET() {
  const redis = getRedis();
  try {
    await redis.connect();
    const raw = await redis.get(REDIS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error fetching close plans:", err);
    return NextResponse.json({}, { status: 500 });
  } finally {
    await redis.disconnect();
  }
}

export async function POST(req: NextRequest) {
  const redis = getRedis();
  try {
    const { dealId, url } = await req.json();
    if (!dealId) {
      return NextResponse.json({ error: "dealId required" }, { status: 400 });
    }

    await redis.connect();
    const raw = await redis.get(REDIS_KEY);
    const data = raw ? JSON.parse(raw) : {};

    if (url) {
      data[dealId] = url;
    } else {
      // Empty URL = remove the close plan
      delete data[dealId];
    }

    await redis.set(REDIS_KEY, JSON.stringify(data));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error saving close plan:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  } finally {
    await redis.disconnect();
  }
}
