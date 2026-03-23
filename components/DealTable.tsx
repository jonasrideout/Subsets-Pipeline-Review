// components/DealTable.tsx

"use client";

import { useState } from "react";
import type { Deal, ClosePlanMap, EmailSignalMap } from "@/types/deals";
import { ownerName, fmtDate, fmtCur, daysSince, UNRESOLVED_OWNER_IDS } from "@/lib/deals";
import { isStale } from "@/lib/flags";
import { opensColor } from "@/lib/flags";
import { TH, TD } from "@/components/Table";
import {
  CloseDateBadge, UnresolvedOwnerBadge,
  NewQBadge, StaleBadge, NoContactBadge,
  OverdueBadge, DueSoonBadge, NoClosePlanBadge,
  NoActivityBadge,
} from "@/components/Badges";
import DealLink from "@/components/DealLink";

// ── SIGNS OF LIFE BADGES ──────────────────────────────────────────────────────

function InboundBadge({ count }: { count: number }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: "rgba(34,197,94,0.1)", color: "#15803d",
      border: "1px solid rgba(34,197,94,0.25)", marginRight: 4, whiteSpace: "nowrap",
    }}>
      {/* right-pointing arrow → */}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="18" y2="12"/>
        <polyline points="12,6 18,12 12,18"/>
      </svg>
      {/* envelope */}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
      {count}
    </span>
  );
}

function OpensBadge({ count }: { count: number }) {
  const color = opensColor(count);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: count >= 3 ? "rgba(239,68,68,0.1)" : count >= 2 ? "rgba(234,179,8,0.1)" : "rgba(99,102,241,0.08)",
      color,
      border: `1px solid ${count >= 3 ? "rgba(239,68,68,0.25)" : count >= 2 ? "rgba(234,179,8,0.25)" : "rgba(99,102,241,0.2)"}`,
      marginRight: 4, whiteSpace: "nowrap",
    }}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>
      </svg>
      {count}
    </span>
  );
}

function ClicksBadge({ count }: { count: number }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: "rgba(124,58,237,0.08)", color: "#7c3aed",
      border: "1px solid rgba(124,58,237,0.2)", marginRight: 4, whiteSpace: "nowrap",
    }}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M9 3L9 14L12.5 10.5L14.5 15.5L16.5 14.5L14.5 9.5L19 9.5Z"/>
      </svg>
      {count}
    </span>
  );
}

function EnteredStageBadge() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: "rgba(130,246,198,0.15)", color: "#059669",
      border: "1px solid rgba(130,246,198,0.4)", marginRight: 4, whiteSpace: "nowrap",
    }}>
      🆕 Entered stage
    </span>
  );
}

// ── TYPES ─────────────────────────────────────────────────────────────────────

export type HiddenColumn = "channel" | "amount" | "closeDate" | "closePlan" | "enteredStage" | "lastContact" | "daysInStage";

export type DealTableMode = "standard" | "sol" | "needs-action";

interface DealTableProps {
  deals: Deal[];
  mode: DealTableMode;
  closePlans?: ClosePlanMap;
  onClosePlanSave?: (dealId: string, url: string) => Promise<void>;
  emailSignals?: EmailSignalMap;
  alertsMap?: Record<string, string[]>;
  now: Date;
  qStart: Date;
  weekAgo?: Date;
  enteredDateFn?: (d: Deal) => string | null;
  hiddenColumns?: HiddenColumn[];
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function DealTable({
  deals, mode, closePlans = {}, onClosePlanSave,
  emailSignals = {}, alertsMap = {},
  now, qStart, weekAgo,
  enteredDateFn,
  hiddenColumns = [],
}: DealTableProps) {
  const hide = (col: HiddenColumn) => hiddenColumns.includes(col);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputVal, setInputVal]   = useState("");
  const [saving, setSaving]       = useState(false);

  const handleSave = async (dealId: string) => {
    if (!onClosePlanSave) return;
    setSaving(true);
    await onClosePlanSave(dealId, inputVal);
    setSaving(false);
    setEditingId(null);
    setInputVal("");
  };

