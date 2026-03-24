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
  "hs_v2_date_entered_appointmentscheduled",
  "hs_v2_date_entered_qualifiedtobuy",
  "hs_v2_date_entered_contractsent",
  "hs_v2_date_entered_1446534336",
];

// A deal is an anomaly if any downstream timestamp predates the stage entry
// timestamp being measured — indicating a stage regression in HubSpot.
// Anomalies are excluded from both numerator and denominator.

const ts = (iso: string | null | undefined): number =>
  iso ? new Date(iso).getTime() : Infinity;

const isDiscAnomaly = (p: any): boolean => {
  const discTs = ts(p.hs_v2_date_entered_appointmentscheduled);
  return (
    ts(p.hs_v2_date_entered_qualifiedtobuy)  < discTs ||
    ts(p.hs_v2_date_entered_contractsent)    < discTs ||
    ts(p["hs_v2_date_entered_1446534336"])   < discTs
  );
};

const isDemoAnomaly = (p: any): boolean => {
  const demoTs = ts(p.hs_v2_date_entered_qualifiedtobuy);
  return (
    ts(p.hs_v2_date_entered_contractsent)   < demoTs ||
    ts(p["hs_v2_date_entered_1446534336"])  < demoTs
  );
};

const isPropAnomaly = (p: any): boolean => {
  const propTs = ts(p.hs_v2_date_entered_contractsent);
  return ts(p["hs_v2_date_entered_1446534336"]) < propTs;
};

// Did a deal pass through Demo?
// True if has qualifiedtobuy, contractsent, or legal timestamp, OR is closedwon.
const passedDemo = (p: any): boolean =>
  !!p.hs_v2_date_entered_qualifiedtobuy    ||
  !!p.hs_v2_date_entered_contractsent      ||
  !!p["hs_v2_date_entered_1446534336"]     ||
  p.dealstage === "closedwon";

// Did a deal pass through Proposal?
// True if has contractsent OR legal timestamp, OR is closedwon.
const passedProposal = (p: any): boolean =>
  !!p.hs_v2_date_entered_contractsent ||
  !!p["hs_v2_date_entered_1446534336"] ||
  p.dealstage === "closedwon";

