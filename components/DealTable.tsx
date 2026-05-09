// components/DealTable.tsx

"use client";

import { useState, useRef, useEffect } from "react";
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

// ── COMMIT BADGE ──────────────────────────────────────────────────────────────

function CommitBadge({ committed, onToggle }: { committed: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle(); }}
      title={committed ? "Remove commit" : "Commit this deal"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700,
        cursor: "pointer", border: "none", marginLeft: 6, whiteSpace: "nowrap",
        background: committed ? "rgba(22,163,74,0.12)" : "#f1f5f9",
        color: committed ? "#15803d" : "#94a3b8",
        outline: committed ? "1.5px solid rgba(22,163,74,0.3)" : "1.5px solid #e2e4ed",
        transition: "all 0.15s",
      }}
    >
      {committed ? "✓ Committed" : "Commit"}
    </button>
  );
}

// ── SIGNS OF LIFE BADGES ──────────────────────────────────────────────────────

function InboundBadge({ count }: { count: number }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: "rgba(34,197,94,0.1)", color: "#15803d",
      border: "1px solid rgba(34,197,94,0.25)", marginRight: 4, whiteSpace: "nowrap",
    }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="18" y2="12"/>
        <polyline points="12,6 18,12 12,18"/>
      </svg>
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

export type HiddenColumn = "channel" | "amount" | "closeDate" | "closePlan" | "enteredStage" | "lastContact" | "daysInStage" | "stage";

export type DealTableMode = "standard" | "sol" | "needs-action";

type SortCol = "company" | "channel" | "amount" | "closeDate" | "owner" | "enteredStage" | "lastContact" | "daysInStage" | "stage";
type SortDir = "asc" | "desc";

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
  committedIds?: Record<string, boolean>;
  onToggleCommit?: (dealId: string) => void;
}

// ── CHECKBOX FILTER DROPDOWN ──────────────────────────────────────────────────

