// app/api/deals/route.ts

import { NextResponse } from "next/server";
import { fetchActiveDeals, fetchClosedWonYTD, fetchAllEmailSignals } from "@/lib/hubspot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();

    // Fetch active deals and closed won in parallel
    const [active, closedWon] = await Promise.all([
      fetchActiveDeals(),
      fetchClosedWonYTD(),
    ]);

    // Fetch email signals for Legal + Proposal + Demo deals
    const emailSignals = await fetchAllEmailSignals(active, now);

    return NextResponse.json({
      active,
      closedWon,
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