// Did a deal pass through Legal?
// True if has legal timestamp OR is closedwon.
const passedLegal = (p: any): boolean =>
  !!p["hs_v2_date_entered_1446534336"] ||
  p.dealstage === "closedwon";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setFullYear(now.getFullYear() - 1);
    const cutoffMs = String(cutoff.getTime());

    // Run all four cohort queries + closed won in parallel
    const [discExited, demoExited, propExited, legalExited, closedWonDeals] = await Promise.all([
      // disc_to_demo: entered Discovery in last 12 months, no longer in Discovery
      searchAll({
        filterGroups: [{ filters: [
          { propertyName: "hs_v2_date_entered_appointmentscheduled", operator: "GTE", value: cutoffMs },
          { propertyName: "dealstage", operator: "NOT_IN", values: ["appointmentscheduled"] },
        ]}],
        properties: PROPS,
      }),
      // demo_to_prop: entered Demo in last 12 months, no longer in Demo
      searchAll({
        filterGroups: [{ filters: [
          { propertyName: "hs_v2_date_entered_qualifiedtobuy", operator: "GTE", value: cutoffMs },
          { propertyName: "dealstage", operator: "NOT_IN", values: ["qualifiedtobuy"] },
        ]}],
        properties: PROPS,
      }),
      // prop_to_legal: entered Proposal in last 12 months, no longer in Proposal
      searchAll({
        filterGroups: [{ filters: [
          { propertyName: "hs_v2_date_entered_contractsent", operator: "GTE", value: cutoffMs },
          { propertyName: "dealstage", operator: "NOT_IN", values: ["contractsent"] },
        ]}],
        properties: PROPS,
      }),
      // legal_to_close: entered Legal in last 12 months, no longer in Legal
      searchAll({
        filterGroups: [{ filters: [
          { propertyName: "hs_v2_date_entered_1446534336", operator: "GTE", value: cutoffMs },
          { propertyName: "dealstage", operator: "NOT_IN", values: ["1446534336"] },
        ]}],
        properties: PROPS,
      }),
      // avg NB deal value: closed won, has amount, last 12 months
      searchAll({
        filterGroups: [{ filters: [
          { propertyName: "dealstage", operator: "EQ",  value: "closedwon" },
          { propertyName: "closedate", operator: "GTE", value: cutoffMs },
          { propertyName: "amount",    operator: "HAS_PROPERTY" },
        ]}],
        properties: ["dealname", "deal_attribution", "amount"],
      }),
    ]);

    // --- disc_to_demo ---
    const discClean     = discExited.filter(d => !isDiscAnomaly(d.properties ?? {}));
    const discConverted = discClean.filter(d => passedDemo(d.properties ?? {}));
    const discAnomalies = discExited.filter(d => isDiscAnomaly(d.properties ?? {}));

    // --- demo_to_prop ---
    const demoClean     = demoExited.filter(d => !isDemoAnomaly(d.properties ?? {}));
    const demoConverted = demoClean.filter(d => passedProposal(d.properties ?? {}));
    const demoAnomalies = demoExited.filter(d => isDemoAnomaly(d.properties ?? {}));

    // --- prop_to_legal ---
    const propClean     = propExited.filter(d => !isPropAnomaly(d.properties ?? {}));
    const propConverted = propClean.filter(d => passedLegal(d.properties ?? {}));
    const propAnomalies = propExited.filter(d => isPropAnomaly(d.properties ?? {}));

    // --- legal_to_close (no anomaly check needed — no downstream timestamps to compare) ---
    const legalConverted = legalExited.filter(d => (d.properties ?? {}).dealstage === "closedwon");

    const round = (n: number) => Math.round(n * 1000) / 10; // 0.4375 → 43.8

    const disc_to_demo   = discClean.length  > 0 ? round(discConverted.length  / discClean.length)  : null;
    const demo_to_prop   = demoClean.length  > 0 ? round(demoConverted.length  / demoClean.length)  : null;
    const prop_to_legal  = propClean.length  > 0 ? round(propConverted.length  / propClean.length)  : null;
    const legal_to_close = legalExited.length > 0 ? round(legalConverted.length / legalExited.length) : null;

    // --- avg NB deal value ---
    const nbAmounts = closedWonDeals
      .filter(d => (d.properties ?? {}).deal_attribution !== "Expansion")
      .map(d => parseFloat((d.properties ?? {}).amount))
      .filter(n => !isNaN(n) && n > 0);

    const avg_deal_value = nbAmounts.length > 0
      ? Math.round(nbAmounts.reduce((s, v) => s + v, 0) / nbAmounts.length)
      : null;

    // --- Build per-deal cohort data for validation dashboard ---
    const buildDiscNote = (p: any): string => {
      const discTs = ts(p.hs_v2_date_entered_appointmentscheduled);
      const flags = [];
      if (ts(p.hs_v2_date_entered_qualifiedtobuy) < discTs) flags.push("Demo");
      if (ts(p.hs_v2_date_entered_contractsent)   < discTs) flags.push("Proposal");
      if (ts(p["hs_v2_date_entered_1446534336"])  < discTs) flags.push("Legal");
      return `${flags.join(" and ")} timestamp${flags.length > 1 ? "s" : ""} predate Discovery entry`;
    };

    const discCohort = [
      ...discClean.map(d => ({
        id:          String(d.id),
        name:        d.properties?.dealname ?? "Unknown",
        stage:       d.properties?.dealstage ?? "",
        disc:        d.properties?.hs_v2_date_entered_appointmentscheduled ?? null,
        demo:        d.properties?.hs_v2_date_entered_qualifiedtobuy       ?? null,
        prop:        d.properties?.hs_v2_date_entered_contractsent          ?? null,
        legal:       d.properties?.["hs_v2_date_entered_1446534336"]       ?? null,
        anomaly:     false,
        converted:   passedDemo(d.properties ?? {}),
        anomalyNote: null,
      })),
      ...discAnomalies.map(d => ({
        id:          String(d.id),
        name:        d.properties?.dealname ?? "Unknown",
        stage:       d.properties?.dealstage ?? "",
        disc:        d.properties?.hs_v2_date_entered_appointmentscheduled ?? null,
        demo:        d.properties?.hs_v2_date_entered_qualifiedtobuy       ?? null,
        prop:        d.properties?.hs_v2_date_entered_contractsent          ?? null,
        legal:       d.properties?.["hs_v2_date_entered_1446534336"]       ?? null,
        anomaly:     true,
        converted:   false,
        anomalyNote: buildDiscNote(d.properties ?? {}),
      })),
    ];

    const mapDeal = (d: any, anomaly: boolean, converted: boolean, anomalyNote?: string) => ({
      id:          String(d.id),
      name:        d.properties?.dealname ?? "Unknown",
      stage:       d.properties?.dealstage ?? "",
      demo:        d.properties?.hs_v2_date_entered_qualifiedtobuy  ?? null,
      prop:        d.properties?.hs_v2_date_entered_contractsent     ?? null,
      legal:       d.properties?.["hs_v2_date_entered_1446534336"]  ?? null,
      anomaly,
      converted,
      anomalyNote: anomalyNote ?? null,
    });

    const buildDemoNote = (p: any): string => {
      const demoTs = ts(p.hs_v2_date_entered_qualifiedtobuy);
      if (ts(p.hs_v2_date_entered_contractsent) < demoTs &&
          ts(p["hs_v2_date_entered_1446534336"]) < demoTs)
        return "Both Proposal and Legal timestamps predate Demo entry";
      if (ts(p.hs_v2_date_entered_contractsent) < demoTs)
        return "Proposal timestamp predates Demo entry";
      return "Legal timestamp predates Demo entry";
    };

    const buildPropNote = (_p: any): string =>
      "Legal timestamp predates Proposal entry";

    const demoCohort = [
      ...demoClean.map(d => mapDeal(d, false, passedProposal(d.properties ?? {}))),
      ...demoAnomalies.map(d => mapDeal(d, true, false, buildDemoNote(d.properties ?? {}))),
    ];

    const propCohort = [
      ...propClean.map(d => mapDeal(d, false, passedLegal(d.properties ?? {}))),
      ...propAnomalies.map(d => mapDeal(d, true, false, buildPropNote(d.properties ?? {}))),
    ];

    const legalCohort = legalExited.map(d => ({
      id:    String(d.id),
      name:  d.properties?.dealname ?? "Unknown",
      stage: d.properties?.dealstage ?? "",
      legal: d.properties?.["hs_v2_date_entered_1446534336"] ?? null,
      won:   (d.properties ?? {}).dealstage === "closedwon",
    }));

    // Persist rates to Redis
    try {
      const redis = getRedis();
      await redis.connect();
      await redis.set(REDIS_HUBSPOT_RATES_KEY, JSON.stringify({
        disc_to_demo, demo_to_prop, prop_to_legal, legal_to_close,
        avg_deal_value,
        as_of: now.toISOString(),
      }));
      await redis.disconnect();
    } catch (redisErr) {
      console.error("Failed to persist hubspot rates:", redisErr);
    }

    return NextResponse.json({
      rates: { disc_to_demo, demo_to_prop, prop_to_legal, legal_to_close },
      avg_deal_value,
      sample: {
        enteredDisc:      discClean.length,
        enteredDemo:      demoClean.length,
        enteredProposal:  propClean.length,
        enteredLegal:     legalExited.length,
        closedWon:        legalConverted.length,
        nbDealsForAvg:    nbAmounts.length,
        totalDeals:       demoClean.length,
        periodMonths:     12,
        anomaliesExcluded: {
          disc: discAnomalies.length,
          demo: demoAnomalies.length,
          prop: propAnomalies.length,
        },
      },
      validation: {
        discCohort,
        demoCohort,
        propCohort,
        legalCohort,
      },
    });

  } catch (err) {
    console.error("Recalculate error:", err);
    return NextResponse.json({ error: "Failed to calculate rates" }, { status: 500 });
  }
}
