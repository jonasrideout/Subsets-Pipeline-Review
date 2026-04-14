import { NextRequest, NextResponse } from "next/server";
import type { OutboundWindow, EmailCategory, AttributedEmail, RepOutboundStats, OutboundReport } from "@/types/outbound";

export const dynamic = "force-dynamic";

const BASE  = "https://api.hubapi.com";
const TOKEN = process.env.HUBSPOT_TOKEN!;

// ── Owner ID → rep name mapping ───────────────────────────────────────────────
// HubSpot user IDs (hs_created_by_user_id) are different from owner IDs.
// Jonas has two user IDs (primary + withsubsets.com sender).
const USER_ID_TO_REP: Record<string, string> = {
  "78829280":   "Jonas",
  "33321821":   "Jonas",   // withsubsets.com sender
  "369437160":  "Nikolai",
  "1758144966": "Martin",
  "32168180":   "Judith",
};

const REPS = ["Jonas", "Nikolai", "Martin", "Judith"];

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
    throw new Error(`HubSpot ${res.status}: ${text}`);
  }
  return res.json();
};

const hsGet = async (path: string): Promise<any> => {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot ${res.status}: ${text}`);
  }
  return res.json();
};

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

// ── Window helpers ────────────────────────────────────────────────────────────

const getWindowStart = (window: OutboundWindow, now: Date): Date => {
  if (window === "week")    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (window === "month")   return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // quarter
  return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
};

// ── Email classification ──────────────────────────────────────────────────────

const classifyEmail = (subject: string | null, sequenceId: string | null): EmailCategory => {
  if (sequenceId) return "Sequence";
  if (subject) {
    const s = subject.toLowerCase();
    if (s.includes("dinner") || s.includes("roundtable")) return "Roundtable";
  }
  return "Outreach";
};

// ── Batch association fetch: emails → contacts ────────────────────────────────

const fetchEmailContactAssociations = async (emailIds: string[]): Promise<Record<string, string[]>> => {
  // HubSpot batch associations v4
  if (!emailIds.length) return {};
  const chunks: string[][] = [];
  for (let i = 0; i < emailIds.length; i += 100) chunks.push(emailIds.slice(i, i + 100));

  const result: Record<string, string[]> = {};
  for (const chunk of chunks) {
    try {
      const data = await hs("/crm/v4/associations/emails/contacts/batch/read", {
        inputs: chunk.map(id => ({ id })),
      });
      for (const item of data.results ?? []) {
        result[String(item.from?.id)] = (item.to ?? []).map((t: any) => String(t.toObjectId));
      }
    } catch {
      // association fetch failed for chunk — skip
    }
  }
  return result;
};

// ── Fetch deals for a set of contact IDs ─────────────────────────────────────
// Returns map: contactId → deals[]

const fetchDealsForContacts = async (
  contactIds: string[],
  windowStart: Date,
  windowEnd: Date
): Promise<Record<string, any[]>> => {
  if (!contactIds.length) return {};

  // Batch associations: contacts → deals
  const chunks: string[][] = [];
  for (let i = 0; i < contactIds.length; i += 100) chunks.push(contactIds.slice(i, i + 100));

  const contactDealIds: Record<string, string[]> = {};
  for (const chunk of chunks) {
    try {
      const data = await hs("/crm/v4/associations/contacts/deals/batch/read", {
        inputs: chunk.map(id => ({ id })),
      });
      for (const item of data.results ?? []) {
        const cid = String(item.from?.id);
        contactDealIds[cid] = (item.to ?? []).map((t: any) => String(t.toObjectId));
      }
    } catch {
      // skip
    }
  }

  // Collect all unique deal IDs
  const allDealIds = [...new Set(Object.values(contactDealIds).flat())];
  if (!allDealIds.length) return {};

  // Fetch deal details in batch
  const dealChunks: string[][] = [];
  for (let i = 0; i < allDealIds.length; i += 100) dealChunks.push(allDealIds.slice(i, i + 100));

  const dealDetails: Record<string, any> = {};
  for (const chunk of dealChunks) {
    try {
      const data = await hs("/crm/v3/objects/deals/batch/read", {
        inputs: chunk.map(id => ({ id })),
        properties: [
          "dealname",
          "dealstage",
          "createdate",
          "hs_v2_date_entered_qualifiedtobuy",
          "hs_v2_date_entered_appointmentscheduled",
        ],
      });
      for (const d of data.results ?? []) {
        dealDetails[String(d.id)] = d;
      }
    } catch {
      // skip
    }
  }

  // Build contactId → deals[] map
  const result: Record<string, any[]> = {};
  for (const [cid, dids] of Object.entries(contactDealIds)) {
    result[cid] = dids.map(did => dealDetails[did]).filter(Boolean);
  }
  return result;
};

// ── Attribution logic ─────────────────────────────────────────────────────────
// Given deals for a contact and the window, return the best attribution.
// Returns null if no relevant activity.

interface Attribution {
  dealId:          string;
  dealName:        string;
  type:            "new_deal" | "progression";
  preExistingDeal: boolean;
}

const attributeDeal = (
  deals: any[],
  windowStart: Date,
  windowEnd: Date
): Attribution | null => {
  if (!deals.length) return null;

  let best: Attribution | null = null;
  let bestRank = -1; // higher = better (Demo > Discovery)

  for (const raw of deals) {
    const p           = raw.properties ?? {};
    const createdate  = p.createdate ? new Date(p.createdate) : null;
    const enteredDemo = p.hs_v2_date_entered_qualifiedtobuy
      ? new Date(p.hs_v2_date_entered_qualifiedtobuy) : null;

    const createdInWindow  = createdate  && createdate  >= windowStart && createdate  <= windowEnd;
    const demoInWindow     = enteredDemo && enteredDemo >= windowStart && enteredDemo <= windowEnd;
    const preExistingDeal  = !!(createdate && createdate < windowStart);

    if (demoInWindow) {
      // Rank 2 — best outcome, always wins
      if (bestRank < 2) {
        best = {
          dealId:   String(raw.id),
          dealName: p.dealname ?? "",
          type:     "progression",
          preExistingDeal,
        };
        bestRank = 2;
      }
    } else if (createdInWindow && !preExistingDeal) {
      // Rank 1 — new deal, but only if not pre-existing
      if (bestRank < 1) {
        best = {
          dealId:   String(raw.id),
          dealName: p.dealname ?? "",
          type:     "new_deal",
          preExistingDeal: false,
        };
        bestRank = 1;
      }
    }
  }

  return best;
};

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const window = (searchParams.get("window") ?? "week") as OutboundWindow;

  const now         = new Date();
  const windowStart = getWindowStart(window, now);
  const windowEnd   = now;

  // 1. Fetch all outbound emails in the window
  const rawEmails = await searchAll("/crm/v3/objects/emails/search", {
    filterGroups: [{
      filters: [
        { propertyName: "hs_email_direction", operator: "EQ",  value: "EMAIL" },
        { propertyName: "hs_timestamp",        operator: "GTE", value: windowStart.toISOString() },
        { propertyName: "hs_timestamp",        operator: "LTE", value: windowEnd.toISOString() },
      ],
    }],
    properties: [
      "hs_email_direction",
      "hs_email_subject",
      "hs_timestamp",
      "hs_created_by_user_id",
      "hs_sequence_id",
    ],
  });

  // 2. Filter to our four reps only
  const repEmails = rawEmails.filter(e => {
    const userId = String(e.properties?.hs_created_by_user_id ?? "");
    return userId in USER_ID_TO_REP;
  });

  if (!repEmails.length) {
    const report: OutboundReport = {
      window,
      windowStart: windowStart.toISOString(),
      windowEnd:   windowEnd.toISOString(),
      reps: REPS.map(name => ({
        ownerId: "", repName: name,
        counts: { Sequence: 0, Roundtable: 0, Outreach: 0, total: 0 },
        newDeals: 0, progressions: 0, attributed: [],
      })),
      asOf: now.toISOString(),
    };
    return NextResponse.json(report);
  }

  // 3. Classify emails and group by rep
  const emailsByRep: Record<string, typeof repEmails> = {};
  for (const e of repEmails) {
    const rep = USER_ID_TO_REP[String(e.properties?.hs_created_by_user_id)];
    if (!emailsByRep[rep]) emailsByRep[rep] = [];
    emailsByRep[rep].push(e);
  }

  // 4. Fetch email → contact associations for all emails
  const allEmailIds = repEmails.map(e => String(e.id));
  const emailContactMap = await fetchEmailContactAssociations(allEmailIds);

  // 5. Collect all unique contact IDs
  const allContactIds = [...new Set(Object.values(emailContactMap).flat())];

  // 6. Fetch deals for all contacts
  const contactDealMap = await fetchDealsForContacts(allContactIds, windowStart, windowEnd);

  // 7. Build per-rep stats
  const repStats: RepOutboundStats[] = REPS.map(repName => {
    const emails = emailsByRep[repName] ?? [];
    const counts = { Sequence: 0, Roundtable: 0, Outreach: 0, total: emails.length };
    const attributed: AttributedEmail[] = [];

    // Deduplicate contacts per rep — one contact counts once, best attribution wins
    const contactBest: Record<string, { attribution: Attribution | null; email: any; category: EmailCategory }> = {};

    for (const e of emails) {
      const p          = e.properties ?? {};
      const category   = classifyEmail(p.hs_email_subject ?? null, p.hs_sequence_id ?? null);
      counts[category]++;

      const contactIds = emailContactMap[String(e.id)] ?? [];
      for (const cid of contactIds) {
        const deals = contactDealMap[cid] ?? [];
        const attr  = attributeDeal(deals, windowStart, windowEnd);

        const existing = contactBest[cid];
        if (!existing) {
          contactBest[cid] = { attribution: attr, email: e, category };
        } else {
          // Upgrade if better attribution
          const existingRank = existing.attribution?.type === "progression" ? 2 : existing.attribution?.type === "new_deal" ? 1 : 0;
          const newRank      = attr?.type === "progression" ? 2 : attr?.type === "new_deal" ? 1 : 0;
          if (newRank > existingRank) {
            contactBest[cid] = { attribution: attr, email: e, category };
          }
        }
      }
    }

    // Build attributed list and tally
    let newDeals    = 0;
    let progressions = 0;

    for (const [cid, { attribution, email, category }] of Object.entries(contactBest)) {
      if (!attribution) continue;
      attributed.push({
        emailId:         String(email.id),
        contactId:       cid,
        category,
        sentAt:          email.properties?.hs_timestamp ?? "",
        subject:         email.properties?.hs_email_subject ?? null,
        dealId:          attribution.dealId,
        dealName:        attribution.dealName,
        attribution:     attribution.type,
        preExistingDeal: attribution.preExistingDeal,
      });
      if (attribution.type === "new_deal")    newDeals++;
      if (attribution.type === "progression") progressions++;
    }

    return { ownerId: "", repName, counts, newDeals, progressions, attributed };
  });

  const report: OutboundReport = {
    window,
    windowStart: windowStart.toISOString(),
    windowEnd:   windowEnd.toISOString(),
    reps: repStats,
    asOf: now.toISOString(),
  };

  return NextResponse.json(report);
}
