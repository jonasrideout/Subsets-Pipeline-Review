// lib/cache.ts

import { createClient } from "redis";

const CACHE_KEY = "pipeline:snapshot";

let client: ReturnType<typeof createClient> | null = null;

async function getClient() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (err) => console.error("Redis error:", err));
    await client.connect();
  }
  return client;
}

export interface PipelineSnapshot {
  active:       any[];
  closedWon:    any[];
  closedWonYTD: any[];
  emailSignals: Record<string, any>;
  asOf:         string;
}

export async function readSnapshot(): Promise<PipelineSnapshot | null> {
  try {
    const c   = await getClient();
    const raw = await c.get(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PipelineSnapshot;
  } catch (err) {
    console.error("Cache read failed:", err);
    return null;
  }
}

export async function writeSnapshot(data: PipelineSnapshot): Promise<void> {
  try {
    const c = await getClient();
    await c.set(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Cache write failed:", err);
  }
}
