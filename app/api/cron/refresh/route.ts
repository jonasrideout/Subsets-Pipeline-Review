// app/api/cron/refresh/route.ts

import { NextRequest, NextResponse } from "next/server";
import { fetchActiveDeals, fetchClosedWonQTD, fetchClosedWonYTD, fetchAllEmailSignals } from "@/lib/hubspot";
import { writeSnapshot } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const [active, closedWon, closedWonYTD] = await Promise.all([
      fetchActiveDeals(),
      fetchClosedWonQTD(),
      fetchClosedWonYTD(),
    ]);

    const emailSignals = await fetchAllEmailSignals(active, now);

    await writeSnapshot({ active, closedWon, closedWonYTD, emailSignals, asOf: now.toISOString() });

    return NextResponse.json({ ok: true, asOf: now.toISOString(), deals: active.length });
  } catch (err) {
    console.error("Cron refresh failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
