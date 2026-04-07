// lib/flags.ts

import type { Deal, EmailSignal, EmailSignalMap, ClosePlanMap } from "@/types/deals";
import { daysSince } from "@/lib/deals";

// ── DATE WINDOW HELPERS ───────────────────────────────────────────────────────

export const isEnteredInWindow = (deal: Deal, windowStart: Date, now: Date): boolean => {
  if (!deal.entered_current) return false;
  const entered = new Date(deal.entered_current);
  return entered >= windowStart && entered <= now;
};

export const isStale = (deal: Deal, now: Date): boolean => {
  if (!deal.entered_current) return false;
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  return new Date(deal.entered_current) <= sixtyDaysAgo;
};

export const isNewGenuine      = (deal: Deal): boolean => !!deal.new_genuine;
export const isNewThisWeek     = (deal: Deal, weekAgo: Date): boolean => !!deal.createdate && new Date(deal.createdate) >= weekAgo;
export const isNewThisQuarter  = (deal: Deal, qStart: Date): boolean => !!deal.createdate && new Date(deal.createdate) >= qStart;

export const quarterLabel = (createdate: string | null): string => {
  if (!createdate) return "";
  const d  = new Date(createdate);
  const q  = Math.floor(d.getMonth() / 3) + 1;
  const yr = String(d.getFullYear()).slice(2);
  return `Q${q} · ${yr}`;
};

// ── NEEDS ACTION FLAGS ────────────────────────────────────────────────────────

export interface NeedsActionAlert {
  deal: Deal;
  alerts: string[];
  stageLabel: string;
}

export const getNeedsActionAlerts = (
  deals: Deal[],
  closePlans: ClosePlanMap,
  now: Date
): NeedsActionAlert[] => {
  const out: NeedsActionAlert[] = [];

  for (const d of deals) {
    const alerts: string[] = [];
    const isLegalOrProp = d.stage === "1446534336" || d.stage === "contractsent";
    const isProp        = d.stage === "contractsent";
    const isDemo        = d.stage === "qualifiedtobuy";

    const isDisc        = d.stage === "appointmentscheduled";

    if (isLegalOrProp) {
      if (!d.closedate) alerts.push("🔴 No close date");
      if (!d.amount)    alerts.push("🟠 Missing amount");

      if (d.closedate) {
        const daysUntil = Math.ceil((new Date(d.closedate).getTime() - now.getTime()) / 86400000);
        if (daysUntil < 0)        alerts.push(`🔴 Overdue ${Math.abs(daysUntil)}d`);
        else if (daysUntil <= 21) alerts.push(`🟠 ${daysUntil}d away`);
      }

      const lc = daysSince(d.last_contacted, now);
      if (lc === null || lc >= 60) alerts.push("🔴 No activity 60+ days");
      if (isProp && !closePlans[d.id]) alerts.push("🔴 No close plan");
    }

    if (isDemo) {
      const lc = daysSince(d.last_contacted, now);
      if (lc === null || lc >= 14) alerts.push("🟠 No contact 14+ days");
    }

    if (isDisc) {
      const lc = daysSince(d.last_contacted, now);
      if (lc === null || lc >= 14) alerts.push("🟠 No contact 14+ days");
      if (isStale(d, now)) alerts.push("🔴 Stale 60+ days");
    }

    if (alerts.length) {
      out.push({
        deal: d,
        alerts,
        stageLabel: d.stage === "1446534336" ? "Legal"
          : d.stage === "contractsent"       ? "Proposal"
          : "Demo",
      });
    }
  }

  return out;
};

// ── SIGNS OF LIFE ─────────────────────────────────────────────────────────────

export interface SignsOfLifeRow {
  deal: Deal;
  opens7d: number;
  clicks7d: number;
  lastInbound: string | null;
  lastSubject: string | null;
  enteredNew: boolean;
}

export const getSignsOfLife = (
  deals: Deal[],
  emailSignals: EmailSignalMap,
  now: Date,
  minOpens: number = 3
): SignsOfLifeRow[] => {
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const pool = deals.filter(
    d => d.stage === "1446534336" || d.stage === "contractsent" || d.stage === "qualifiedtobuy" || d.stage === "appointmentscheduled"
  );

  const rows: SignsOfLifeRow[] = [];

  for (const d of pool) {
    const sig         = emailSignals[String(d.id)] ?? {};
    const opens7d     = sig.opens7d    ?? 0;
    const clicks7d    = sig.clicks7d   ?? 0;
    const lastInbound = sig.lastInbound ?? null;
    const lastSubject = sig.lastSubject ?? null;
    const enteredNew  = isEnteredInWindow(d, weekAgo, now);

    // Qualify: inbound reply, clicks, enough opens, or new stage entry
    if (!lastInbound && opens7d < minOpens && clicks7d === 0 && !enteredNew) continue;

    rows.push({ deal: d, opens7d, clicks7d, lastInbound, lastSubject, enteredNew });
  }

  return rows.sort((a, b) => {
    if (a.lastInbound && !b.lastInbound) return -1;
    if (!a.lastInbound && b.lastInbound) return 1;
    if (b.opens7d !== a.opens7d) return b.opens7d - a.opens7d;
    const aEntry = a.deal.entered_current ? new Date(a.deal.entered_current).getTime() : 0;
    const bEntry = b.deal.entered_current ? new Date(b.deal.entered_current).getTime() : 0;
    return bEntry - aEntry;
  });
};

// ── OPEN COUNT COLOR ──────────────────────────────────────────────────────────

export const opensColor = (opens: number): string => {
  if (opens >= 3) return "#dc2626";
  if (opens >= 2) return "#d97706";
  return "#374151";
};
