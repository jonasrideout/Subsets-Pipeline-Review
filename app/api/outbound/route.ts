// app/api/outbound/route.ts

import { NextRequest, NextResponse } from "next/server";
import type { OutboundWindow, EmailCategory, SentEmail, AttributedEmail, RepOutboundStats, OutboundReport } from "@/types/outbound";

export const dynamic = "force-dynamic";

const BASE  = "https://api.hubapi.com";
const TOKEN = process.env.HUBSPOT_TOKEN!;

// ── Owner ID → rep name mapping ───────────────────────────────────────────────
// HubSpot user IDs (hs_created_by_user_id) are different from owner IDs.
// Jonas has two user IDs (primary + withsubsets.com sender).
const USER_ID_TO_REP: Record<string, string> = {
  "78829280":   "Jonas",
  "33321821":   "Jonas",   // withsubsets.com sender
  "45520625":   "Nikolai", // HubSpot user ID (differs from owner ID 369437160)
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
  if (window === "week")  return new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
  if (window === "month") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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
    } catch { /* skip */ }
  }
  return result;
};

// ── Fetch deals for a set of contact IDs ─────────────────────────────────────

const fetchDealsForContacts = async (
  contactIds: string[],
  windowStart: Date,
  windowEnd: Date
): Promise<Record<string, any[]>> => {
  if (!contactIds.length) return {};

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
    } catch { /* skip */ }
  }

  const allDealIds = [...new Set(Object.values(contactDealIds).flat())];
  if (!allDealIds.length) return {};

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
      for (const d of data.results ?? []) dealDetails[String(d.id)] = d;
    } catch { /* skip */ }
  }

  const result: Record<string, any[]> = {};
  for (const [cid, dids] of Object.entries(contactDealIds)) {
    result[cid] = dids.map(did => dealDetails[did]).filter(Boolean);
  }
  return result;
};

// ── Fetch contact names ───────────────────────────────────────────────────────

const fetchContactNames = async (contactIds: string[]): Promise<Record<string, string>> => {
  if (!contactIds.length) return {};
  const result: Record<string, string> = {};
  const chunks: string[][] = [];
  for (let i = 0; i < contactIds.length; i += 100) chunks.push(contactIds.slice(i, i + 100));

  for (const chunk of chunks) {
    try {
      const data = await hs("/crm/v3/objects/contacts/batch/read", {
        inputs: chunk.map(id => ({ id })),
        properties: ["firstname", "lastname", "email"],
      });
      for (const c of data.results ?? []) {
        const p = c.properties ?? {};
        const name = [p.firstname, p.lastname].filter(Boolean).join(" ").trim()
          || p.email
          || String(c.id);
        result[String(c.id)] = name;
      }
    } catch { /* skip */ }
  }
  return result;
};

// ── Reply-based attribution ───────────────────────────────────────────────────
// For each contact, fetch their full email timeline.
// For each inbound reply, find the most recent outbound email sent before it by one of our reps.
// Return a map: contactId → repName (the rep whose email was replied to).

