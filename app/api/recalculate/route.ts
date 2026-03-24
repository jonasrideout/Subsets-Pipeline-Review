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

const passedDemo = (p: any): boolean =>
  !!p.hs_v2_date_entered_qualifiedtobuy    ||
  !!p.hs_v2_date_entered_contractsent      ||
  !!p["hs_v2_date_entered_1446534336"]     ||
  p.dealstage === "closedwon";

const passedProposal = (p: any): boolean =>
  !!p.hs_v2_date_entered_contractsent ||
  !!p["hs_v2_date_entered_1446534336"] ||
  p.dealstage === "closedwon";

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

    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Batch 1: exited cohorts + closed won (5 queries)
    const [discExited, demoExited, propExited, legalExited, closedWonDeals] = await Promise.all([
      searchAll({
        filterGroups: [{ filters: [
          { propertyName: "hs_v2_date_entered_appointmentscheduled", operator: "GTE", value: cutoffMs },
          { propertyName: "dealstage", operator: "NOT_IN", values: ["appointmentscheduled"] },
        ]}],
        properties: PROPS,
      }),
      searchAll({
        filterGroups: [{ filters: [
          { propertyName: "hs_v2_date_entered_qualifiedtobuy", operator: "GTE", value: cutoffMs },
          { propertyName: "dealstage", operator: "NOT_IN", values: ["qualifiedtobuy"] },
        ]}],
        properties: PROPS,
      }),
      searchAll({
        filterGroups: [{ filters: [
          { propertyName: "hs_v2_date_entered_contractsent", operator: "GTE", value: cutoffMs },
          { propertyName: "dealstage", operator: "NOT_IN", values: ["contractsent"] },
        ]}],
        properties: PROPS,
      }),
      searchAll({
        filterGroups: [{ filters: [
          { propertyName: "hs_v2_date_entered_1446534336", operator: "GTE", value: cutoffMs },
          { propertyName: "dealstage", operator: "NOT_IN", values: ["1446534336"] },
        ]}],
        properties: PROPS,
      }),
      searchAll({
        filterGroups: [{ filters: [
          { propertyName: "dealstage", operator: "EQ",  value: "closedwon" },
          { propertyName: "closedate", operator: "GTE", value: cutoffMs },
          { propertyName: "amount",    operator: "HAS_PROPERTY" },
        ]}],
        properties: ["dealname", "deal_attribution", "amount"],
      }),
    ]);

    await sleep(1100);

    // Batch 2: all active deals per stage — stalled filtering done in JS
    // (hs_v2_date_entered_* properties don't support multiple filters reliably)
    const [discActive, demoActive, propActive, legalActive] = await Promise.all([
      searchAll({
        filterGroups: [{ filters: [
          { propertyName: "dealstage", operator: "EQ", value: "appointmentscheduled" },
        ]}],
        properties: PROPS,
      }),
      searchAll({
        filterGroups: [{ filters: [
          { propertyName: "dealstage", operator: "EQ", value: "qualifiedtobuy" },
        ]}],
        properties: PROPS,
      }),
      searchAll({
        filterGroups: [{ filters: [
          { propertyName: "dealstage", operator: "EQ", value: "contractsent" },
        ]}],
        properties: PROPS,
      }),
      searchAll({
        filterGroups: [{ filters: [
          { propertyName: "dealstage", operator: "EQ", value: "1446534336" },
        ]}],
        properties: PROPS,
      }),
    ]);

    // Stalled = entered stage within 12-month window AND has been there 60+ days
    const isStalled = (enteredIso: string | null | undefined): boolean => {
      if (!enteredIso) return false;
      const entered = new Date(enteredIso).getTime();
      return entered >= cutoff.getTime() && entered <= sixtyDaysAgo.getTime();
    };

    const discStalled  = discActive.filter(d => isStalled(d.properties?.hs_v2_date_entered_appointmentscheduled));
    const demoStalled  = demoActive.filter(d => isStalled(d.properties?.hs_v2_date_entered_qualifiedtobuy));
    const propStalled  = propActive.filter(d => isStalled(d.properties?.hs_v2_date_entered_contractsent));
    const legalStalled = legalActive.filter(d => isStalled(d.properties?.["hs_v2_date_entered_1446534336"]));

    // ── disc_to_demo ──────────────────────────────────────────────────────────
    const discClean     = discExited.filter(d => !isDiscAnomaly(d.properties ?? {}));
    const discConverted = discClean.filter(d => passedDemo(d.properties ?? {}));
    const discAnomalies = discExited.filter(d => isDiscAnomaly(d.properties ?? {}));
    const discTotal     = discClean.length + discStalled.length;

    // ── demo_to_prop ──────────────────────────────────────────────────────────
    const demoClean     = demoExited.filter(d => !isDemoAnomaly(d.properties ?? {}));
    const demoConverted = demoClean.filter(d => passedProposal(d.properties ?? {}));
    const demoAnomalies = demoExited.filter(d => isDemoAnomaly(d.properties ?? {}));
    const demoTotal     = demoClean.length + demoStalled.length;

    // ── prop_to_legal ─────────────────────────────────────────────────────────
    const propClean     = propExited.filter(d => !isPropAnomaly(d.properties ?? {}));
    const propConverted = propClean.filter(d => passedLegal(d.properties ?? {}));
    const propAnomalies = propExited.filter(d => isPropAnomaly(d.properties ?? {}));
    const propTotal     = propClean.length + propStalled.length;

    // ── legal_to_close ────────────────────────────────────────────────────────
    const legalConverted = legalExited.filter(d => (d.properties ?? {}).dealstage === "closedwon");
    const legalTotal     = legalExited.length + legalStalled.length;

    const round = (n: number) => Math.round(n * 1000) / 10;

    const disc_to_demo   = discTotal  > 0 ? round(discConverted.length  / discTotal)  : null;
    const demo_to_prop   = demoTotal  > 0 ? round(demoConverted.length  / demoTotal)  : null;
    const prop_to_legal  = propTotal  > 0 ? round(propConverted.length  / propTotal)  : null;
    const legal_to_close = legalTotal > 0 ? round(legalConverted.length / legalTotal) : null;

    // ── Avg NB deal value ─────────────────────────────────────────────────────
    const nbAmounts = closedWonDeals
      .filter(d => (d.properties ?? {}).deal_attribution !== "Expansion")
      .map(d => parseFloat((d.properties ?? {}).amount))
      .filter(n => !isNaN(n) && n > 0);

    const avg_deal_value = nbAmounts.length > 0
      ? Math.round(nbAmounts.reduce((s, v) => s + v, 0) / nbAmounts.length)
      : null;

    // ── Build per-deal cohort data ────────────────────────────────────────────

    const buildDiscNote = (p: any): string => {
      const discTs = ts(p.hs_v2_date_entered_appointmentscheduled);
      const flags = [];
      if (ts(p.hs_v2_date_entered_qualifiedtobuy) < discTs) flags.push("Demo");
      if (ts(p.hs_v2_date_entered_contractsent)   < discTs) flags.push("Proposal");
      if (ts(p["hs_v2_date_entered_1446534336"])  < discTs) flags.push("Legal");
      return `${flags.join(" and ")} timestamp${flags.length > 1 ? "s" : ""} predate Discovery entry`;
    };

    const stalledNote = (days: number) => `Stalled ${days} days in stage`;

    const daysSince = (iso: string | null | undefined): number =>
      iso ? Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000) : 0;

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
        stalled:     false,
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
        stalled:     false,
      })),
      ...discStalled.map(d => ({
        id:          String(d.id),
        name:        d.properties?.dealname ?? "Unknown",
        stage:       d.properties?.dealstage ?? "",
        disc:        d.properties?.hs_v2_date_entered_appointmentscheduled ?? null,
        demo:        null,
        prop:        null,
        legal:       null,
        anomaly:     false,
        converted:   false,
        anomalyNote: stalledNote(daysSince(d.properties?.hs_v2_date_entered_appointmentscheduled)),
        stalled:     true,
      })),
    ];

    const mapDeal = (d: any, anomaly: boolean, converted: boolean, anomalyNote?: string, stalled = false) => ({
      id:          String(d.id),
      name:        d.properties?.dealname ?? "Unknown",
      stage:       d.properties?.dealstage ?? "",
      demo:        d.properties?.hs_v2_date_entered_qualifiedtobuy  ?? null,
      prop:        d.properties?.hs_v2_date_entered_contractsent     ?? null,
      legal:       d.properties?.["hs_v2_date_entered_1446534336"]  ?? null,
      anomaly,
      converted,
      anomalyNote: anomalyNote ?? null,
      stalled,
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

    const buildPropNote = (_p: any): string => "Legal timestamp predates Proposal entry";

    const demoCohort = [
      ...demoClean.map(d => mapDeal(d, false, passedProposal(d.properties ?? {}))),
      ...demoAnomalies.map(d => mapDeal(d, true, false, buildDemoNote(d.properties ?? {}))),
      ...demoStalled.map(d => mapDeal(d, false, false,
        stalledNote(daysSince(d.properties?.hs_v2_date_entered_qualifiedtobuy)), true)),
    ];

    const propCohort = [
      ...propClean.map(d => mapDeal(d, false, passedLegal(d.properties ?? {}))),
      ...propAnomalies.map(d => mapDeal(d, true, false, buildPropNote(d.properties ?? {}))),
      ...propStalled.map(d => mapDeal(d, false, false,
        stalledNote(daysSince(d.properties?.hs_v2_date_entered_contractsent)), true)),
    ];

    const legalCohort = [
      ...legalExited.map(d => ({
        id:          String(d.id),
        name:        d.properties?.dealname ?? "Unknown",
        stage:       d.properties?.dealstage ?? "",
        legal:       d.properties?.["hs_v2_date_entered_1446534336"] ?? null,
        won:         (d.properties ?? {}).dealstage === "closedwon",
        stalled:     false,
        stalledNote: null,
      })),
      ...legalStalled.map(d => ({
        id:          String(d.id),
        name:        d.properties?.dealname ?? "Unknown",
        stage:       d.properties?.dealstage ?? "",
        legal:       d.properties?.["hs_v2_date_entered_1446534336"] ?? null,
        won:         false,
        stalled:     true,
        stalledNote: stalledNote(daysSince(d.properties?.["hs_v2_date_entered_1446534336"])),
      })),
    ];

    // ── Persist rates to Redis ────────────────────────────────────────────────
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
        enteredDisc:      discTotal,
        enteredDemo:      demoTotal,
        enteredProposal:  propTotal,
        enteredLegal:     legalTotal,
        closedWon:        legalConverted.length,
        nbDealsForAvg:    nbAmounts.length,
        totalDeals:       demoTotal,
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
