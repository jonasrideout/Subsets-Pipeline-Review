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

const PROPS = [
  "dealname",
  "dealstage",
  "deal_attribution",
  "amount",
  "hs_v2_date_entered_qualifiedtobuy",
  "hs_v2_date_entered_contractsent",
  "hs_v2_date_entered_1446534336",
];

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setFullYear(now.getFullYear() - 1);
    const cutoffMs = String(cutoff.getTime());

    // --- demo_to_prop ---
    // Deals that entered Demo in the last 12 months and have since exited Demo.
    // Exclude deals currently sitting in Demo — they haven't resolved yet.
    const demoExited = await searchAll({
      filterGroups: [{
        filters: [
          { propertyName: "hs_v2_date_entered_qualifiedtobuy", operator: "GTE", value: cutoffMs },
          { propertyName: "dealstage", operator: "NOT_IN", values: ["qualifiedtobuy"] },
        ],
      }],
      properties: PROPS,
    });

    // --- prop_to_legal ---
    // Deals that entered Proposal in the last 12 months and have since exited Proposal.
    const propExited = await searchAll({
      filterGroups: [{
        filters: [
          { propertyName: "hs_v2_date_entered_contractsent", operator: "GTE", value: cutoffMs },
          { propertyName: "dealstage", operator: "NOT_IN", values: ["contractsent"] },
        ],
      }],
      properties: PROPS,
    });

    // --- legal_to_close ---
    // Deals that entered Legal in the last 12 months and have since exited Legal.
    const legalExited = await searchAll({
      filterGroups: [{
        filters: [
          { propertyName: "hs_v2_date_entered_1446534336", operator: "GTE", value: cutoffMs },
          { propertyName: "dealstage", operator: "NOT_IN", values: ["1446534336"] },
        ],
      }],
      properties: PROPS,
    });

    // --- avg NB deal value ---
    // Closed Won, non-Expansion, with amount, in last 12 months.
    const closedWonDeals = await searchAll({
      filterGroups: [{
        filters: [
          { propertyName: "dealstage",  operator: "EQ",  value: "closedwon" },
          { propertyName: "closedate",  operator: "GTE", value: cutoffMs },
          { propertyName: "amount",     operator: "HAS_PROPERTY" },
        ],
      }],
      properties: ["dealname", "deal_attribution", "amount"],
    });

    // Helper: did a deal pass through Proposal?
    // True if has contractsent timestamp, OR legal timestamp, OR is closedwon.
    const passedProposal = (p: any) =>
      !!p.hs_v2_date_entered_contractsent ||
      !!p["hs_v2_date_entered_1446534336"] ||
      p.dealstage === "closedwon";

    // Helper: did a deal pass through Legal?
    // True if has legal timestamp, OR is closedwon.
    const passedLegal = (p: any) =>
      !!p["hs_v2_date_entered_1446534336"] ||
      p.dealstage === "closedwon";

    // demo_to_prop: of deals that exited Demo, how many passed through Proposal?
    const demoTotal    = demoExited.length;
    const demoConverted = demoExited.filter(d => passedProposal(d.properties ?? {})).length;

    // prop_to_legal: of deals that exited Proposal, how many passed through Legal?
    const propTotal    = propExited.length;
    const propConverted = propExited.filter(d => passedLegal(d.properties ?? {})).length;

    // legal_to_close: of deals that exited Legal, how many are Closed Won?
    const legalTotal    = legalExited.length;
    const legalConverted = legalExited.filter(d => (d.properties ?? {}).dealstage === "closedwon").length;

    const round = (n: number) => Math.round(n * 1000) / 10; // e.g. 0.6388 → 63.9

    const demo_to_prop   = demoTotal  > 0 ? round(demoConverted  / demoTotal)  : null;
    const prop_to_legal  = propTotal  > 0 ? round(propConverted  / propTotal)  : null;
    const legal_to_close = legalTotal > 0 ? round(legalConverted / legalTotal) : null;

    // disc_to_demo is always null — manually set, not derived from HubSpot data.
    const disc_to_demo: null = null;

    // Avg NB deal value
    const nbAmounts = closedWonDeals
      .filter(d => (d.properties ?? {}).deal_attribution !== "Expansion")
      .map(d => parseFloat((d.properties ?? {}).amount))
      .filter(n => !isNaN(n) && n > 0);

    const avg_deal_value = nbAmounts.length > 0
      ? Math.round(nbAmounts.reduce((s, v) => s + v, 0) / nbAmounts.length)
      : null;

    // Sample counts for modal display
    const sample = {
      enteredDemo:      demoTotal,
      enteredProposal:  propTotal,
      enteredLegal:     legalTotal,
      closedWon:        legalConverted, // resolved from legal — most meaningful closed count
      nbDealsForAvg:    nbAmounts.length,
      totalDeals:       demoTotal, // largest resolved cohort
      periodMonths:     12,
    };

    // Persist to Redis
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
    }

    return NextResponse.json({
      rates: { disc_to_demo, demo_to_prop, prop_to_legal, legal_to_close },
      avg_deal_value,
      sample,
    });
  } catch (err) {
    console.error("Recalculate error:", err);
    return NextResponse.json({ error: "Failed to calculate rates" }, { status: 500 });
  }
}