const buildReplyAttributionMap = async (
  contactIds: string[],
  repEmailIdToRep: Record<string, string>, // emailId → repName, for all outbound emails we sent
): Promise<Record<string, string>> => {
  if (!contactIds.length) return {};

  const result: Record<string, string> = {};

  // Batch contacts into chunks — fetch all their emails via association search
  // We use the contacts→emails association batch endpoint
  const chunks: string[][] = [];
  for (let i = 0; i < contactIds.length; i += 100) chunks.push(contactIds.slice(i, i + 100));

  // Step 1: get all email IDs associated with each contact
  const contactEmailIds: Record<string, string[]> = {};
  for (const chunk of chunks) {
    try {
      const data = await hs("/crm/v4/associations/contacts/emails/batch/read", {
        inputs: chunk.map(id => ({ id })),
      });
      for (const item of data.results ?? []) {
        const cid = String(item.from?.id);
        contactEmailIds[cid] = (item.to ?? []).map((t: any) => String(t.toObjectId));
      }
    } catch { /* skip */ }
  }

  // Step 2: collect all unique email IDs across all contacts
  const allEmailIds = [...new Set(Object.values(contactEmailIds).flat())];
  if (!allEmailIds.length) return {};

  // Step 3: batch fetch all those emails to get direction, timestamp, sender
  const emailChunks: string[][] = [];
  for (let i = 0; i < allEmailIds.length; i += 100) emailChunks.push(allEmailIds.slice(i, i + 100));

  const emailDetails: Record<string, any> = {};
  for (const chunk of emailChunks) {
    try {
      const data = await hs("/crm/v3/objects/emails/batch/read", {
        inputs: chunk.map(id => ({ id })),
        properties: [
          "hs_email_direction",
          "hs_timestamp",
          "hs_created_by_user_id",
          "hs_sequence_id",
        ],
      });
      for (const e of data.results ?? []) emailDetails[String(e.id)] = e;
    } catch { /* skip */ }
  }

  // Step 4: for each contact, build timeline and find reply attribution
  for (const cid of contactIds) {
    const emailIds = contactEmailIds[cid] ?? [];
    if (!emailIds.length) continue;

    // Build timeline of all emails for this contact, sorted by timestamp ascending
    const timeline = emailIds
      .map(eid => emailDetails[eid])
      .filter(Boolean)
      .map(e => ({
        id:        String(e.id),
        direction: (e.properties?.hs_email_direction ?? "") as string,
        ts:        e.properties?.hs_timestamp ? new Date(e.properties.hs_timestamp).getTime() : 0,
        userId:    String(e.properties?.hs_created_by_user_id ?? ""),
      }))
      .sort((a, b) => a.ts - b.ts);

    // For each inbound reply, find the most recent outbound email before it by one of our reps
    for (const email of timeline) {
      if (email.direction !== "INCOMING_EMAIL") continue;

      // Walk backwards through emails before this reply
      const before = timeline.filter(e => e.ts < email.ts && e.direction === "EMAIL");
      if (!before.length) continue;

      // Most recent outbound before this reply
      const lastOutbound = before[before.length - 1];

      // Check if that outbound was sent by one of our reps (by email ID in our sent set)
      const rep = repEmailIdToRep[lastOutbound.id]
        ?? USER_ID_TO_REP[lastOutbound.userId]
        ?? null;

      if (rep) {
        // Only upgrade if no attribution yet, or keep existing (first reply wins)
        if (!result[cid]) result[cid] = rep;
        break;
      }
    }
  }

  return result;
};

