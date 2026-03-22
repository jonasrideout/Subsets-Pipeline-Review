// lib/hubspot.ts

import type { Deal, ClosedWonDeal, EmailSignal } from "@/types/deals";
import { ACTIVE_STAGE_IDS } from "@/lib/deals";

const BASE  = "https://api.hubapi.com";
const TOKEN = process.env.HUBSPOT_TOKEN!;

const hs = async (path: string, body: object): Promise<any> => {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot API error ${res.status}: ${text}`);
  }
  return res.json();
};

// ── DEAL PROPERTIES ───────────────────────────────────────────────────────────

const DEAL_PROPS = [
  "dealname",
  "dealstage",
  "amount",
  "closedate",
  "hubspot_owner_id",
  "notes_last_contacted",
  "deal_attribution",
  "createdate",
  "hs_v2_date_entered_current_stage",
  "hs_v2_date_entered_appointmentscheduled",
  "hs_v2_date_entered_qualifiedtobuy",
  "hs_v2_date_entered_contractsent",
  "hs_v2_date_entered_1446534336",
];

const EMAIL_PROPS = [
  "hs_email_direction",
  "hs_email_open_count",
  "hs_email_click_count",
  "hs_timestamp",
  "hs_email_subject",
];

// ── PAGINATION HELPER ─────────────────────────────────────────────────────────

const searchAll = async (path: string, body: object): Promise<any[]> => {
  const results: any[] = [];
  let after: string | undefined;
  do {
    const payload: any = { ...body, limit: 100 };
    if (after) payload.after = after;
    const data = await hs(path, payload);
    results.push(...(data.results ?? []));
    after = data.paging?.next?.after;
  } while (after);
  return results;
};

// ── MAPPERS ───────────────────────────────────────────────────────────────────

const mapDeal = (raw: any): Deal => {
  const p = raw.properties ?? {};
  return {
    id:                String(raw.id),
    name:              p.dealname         ?? "",
    stage:             p.dealstage        ?? "",
    amount:            p.amount           ? Number(p.amount) : null,
    closedate:         p.closedate        ?? null,
    owner:             p.hubspot_owner_id ?? "",
    channel:           p.deal_attribution ?? null,
    last_contacted:    p.notes_last_contacted ?? null,
    createdate:        p.createdate       ?? null,
    entered_current:   p.hs_v2_date_entered_current_stage          ?? null,
    entered_legal:     p["hs_v2_date_entered_1446534336"]           ?? null,
    entered_proposal:  p.hs_v2_date_entered_contractsent            ?? null,
    entered_demo:      p.hs_v2_date_entered_qualifiedtobuy          ?? null,
    entered_discovery: p.hs_v2_date_entered_appointmentscheduled    ?? null,
    new_genuine:       false, // resolved after fetch
  };
};

const mapClosedWon = (raw: any): ClosedWonDeal => {
  const p = raw.properties ?? {};
  return {
    id:        String(raw.id),
    name:      p.dealname         ?? "",
    amount:    p.amount           ? Number(p.amount) : 0,
    closedate: p.closedate        ?? "",
    owner:     p.hubspot_owner_id ?? "",
    channel:   p.deal_attribution ?? null,
  };
};

// ── QUARTER HELPER ────────────────────────────────────────────────────────────

const getQStart = (now: Date): Date =>
  new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

// ── ACTIVE DEALS ──────────────────────────────────────────────────────────────

export const fetchActiveDeals = async (): Promise<Deal[]> => {
  const now    = new Date();
  const qStart = getQStart(now);

  const raw   = await searchAll("/crm/v3/objects/deals/search", {
    filterGroups: [{
      filters: [{
        propertyName: "dealstage",
        operator:     "IN",
        values:       ACTIVE_STAGE_IDS,
      }],
    }],
    properties: DEAL_PROPS,
    sorts: [{ propertyName: "hs_lastmodifieddate", direction: "DESCENDING" }],
  });

  const deals = raw.map(mapDeal);

  // new_genuine = created this quarter, regardless of which stage they entered first
  for (const d of deals) {
    d.new_genuine = !!d.createdate && new Date(d.createdate) >= qStart;
  }

  return deals;
};

// ── CLOSED WON YTD ────────────────────────────────────────────────────────────

export const fetchClosedWonYTD = async (): Promise<ClosedWonDeal[]> => {
  const now      = new Date();
  const qStart   = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString();
  const raw = await searchAll("/crm/v3/objects/deals/search", {
    filterGroups: [{
      filters: [
        { propertyName: "dealstage", operator: "EQ",  value: "closedwon" },
        { propertyName: "closedate", operator: "GTE", value: qStart },
      ],
    }],
    properties: ["dealname", "amount", "closedate", "hubspot_owner_id", "deal_attribution"],
  });
  return raw.map(mapClosedWon);
};

// ── EMAIL SIGNALS (per deal) ──────────────────────────────────────────────────

export const fetchEmailSignalsForDeal = async (
  dealId: string,
  now: Date
): Promise<EmailSignal> => {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let raw: any[] = [];
  try {
    raw = await searchAll("/crm/v3/objects/emails/search", {
      filterGroups: [{
        filters: [
          { propertyName: "associations.deal", operator: "EQ",  value: dealId },
          { propertyName: "hs_timestamp",       operator: "GTE", value: sevenDaysAgo },
        ],
      }],
      properties: EMAIL_PROPS,
    });
  } catch {
    return { opens7d: 0, clicks7d: 0, lastInbound: null, lastSubject: null };
  }

  let opens7d    = 0;
  let clicks7d   = 0;
  let lastInbound: string | null = null;
  let lastSubject: string | null = null;
  let latestTs   = 0;

  for (const e of raw) {
    const p   = e.properties ?? {};
    const ts  = p.hs_timestamp ? new Date(p.hs_timestamp).getTime() : 0;
    const dir = p.hs_email_direction ?? "";

    opens7d  += Number(p.hs_email_open_count  ?? 0);
    clicks7d += Number(p.hs_email_click_count ?? 0);

    if (dir === "INCOMING_EMAIL" && ts > 0) {
      if (!lastInbound || ts > new Date(lastInbound).getTime()) {
        lastInbound = p.hs_timestamp;
      }
    }
    if (ts > latestTs) {
      latestTs    = ts;
      lastSubject = p.hs_email_subject ?? null;
    }
  }

  return { opens7d, clicks7d, lastInbound, lastSubject };
};

// ── BATCH EMAIL SIGNALS ───────────────────────────────────────────────────────

export const fetchAllEmailSignals = async (
  deals: Deal[],
  now: Date
): Promise<Record<string, EmailSignal>> => {
  const pool = deals.filter(
    d => d.stage === "1446534336" ||
         d.stage === "contractsent" ||
         d.stage === "qualifiedtobuy"
  );

  const entries = await Promise.all(
    pool.map(async d => {
      const sig = await fetchEmailSignalsForDeal(d.id, now);
      return [d.id, sig] as const;
    })
  );

  return Object.fromEntries(entries);
};