  const getEnteredDate = (d: Deal) =>
    enteredDateFn ? enteredDateFn(d) : d.entered_current;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <TH>Company</TH>
          {!hide("channel")      && <TH>Channel</TH>}
          {!hide("amount")       && <TH>Amount</TH>}
          {!hide("closeDate")    && <TH>Close Date</TH>}
          {!hide("closePlan")    && <TH>Close Plan</TH>}
          <TH>Owner</TH>
          {!hide("enteredStage") && <TH>Entered Stage</TH>}
          {!hide("lastContact")  && <TH>Last Contact</TH>}
          {!hide("daysInStage")  && <TH>Days in Stage</TH>}
          <TH>Flags</TH>
        </tr>
      </thead>
      <tbody>
        {deals.map(d => {
          const enteredDate = getEnteredDate(d);
          const daysIn      = daysSince(enteredDate, now);
          const lc          = daysSince(d.last_contacted, now);
          const stale       = isStale(d, now);
          const isNew       = !!d.createdate && new Date(d.createdate) >= qStart;
          const daysUntil   = d.closedate
            ? Math.ceil((new Date(d.closedate).getTime() - now.getTime()) / 86400000)
            : null;

          // Signs of Life signals
          const sig         = emailSignals[String(d.id)] ?? {};
          const opens7d     = sig.opens7d    ?? 0;
          const clicks7d    = sig.clicks7d   ?? 0;
          const inbound7d   = sig.inbound7d  ?? 0;
          const lastInbound = sig.lastInbound ?? null;
          const enteredNew  = weekAgo ? !!enteredDate && new Date(enteredDate) >= weekAgo : false;

          const rowBg = "white";

          return (
            <tr key={d.id} className="table-row-hover"
              style={{ borderBottom: "1px solid #f4f5f8", background: rowBg }}>

              {/* Company */}
              <TD><DealLink id={d.id} name={d.name} /></TD>

              {/* Channel */}
              {!hide("channel") && (
                <TD style={{ color: d.channel ? "#374151" : "#f59e0b" }}>
                  {d.channel ?? "⚠ missing"}
                </TD>
              )}

              {/* Amount */}
              {!hide("amount") && (
                <TD style={{ fontWeight: 600, color: "#15803d" }}>{fmtCur(d.amount)}</TD>
              )}

              {/* Close Date */}
              {!hide("closeDate") && (
                <TD><CloseDateBadge dateStr={d.closedate} now={now} /></TD>
              )}

              {/* Close Plan */}
              {!hide("closePlan") && (
                <TD>
                  {editingId === d.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input value={inputVal} onChange={e => setInputVal(e.target.value)}
                        placeholder="Paste URL…" autoFocus
                        style={{ border: "1px solid #c7d2fe", borderRadius: 6, padding: "3px 8px", fontSize: 12, width: 160, outline: "none" }} />
                      <button onClick={() => handleSave(d.id)} disabled={saving}
                        style={{ background: "linear-gradient(135deg, #a0fad7, #82f6c6)", color: "#0a2e1f", border: "none", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                        {saving ? "…" : "Save"}
                      </button>
                      <button onClick={() => { setEditingId(null); setInputVal(""); }}
                        style={{ background: "#f1f5f9", border: "none", borderRadius: 5, padding: "3px 6px", cursor: "pointer", fontSize: 11 }}>✕</button>
                    </div>
                  ) : closePlans[d.id] ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <a href={closePlans[d.id]} target="_blank" rel="noopener noreferrer"
                        style={{ color: "#6366f1", fontSize: 12 }}>📄 View</a>
                      {onClosePlanSave && (
                        <button onClick={() => { setEditingId(d.id); setInputVal(closePlans[d.id]); }}
                          style={{ background: "none", border: "none", color: "#b0b5c3", cursor: "pointer", fontSize: 11 }}>edit</button>
                      )}
                    </span>
                  ) : onClosePlanSave ? (
                    <button onClick={() => { setEditingId(d.id); setInputVal(""); }}
                      style={{ background: "none", border: "1px dashed #c7d2fe", borderRadius: 5, color: "#b0b5c3", cursor: "pointer", fontSize: 12, padding: "2px 8px" }}>
                      + add
                    </button>
                  ) : (
                    <span style={{ color: "#b0b5c3", fontSize: 12 }}>—</span>
                  )}
                </TD>
              )}

              {/* Owner */}
              <TD style={{ color: "#374151" }}>
                {ownerName(d.owner)}
                {UNRESOLVED_OWNER_IDS.has(d.owner) && <UnresolvedOwnerBadge />}
              </TD>

              {/* Entered Stage */}
              {!hide("enteredStage") && (
                <TD style={{ color: "#8b90a0" }}>{fmtDate(enteredDate)}</TD>
              )}

              {/* Last Contact */}
              {!hide("lastContact") && (
                <TD style={{ color: lc !== null && lc >= 14 ? "#c2410c" : "#8b90a0" }}>
                  {d.last_contacted ? `${fmtDate(d.last_contacted)} (${lc}d)` : "—"}
                </TD>
              )}

              {/* Days in Stage */}
              {!hide("daysInStage") && (
                <TD style={{ color: stale ? "#dc2626" : "#374151", fontWeight: stale ? 700 : 400 }}>
                  {daysIn != null ? `${daysIn}d` : "—"}
                </TD>
              )}

              {/* Flags */}
              <TD>
                {mode === "sol" ? (
                  <>
                    {inbound7d > 0 && <InboundBadge count={inbound7d} />}
                    {opens7d > 0 && <OpensBadge count={opens7d} />}
                    {clicks7d > 0 && <ClicksBadge count={clicks7d} />}
                    {enteredNew && inbound7d === 0 && opens7d === 0 && clicks7d === 0 && <EnteredStageBadge />}
                  </>
                ) : mode === "needs-action" ? (
                  <>
                    {isNew && <NewQBadge createdate={d.createdate} />}
                    {stale && <StaleBadge />}
                    {lc !== null && lc >= 14 && <NoContactBadge />}
                    {daysUntil !== null && daysUntil < 0 && <OverdueBadge days={Math.abs(daysUntil)} />}
                    {daysUntil !== null && daysUntil >= 0 && daysUntil <= 21 && <DueSoonBadge days={daysUntil} />}
                    {!closePlans[d.id] && d.stage === "contractsent" && <NoClosePlanBadge />}
                    {(lc === null || lc >= 60) && <NoActivityBadge />}
                  </>
                ) : (
                  <>
                    {isNew && <NewQBadge createdate={d.createdate} />}
                    {stale && <StaleBadge />}
                    {lc !== null && lc >= 14 && <NoContactBadge />}
                    {daysUntil !== null && daysUntil < 0 && <OverdueBadge days={Math.abs(daysUntil)} />}
                    {daysUntil !== null && daysUntil >= 0 && daysUntil <= 21 && <DueSoonBadge days={daysUntil} />}
                    {!closePlans[d.id] && d.stage === "contractsent" && <NoClosePlanBadge />}
                    {(lc === null || lc >= 60) && (d.stage === "1446534336" || d.stage === "contractsent") && <NoActivityBadge />}
                  </>
                )}
              </TD>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