// ── Deal attribution logic ────────────────────────────────────────────────────

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
  let bestRank = -1;

  for (const raw of deals) {
    const p           = raw.properties ?? {};
    const createdate  = p.createdate ? new Date(p.createdate) : null;
    const enteredDemo = p.hs_v2_date_entered_qualifiedtobuy
      ? new Date(p.hs_v2_date_entered_qualifiedtobuy) : null;

    const createdInWindow = createdate  && createdate  >= windowStart && createdate  <= windowEnd;
    const demoInWindow    = enteredDemo && enteredDemo >= windowStart && enteredDemo <= windowEnd;
    const preExisting     = !!(createdate && createdate < windowStart);

    if (demoInWindow && bestRank < 2) {
      best = { dealId: String(raw.id), dealName: p.dealname ?? "", type: "progression", preExistingDeal: preExisting };
      bestRank = 2;
    } else if (createdInWindow && !preExisting && bestRank < 1) {
      best = { dealId: String(raw.id), dealName: p.dealname ?? "", type: "new_deal", preExistingDeal: false };
      bestRank = 1;
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

  const emptyReps = REPS.map(name => ({
    ownerId: "", repName: name,
    counts: { Sequence: 0, Roundtable: 0, Outreach: 0, total: 0 },
    newDeals: 0, progressions: 0, attributed: [],
    emailsByCategory: { Sequence: [], Roundtable: [], Outreach: [] } as Record<EmailCategory, SentEmail[]>,
  }));

  if (!repEmails.length) {
    return NextResponse.json({
      window, windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(), reps: emptyReps, asOf: now.toISOString(),
    } as OutboundReport);
  }

  // 3. Build emailId → repName map for all our outbound emails
  const repEmailIdToRep: Record<string, string> = {};
  for (const e of repEmails) {
    const rep = USER_ID_TO_REP[String(e.properties?.hs_created_by_user_id)];
    if (rep) repEmailIdToRep[String(e.id)] = rep;
  }

  // 4. Classify emails and group by rep
  const emailsByRep: Record<string, typeof repEmails> = {};
  for (const e of repEmails) {
    const rep = USER_ID_TO_REP[String(e.properties?.hs_created_by_user_id)];
    if (!emailsByRep[rep]) emailsByRep[rep] = [];
    emailsByRep[rep].push(e);
  }

  // 5. Fetch email → contact associations for all emails
  const allEmailIds    = repEmails.map(e => String(e.id));
  const emailContactMap = await fetchEmailContactAssociations(allEmailIds);

  // 6. Collect all unique contact IDs
  const allContactIds = [...new Set(Object.values(emailContactMap).flat())];

  // 7. Fetch deals, contact names, and reply attribution in parallel
  const [contactDealMap, contactNameMap, replyAttributionMap] = await Promise.all([
    fetchDealsForContacts(allContactIds, windowStart, windowEnd),
    fetchContactNames(allContactIds),
    buildReplyAttributionMap(allContactIds, repEmailIdToRep),
  ]);

  // 8. Build a map: contactId → best attribution result (deal)
  //    Keyed by the rep determined by reply attribution (or email sender as fallback)
  //    Structure: repName → contactId → { attribution, email, category }
  const repContactBest: Record<string, Record<string, {
    attribution: Attribution | null;
    email: any;
    category: EmailCategory;
  }>> = {};
  for (const rep of REPS) repContactBest[rep] = {};

  // For each rep's sent emails, build emailsByCategory and populate contactBest
  const repCounts: Record<string, { Sequence: number; Roundtable: number; Outreach: number; total: number }> = {};
  const repEmailsByCategory: Record<string, Record<EmailCategory, SentEmail[]>> = {};
  for (const rep of REPS) {
    repCounts[rep] = { Sequence: 0, Roundtable: 0, Outreach: 0, total: 0 };
    repEmailsByCategory[rep] = { Sequence: [], Roundtable: [], Outreach: [] };
  }

  for (const e of repEmails) {
    const senderRep  = USER_ID_TO_REP[String(e.properties?.hs_created_by_user_id)];
    const p          = e.properties ?? {};
    const category   = classifyEmail(p.hs_email_subject ?? null, p.hs_sequence_id ?? null);

    // Counts and emailsByCategory always attributed to the sender
    repCounts[senderRep].total++;
    repCounts[senderRep][category]++;

    const firstContactId = (emailContactMap[String(e.id)] ?? [])[0] ?? null;
    const contactName    = firstContactId ? (contactNameMap[firstContactId] ?? null) : null;
    repEmailsByCategory[senderRep][category].push({
      emailId: String(e.id),
      contactName,
      category,
      sentAt:  p.hs_timestamp ?? "",
      subject: p.hs_email_subject ?? null,
    });

    // Deal attribution goes to whoever the contact replied to (fallback: sender)
    const contactIds = emailContactMap[String(e.id)] ?? [];
    for (const cid of contactIds) {
      const deals = contactDealMap[cid] ?? [];
      const attr  = attributeDeal(deals, windowStart, windowEnd);

      // The rep who gets credit is the one whose email was replied to
      const creditRep = replyAttributionMap[cid] ?? senderRep;
      const contactBest = repContactBest[creditRep];

      const existing = contactBest[cid];
      if (!existing) {
        contactBest[cid] = { attribution: attr, email: e, category };
      } else {
        const existingRank = existing.attribution?.type === "progression" ? 2 : existing.attribution?.type === "new_deal" ? 1 : 0;
        const newRank      = attr?.type === "progression" ? 2 : attr?.type === "new_deal" ? 1 : 0;
        if (newRank > existingRank) contactBest[cid] = { attribution: attr, email: e, category };
      }
    }
  }

  // 9. Build final rep stats
  const repStats: RepOutboundStats[] = REPS.map(repName => {
    const contactBest = repContactBest[repName];
    const attributed: AttributedEmail[] = [];
    let newDeals = 0, progressions = 0;

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

    return {
      ownerId: "",
      repName,
      counts:           repCounts[repName],
      newDeals,
      progressions,
      attributed,
      emailsByCategory: repEmailsByCategory[repName],
    };
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
