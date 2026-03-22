// app/api/recalculate/route.ts

import { NextResponse } from "next/server";
import { createClient } from "redis";

const REDIS_HUBSPOT_RATES_KEY = "pipeline:hubspot_rates";
const getRedis = () => createClient({ url: process.env.REDIS_URL });

const BASE  = "https://api.hubapi.com";
const TOKEN = process.env.HUBSPOT_TOKEN!;

const hs = async (path: string, body: object): Promise<any> => {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HubSpot ${res.status}: ${await res.text()}`);
  return res.json();
};

const searchAll = async (body: object): Promise<any[]> => {
  const results: any[] = [];
  let after: string | undefined;
  do {
    const payload: any = { ...body, limit: 100 };
    if (after) payload.after = after;
    const data = await hs("/crm/v3/objects/deals/search", payload);
    results.push(...(data.results ?? []));
    after = data.paging?.next?.after;
  } while (after);
  return results;
};

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setFullYear(now.getFullYear() - 1);
    const cutoff = twelveMonthsAgo.toISOString();

    // Pull all closed/lost deals from last 12 months (for conversion rates)
    const raw = await searchAll({
      filterGroups: [{
        filters: [
          { propertyName: "dealstage", operator: "IN", values: ["closedwon", "closedlost", "563428070", "582003949"] },
          { propertyName: "closedate", operator: "GTE", value: cutoff },
        ],
      }],
      properties: [
        "dealname",
        "dealstage",
        "deal_attribution",
        "amount",
        "hs_v2_date_entered_appointmentscheduled",
        "hs_v2_date_entered_qualifiedtobuy",
        "hs_v2_date_entered_contractsent",
        "hs_v2_date_entered_1446534336",
      ],
    });

    // Count deals at each stage transition
    let enteredDiscovery = 0;
    let enteredDemo      = 0;
    let enteredProposal  = 0;
    let enteredLegal     = 0;
    let closedWon        = 0;

    // For avg NB deal value — closed won, non-Expansion only
    const nbClosedWonAmounts: number[] = [];

    for (const d of raw) {
      const p = d.properties ?? {};
      const hasDisc  = !!p.hs_v2_date_entered_appointmentscheduled;
      const hasDemo  = !!p.hs_v2_date_entered_qualifiedtobuy;
      const hasProp  = !!p.hs_v2_date_entered_contractsent;
      const hasLegal = !!p["hs_v2_date_entered_1446534336"];
      const isWon    = p.dealstage === "closedwon";

      if (hasDisc)  enteredDiscovery++;
      if (hasDemo)  enteredDemo++;
      if (hasProp)  enteredProposal++;
      if (hasLegal) enteredLegal++;
      if (isWon)    closedWon++;

      // Avg NB deal value: closed won, not Expansion, has amount
      if (isWon && p.deal_attribution !== "Expansion" && p.amount) {
        const amt = parseFloat(p.amount);
        if (!isNaN(amt) && amt > 0) nbClosedWonAmounts.push(amt);
      }
    }

    // Conversion rates (as percentages, rounded to 1dp)
    const round = (n: number) => Math.round(n * 1000) / 10;
    const disc_to_demo   = enteredDiscovery > 0 ? round(enteredDemo     / enteredDiscovery) : null;
    const demo_to_prop   = enteredDemo      > 0 ? round(enteredProposal / enteredDemo)      : null;
    const prop_to_legal  = enteredProposal  > 0 ? round(enteredLegal    / enteredProposal)  : null;
    const legal_to_close = enteredLegal     > 0 ? round(closedWon       / enteredLegal)     : null;

    // Avg NB deal value
    const avg_deal_value = nbClosedWonAmounts.length > 0
      ? Math.round(nbClosedWonAmounts.reduce((s, v) => s + v, 0) / nbClosedWonAmounts.length)
      : null;

    // Persist HubSpot-derived rates to Redis for source labeling in UI
    const hubspotRates = {
      disc_to_demo, demo_to_prop, prop_to_legal, legal_to_close,
      avg_deal_value,
      as_of: now.toISOString(),
    };
    try {
      const redis = getRedis();
      await redis.connect();
      await redis.set(REDIS_HUBSPOT_RATES_KEY, JSON.stringify(hubspotRates));
      await redis.disconnect();
    } catch (redisErr) {
      console.error("Failed to persist hubspot rates:", redisErr);
      // Non-fatal — still return the response
    }

    return NextResponse.json({
      rates: { disc_to_demo, demo_to_prop, prop_to_legal, legal_to_close },
      avg_deal_value,
      sample: {
        enteredDiscovery,
        enteredDemo,
        enteredProposal,
        enteredLegal,
        closedWon,
        nbDealsForAvg: nbClosedWonAmounts.length,
        totalDeals: raw.length,
        periodMonths: 12,
      },
    });
  } catch (err) {
    console.error("Recalculate error:", err);
    return NextResponse.json({ error: "Failed to calculate rates" }, { status: 500 });
  }
}
