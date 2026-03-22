// app/api/deals/route.ts

import { NextResponse } from "next/server";
import { fetchActiveDeals, fetchClosedWonQTD, fetchClosedWonYTD, fetchAllEmailSignals } from "@/lib/hubspot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();

    // Fetch active deals and both closed won datasets in parallel
    const [active, closedWonQTD, closedWonYTD] = await Promise.all([
      fetchActiveDeals(),
      fetchClosedWonQTD(),
      fetchClosedWonYTD(),
    ]);

    // Fetch email signals for Legal + Proposal + Demo deals
    const emailSignals = await fetchAllEmailSignals(active, now);

    return NextResponse.json({
      active,
      closedWon:    closedWonQTD,   // quarterly — used by default Q view
      closedWonYTD,                  // full year — used by YTD toggle
      emailSignals,
      asOf: now.toISOString(),
    });
  } catch (err) {
    console.error("Error fetching deals:", err);
    return NextResponse.json(
      { error: "Failed to fetch pipeline data" },
      { status: 500 }
    );
  }
}
