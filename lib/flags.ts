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

// Discovery: genuine new = entered in window AND no prior demo/proposal/legal history
export const isNewGenuine = (deal: Deal, windowStart: Date, now: Date): boolean =>
  !!deal.new_genuine && isEnteredInWindow(deal, windowStart, now);

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
  now: Date
): SignsOfLifeRow[] => {
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Pool: Legal + Proposal + Demo only
  const pool = deals.filter(
    d => d.stage === "1446534336" || d.stage === "contractsent" || d.stage === "qualifiedtobuy"
  );

  const rows: SignsOfLifeRow[] = [];

  for (const d of pool) {
    const sig = emailSignals[String(d.id)] ?? {};
    const opens7d     = sig.opens7d    ?? 0;
    const clicks7d    = sig.clicks7d   ?? 0;
    const lastInbound = sig.lastInbound ?? null;
    const lastSubject = sig.lastSubject ?? null;
    const enteredNew  = isEnteredInWindow(d, weekAgo, now);

    const qualifies = lastInbound || opens7d > 0 || clicks7d > 0 || enteredNew;
    if (!qualifies) continue;

    rows.push({ deal: d, opens7d, clicks7d, lastInbound, lastSubject, enteredNew });
  }

  // Sort: inbound replies first, then opens descending, then stage entry date descending
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

// Amber at 2+, red at 3+
export const opensColor = (opens: number): string => {
  if (opens >= 3) return "#dc2626";
  if (opens >= 2) return "#d97706";
  return "#374151";
};