function FilterDropdown({
  label, options, selected, onChange, sortCol, sortDir, colKey, onSort,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  sortCol: SortCol | null;
  sortDir: SortDir;
  colKey: SortCol;
  onSort: (col: SortCol) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = selected.size > 0;
  const isSorted = sortCol === colKey;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (val: string) => {
    const next = new Set(selected);
    if (next.has(val)) next.delete(val); else next.add(val);
    onChange(next);
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span
        onClick={() => onSort(colKey)}
        style={{ cursor: "pointer", userSelect: "none" as const, display: "inline-flex", alignItems: "center", gap: 3 }}
      >
        {label}
        <span style={{ fontSize: 9, color: isSorted ? "#6366f1" : "#cbd5e1" }}>
          {isSorted ? (sortDir === "asc" ? " ▲" : " ▼") : " ▲▼"}
        </span>
      </span>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{
          background: isActive ? "#eff6ff" : "none",
          border: isActive ? "1.5px solid #6366f1" : "1px solid #e2e8f0",
          borderRadius: 4, cursor: "pointer", padding: "1px 4px",
          display: "inline-flex", alignItems: "center",
          color: isActive ? "#6366f1" : "#94a3b8",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6,9 12,15 18,9"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 180, padding: "8px 0",
        }}>
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 10px 4px" }}>
            <button onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 13 }}>✕</button>
          </div>
          {selected.size > 0 && (
            <div style={{ padding: "0 14px 6px" }}>
              <button onClick={() => onChange(new Set())}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#6366f1", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                Clear all
              </button>
            </div>
          )}
          {options.map(opt => (
            <label key={opt} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "7px 14px", cursor: "pointer",
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => toggle(opt)}
                style={{ width: 15, height: 15, accentColor: "#6366f1", cursor: "pointer" }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", textTransform: "uppercase" as const, letterSpacing: 0.4 }}>
                {opt}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SORTABLE HEADER ───────────────────────────────────────────────────────────

function SortableHeader({
  label, colKey, sortCol, sortDir, onSort,
}: {
  label: string;
  colKey: SortCol;
  sortCol: SortCol | null;
  sortDir: SortDir;
  onSort: (col: SortCol) => void;
}) {
  const isSorted = sortCol === colKey;
  return (
    <span
      onClick={() => onSort(colKey)}
      style={{ cursor: "pointer", userSelect: "none" as const, display: "inline-flex", alignItems: "center", gap: 3 }}
    >
      {label}
      <span style={{ fontSize: 9, color: isSorted ? "#6366f1" : "#cbd5e1" }}>
        {isSorted ? (sortDir === "asc" ? " ▲" : " ▼") : " ▲▼"}
      </span>
    </span>
  );
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function DealTable({
  deals, mode, closePlans = {}, onClosePlanSave,
  emailSignals = {}, alertsMap = {},
  now, qStart, weekAgo,
  enteredDateFn,
  hiddenColumns = [],
  committedIds = {},
  onToggleCommit,
}: DealTableProps) {
  const hide = (col: HiddenColumn) => hiddenColumns.includes(col);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputVal, setInputVal]   = useState("");
  const [saving, setSaving]       = useState(false);

  // Sort state: 3-click cycle — asc → desc → null
  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Filter state
  const [ownerFilter,   setOwnerFilter]   = useState<Set<string>>(new Set());
  const [channelFilter, setChannelFilter] = useState<Set<string>>(new Set());

  const handleSort = (col: SortCol) => {
    if (sortCol !== col) { setSortCol(col); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortCol(null); setSortDir("asc"); }
  };

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

  // Unique options for filter dropdowns
  const ownerOptions   = [...new Set(deals.map(d => ownerName(d.owner)).filter(Boolean))].sort();
  const channelOptions = [...new Set(deals.map(d => d.channel ?? "Unknown").filter(Boolean))].sort();

  // Apply filters
  let rows = deals.filter(d => {
    if (ownerFilter.size   > 0 && !ownerFilter.has(ownerName(d.owner)))      return false;
    if (channelFilter.size > 0 && !channelFilter.has(d.channel ?? "Unknown")) return false;
    return true;
  });

  // Apply sort
  if (sortCol) {
    rows = [...rows].sort((a, b) => {
      let av: any, bv: any;
      switch (sortCol) {
        case "company":      av = a.name;                            bv = b.name; break;
        case "channel":      av = a.channel ?? "";                   bv = b.channel ?? ""; break;
        case "amount":       av = a.amount ?? 0;                     bv = b.amount ?? 0; break;
        case "closeDate":    av = a.closedate ? new Date(a.closedate).getTime() : 0;
                             bv = b.closedate ? new Date(b.closedate).getTime() : 0; break;
        case "owner":        av = ownerName(a.owner);                bv = ownerName(b.owner); break;
        case "enteredStage": av = getEnteredDate(a) ? new Date(getEnteredDate(a)!).getTime() : 0;
                             bv = getEnteredDate(b) ? new Date(getEnteredDate(b)!).getTime() : 0; break;
        case "lastContact":  av = a.last_contacted ? new Date(a.last_contacted).getTime() : 0;
                             bv = b.last_contacted ? new Date(b.last_contacted).getTime() : 0; break;
        case "daysInStage":  av = daysSince(getEnteredDate(a), now) ?? 0;
                             bv = daysSince(getEnteredDate(b), now) ?? 0; break;
        case "stage":        av = a.stage;                           bv = b.stage; break;
        default:             av = 0; bv = 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  const sh = (label: string, col: SortCol) => (
    <SortableHeader label={label} colKey={col} sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
  );

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <TH>{sh("Company", "company")}</TH>
          {!hide("channel") && (
            <TH>
              <FilterDropdown
                label="Channel" options={channelOptions} selected={channelFilter}
                onChange={setChannelFilter} sortCol={sortCol} sortDir={sortDir}
                colKey="channel" onSort={handleSort}
              />
            </TH>
          )}
          {!hide("amount")       && <TH>{sh("Amount", "amount")}</TH>}
          {!hide("closeDate")    && <TH>{sh("Close Date", "closeDate")}</TH>}
          {!hide("closePlan")    && <TH>Close Plan</TH>}
          <TH>
            <FilterDropdown
              label="Owner" options={ownerOptions} selected={ownerFilter}
              onChange={setOwnerFilter} sortCol={sortCol} sortDir={sortDir}
              colKey="owner" onSort={handleSort}
            />
          </TH>
          {!hide("enteredStage") && <TH>{sh("Entered Stage", "enteredStage")}</TH>}
          {!hide("lastContact")  && <TH>{sh("Last Contact", "lastContact")}</TH>}
          {!hide("daysInStage")  && <TH>{sh("Days in Stage", "daysInStage")}</TH>}
          {!hide("stage")        && <TH>{sh("Stage", "stage")}</TH>}
          <TH>Flags</TH>
        </tr>
      </thead>
      <tbody>
        {rows.map(d => {
          const enteredDate = getEnteredDate(d);
          const daysIn      = daysSince(enteredDate, now);
          const lc          = daysSince(d.last_contacted, now);
          const stale       = isStale(d, now);
          const isNew       = !!d.createdate && new Date(d.createdate) >= qStart;
          const daysUntil   = d.closedate
            ? Math.ceil((new Date(d.closedate).getTime() - now.getTime()) / 86400000)
            : null;

          const sig         = emailSignals[String(d.id)] ?? {};
          const opens7d     = sig.opens7d    ?? 0;
          const clicks7d    = sig.clicks7d   ?? 0;
          const inbound7d   = sig.inbound7d  ?? 0;
          const enteredNew  = weekAgo ? !!enteredDate && new Date(enteredDate) >= weekAgo : false;

          const isCommitted = !!committedIds[String(d.id)];

          return (
            <tr key={d.id} className="table-row-hover"
              style={{ borderBottom: "1px solid #f4f5f8", background: "white" }}>

              <TD>
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                  <DealLink id={d.id} name={d.name} />
                  {onToggleCommit && (
                    <CommitBadge committed={isCommitted} onToggle={() => onToggleCommit(String(d.id))} />
                  )}
                </div>
              </TD>

              {!hide("channel") && (
                <TD style={{ color: d.channel ? "#374151" : "#f59e0b" }}>
                  {d.channel ?? "⚠ missing"}
                </TD>
              )}

              {!hide("amount") && (
                <TD style={{ fontWeight: 600, color: "#15803d" }}>{fmtCur(d.amount)}</TD>
              )}

              {!hide("closeDate") && (
                <TD><CloseDateBadge dateStr={d.closedate} now={now} /></TD>
              )}

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

              <TD style={{ color: "#374151" }}>
                {ownerName(d.owner)}
                {UNRESOLVED_OWNER_IDS.has(d.owner) && <UnresolvedOwnerBadge />}
              </TD>

              {!hide("enteredStage") && (
                <TD style={{ color: "#8b90a0" }}>{fmtDate(enteredDate)}</TD>
              )}

              {!hide("lastContact") && (
                <TD style={{ color: lc !== null && lc >= 14 ? "#c2410c" : "#8b90a0" }}>
                  {d.last_contacted ? `${fmtDate(d.last_contacted)} (${lc}d)` : "—"}
                </TD>
              )}

              {!hide("daysInStage") && (
                <TD style={{ color: stale ? "#dc2626" : "#374151", fontWeight: stale ? 700 : 400 }}>
                  {daysIn != null ? `${daysIn}d` : "—"}
                </TD>
              )}

              {!hide("stage") && (
                <TD style={{ color: "#374151" }}>{d.stage}</TD>
              )}

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
