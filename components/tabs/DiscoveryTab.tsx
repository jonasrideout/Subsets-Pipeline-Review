// components/tabs/DiscoveryTab.tsx
"use client";

import React, { useState } from "react";
import type { Deal, Assumptions } from "@/types/deals";
import { earliestStageEntry } from "@/lib/deals";
import { deriveTargets, type DerivedTargets } from "@/lib/assumptions";
import { isStale } from "@/lib/flags";
import { TableCard } from "@/components/Table";
import PacingTable from "@/components/PacingTable";
import DealTable from "@/components/DealTable";
import type { HiddenColumn } from "@/components/DealTable";
import StatCard from "@/components/StatCard";
import type { PipelineCounts } from "@/app/page";
import StageDefinition from "@/components/StageDefinition";

const NB = ["Outbound", "Events", "Partnership", "Inbound"] as const;
const fmtK = (n: number) => "$" + Math.round(n / 1000) + "K";

type Filter = "all" | "week" | "quarter" | "stale" | "progressed";

interface DiscoveryTabProps {
  deals: Deal[];
  allActive: Deal[];
  assumptions: Assumptions;
  onAssumptionsSave: (a: Assumptions) => Promise<void>;
  now: Date;
  weekAgo: Date;
  qStart: Date;
  yearStart: Date;
  qIndex: number;
  counts: PipelineCounts;
  ytdMode: boolean;
  onYtdModeChange: (v: boolean) => void;
}

export default function DiscoveryTab({
  deals, allActive, assumptions, onAssumptionsSave, now, weekAgo, qStart, yearStart, qIndex, counts, ytdMode, onYtdModeChange,
}: DiscoveryTabProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const derived     = deriveTargets(assumptions, qIndex);
  const { expansionQTarget, nbTargets, channelQTargets } = derived;
  const discQTarget = Object.values(channelQTargets).reduce((s, v) => s + v, 0);

  // Annual targets (sum across all quarters)
  const { QUARTERLY_TARGETS } = require("@/lib/assumptions");
  const annualDerived      = (QUARTERLY_TARGETS as number[]).map((_: number, i: number) => deriveTargets(assumptions, i));
  const annualDiscTarget   = annualDerived.reduce((s: number, d: ReturnType<typeof deriveTargets>) => s + Object.values(d.channelQTargets).reduce((a, v) => a + v, 0), 0);
  const annualNBTargets    = Object.fromEntries(
    NB.map(ch => [ch, annualDerived.reduce((s: number, d: ReturnType<typeof deriveTargets>) => s + (d.nbTargets[ch] ?? 0), 0)])
  ) as Record<string, number>;
  const annualExpansionTarget = annualDerived.reduce((s: number, d: ReturnType<typeof deriveTargets>) => s + d.expansionQTarget, 0);

  const periodStart   = ytdMode ? yearStart : qStart;
  const elapsedPct    = ytdMode ? counts.yElapsedPct : counts.qElapsedPct;
  const newThisWeek   = counts.discNewW;
  const newThisPeriod = ytdMode ? counts.discNewY : counts.discNewQ;
  const periodTarget  = ytdMode ? annualDiscTarget : discQTarget;
  const periodLabel   = ytdMode ? "New This Year" : "New This Quarter";

  const staleCount = deals.filter(d => isStale(d, now)).length;
  const goalPct = periodTarget > 0 ? Math.round((newThisPeriod / periodTarget) * 100) : 0;
  const pacePct = periodTarget > 0 && elapsedPct > 0
    ? Math.round((newThisPeriod / periodTarget) / elapsedPct * 100) : 0;

  // Progressed stat always uses Q (quarter is the planning unit)
  const newThisQDeals = allActive.filter(d =>
    d.createdate && new Date(d.createdate) >= qStart
  );
  const progressedCount = newThisQDeals.filter(d => d.stage !== "appointmentscheduled").length;
  const progressedPct   = newThisQDeals.length > 0 ? Math.round((progressedCount / newThisQDeals.length) * 100) : 0;

  // Pacing actuals by channel for the selected period
  const nbActuals: Record<string, number> = {};
  for (const ch of NB) {
    nbActuals[ch] = allActive.filter(d => {
      if (d.channel !== ch) return false;
      const e = earliestStageEntry(d);
      return e ? new Date(e) >= periodStart : false;
    }).length;
  }

  const nbDealsByChannel: Record<string, Deal[]> = {};
  for (const ch of NB) {
    nbDealsByChannel[ch] = allActive.filter(d => {
      if (d.channel !== ch) return false;
      const e = earliestStageEntry(d);
      return e ? new Date(e) >= periodStart : false;
    });
  }

  const expansionActual = allActive.filter(d => {
    if (d.channel !== "Expansion") return false;
    const e = earliestStageEntry(d);
    return e ? new Date(e) >= periodStart : false;
  }).length;

  const expansionDeals = allActive.filter(d => {
    if (d.channel !== "Expansion") return false;
    const e = earliestStageEntry(d);
    return e ? new Date(e) >= periodStart : false;
  });

  const sorted = [...deals].sort((a, b) =>
    new Date(b.entered_current || "").getTime() - new Date(a.entered_current || "").getTime()
  );

  const filtered = sorted.filter(d => {
    if (filter === "week")  return !!d.createdate && new Date(d.createdate) >= weekAgo;
    if (filter === "stale") return isStale(d, now);
    return true;
  });

  const progressedDeals = newThisQDeals.filter(d => d.stage !== "appointmentscheduled");
  const quarterDeals    = [...newThisQDeals].sort((a, b) =>
    new Date(b.createdate || "").getTime() - new Date(a.createdate || "").getTime()
  );

  const displayDeals =
    filter === "progressed" ? progressedDeals :
    filter === "quarter"    ? quarterDeals :
    filtered;

  const showStage = filter === "quarter" || filter === "progressed";
  const hiddenCols: HiddenColumn[] = ["amount", "closeDate", "closePlan"];
  if (!showStage) hiddenCols.push("stage");

  const toggle = (f: Filter) => setFilter(prev => prev === f ? "all" : f);

  const filterLabel: Record<Filter, string> = {
    all: "", week: "new this week", quarter: "new this quarter",
    stale: "stale >60 days", progressed: "progressed past discovery",
  };

  const pacingTitle = ytdMode
    ? `New Business Pacing — ${now.getFullYear()} YTD`
    : `New Business Pacing — Q${qIndex + 1}`;
  const upsellTitle = ytdMode
    ? `Upsell Pacing — ${now.getFullYear()} YTD`
    : `Upsell Pacing — Q${qIndex + 1}`;

  return (
    <div>
      <StageDefinition stage="discovery" />

      {/* Q / YTD toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 3, gap: 2 }}>
          {(["Q", "YTD"] as const).map(mode => (
            <button key={mode}
              onClick={() => onYtdModeChange(mode === "YTD")}
              style={{
                padding: "5px 16px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif",
                background: (mode === "YTD") === ytdMode ? "#fff" : "transparent",
                color: (mode === "YTD") === ytdMode ? "#0f172a" : "#94a3b8",
                boxShadow: (mode === "YTD") === ytdMode ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s",
              }}>
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Currently in Discovery" value={deals.length} />
        <StatCard label="New This Week"    value={newThisWeek} onClick={() => toggle("week")}    active={filter === "week"} />
        <StatCard label={periodLabel}      value={newThisPeriod} target={periodTarget} goalPct={goalPct} pacePct={pacePct} onClick={() => toggle("quarter")} active={filter === "quarter"} />
        <StatCard label="Progressed Past Discovery" value={progressedCount} subValue={`${progressedPct}% of Q adds`} onClick={() => toggle("progressed")} active={filter === "progressed"} />
        <StatCard label="Stale >60 days"   value={staleCount}  onClick={() => toggle("stale")}   active={filter === "stale"} />
      </div>

      {filter !== "all" && (
        <div style={{ marginBottom: 10, fontSize: 12, color: "#64748b", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          Showing <strong>{filterLabel[filter]}</strong>
          {" "}({displayDeals.length} deal{displayDeals.length !== 1 ? "s" : ""})
          <button onClick={() => setFilter("all")}
            style={{ marginLeft: 10, fontSize: 11, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Show all
          </button>
        </div>
      )}

      {/* New Business Pacing */}
      <PacingTable
        title={pacingTitle}
        channels={[...NB]}
        targets={ytdMode ? annualNBTargets : nbTargets}
        actuals={nbActuals}
        dealsByChannel={nbDealsByChannel}
        qElapsedPct={elapsedPct}
        now={now}
        squareBottom
      />
      <NBAssumptionsDrawer
        assumptions={assumptions}
        derived={derived}
        onSave={onAssumptionsSave}
      />

      {/* Upsell Pacing */}
      <div style={{ marginTop: 14 }}>
        <PacingTable
          title={upsellTitle}
          channels={["Expansion"]}
          targets={{ Expansion: ytdMode ? annualExpansionTarget : expansionQTarget }}
          actuals={{ Expansion: expansionActual }}
          dealsByChannel={{ Expansion: expansionDeals }}
          qElapsedPct={elapsedPct}
          now={now}
          squareBottom
        />
        <UpsellAssumptionsDrawer
          assumptions={assumptions}
          derived={derived}
          onSave={onAssumptionsSave}
        />
      </div>

      {/* Main deal table */}
      <div style={{ marginTop: 14 }}>
        <TableCard>
          <DealTable
            deals={displayDeals}
            mode="standard"
            now={now}
            qStart={qStart}
            weekAgo={weekAgo}
            enteredDateFn={d => d.entered_discovery || d.entered_current}
            hiddenColumns={hiddenCols}
          />
        </TableCard>
      </div>
    </div>
  );
}

// ── DRAWER SHELL ──────────────────────────────────────────────────────────────

function DrawerShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: "1.5px solid #e2e8f0", borderTop: "none",
      borderRadius: "0 0 12px 12px", background: "#fff",
      overflow: "hidden", marginBottom: 14,
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: "8px 14px", background: "none",
          border: "none", cursor: "pointer", fontSize: 11, color: "#94a3b8",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        <span style={{ fontWeight: 600 }}>Assumptions</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ padding: "0 14px 14px" }}>{children}</div>}
    </div>
  );
}

// ── SHARED TABLE CELL HELPERS ─────────────────────────────────────────────────

const THc = ({ children }: { children: React.ReactNode }) => (
  <th style={{ padding: "6px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: 0.4, borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
    {children}
  </th>
);

const TDc = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <td style={{ padding: "7px 12px", fontSize: 12, color: "#374151", fontFamily: "'DM Sans', system-ui, sans-serif", ...style }}>
    {children}
  </td>
);

// ── NEW BUSINESS ASSUMPTIONS ──────────────────────────────────────────────────

function NBAssumptionsDrawer({ assumptions, derived, onSave }: {
  assumptions: Assumptions;
  derived: DerivedTargets;
  onSave: (a: Assumptions) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [tmp, setTmp]         = useState<Assumptions | null>(null);
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    if (!tmp) return;
    setSaving(true);
    await onSave(tmp);
    setSaving(false);
    setEditing(false);
    setTmp(null);
  };

  const liveAnnualCloses = (a: Assumptions) => {
    const annualNBRevenue = derived.nbQRevenueTarget * 4;
    const result: Record<string, number> = {};
    for (const ch of NB) {
      result[ch] = (annualNBRevenue * (a.ch[ch] / 100)) / a.avg_deal_value;
    }
    return result;
  };

  return (
    <DrawerShell>
      {editing && tmp ? (
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
            <thead>
              <tr>
                <THc>Channel</THc>
                <THc>Revenue Share</THc>
                <THc>Avg Deal Size</THc>
                <THc>Derived Annual Deals</THc>
              </tr>
            </thead>
            <tbody>
              {NB.map(ch => {
                const liveCloses = liveAnnualCloses(tmp);
                return (
                  <tr key={ch} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <TDc><span style={{ fontWeight: 500 }}>{ch}</span></TDc>
                    <TDc>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="number"
                          value={tmp.ch[ch]}
                          onChange={e => setTmp({ ...tmp, ch: { ...tmp.ch, [ch]: +e.target.value } })}
                          style={{ width: 52, padding: "3px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans', system-ui, sans-serif" }}
                        />
                        <span style={{ fontSize: 12, color: "#64748b" }}>%</span>
                      </div>
                    </TDc>
                    <TDc style={{ color: "#94a3b8" }}>{fmtK(tmp.avg_deal_value)}</TDc>
                    <TDc style={{ fontWeight: 700, color: "#0f172a" }}>{liveCloses[ch].toFixed(1)}</TDc>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ background: "linear-gradient(135deg, #a0fad7, #82f6c6)", color: "#0a2e1f", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => { setEditing(false); setTmp(null); }}
              style={{ background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Avg deal size: <strong style={{ color: "#374151" }}>{fmtK(assumptions.avg_deal_value)}</strong>
            <span style={{ marginLeft: 8, color: "#cbd5e1" }}>· edit in Methodology</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
            <thead>
              <tr>
                <THc>Channel</THc>
                <THc>Revenue Share</THc>
                <THc>Avg Deal Size</THc>
                <THc>Derived Annual Deals</THc>
              </tr>
            </thead>
            <tbody>
              {NB.map(ch => (
                <tr key={ch} style={{ borderBottom: "1px solid #f8fafc" }}>
                  <TDc><span style={{ fontWeight: 500 }}>{ch}</span></TDc>
                  <TDc>{assumptions.ch[ch]}%</TDc>
                  <TDc style={{ color: "#94a3b8" }}>{fmtK(assumptions.avg_deal_value)}</TDc>
                  <TDc style={{ fontWeight: 700 }}>{derived.annualClosesByChannel[ch]?.toFixed(1)}</TDc>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => { setEditing(true); setTmp(JSON.parse(JSON.stringify(assumptions))); }}
            style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e4ed", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Edit
          </button>
        </div>
      )}
    </DrawerShell>
  );
}

// ── UPSELL ASSUMPTIONS ────────────────────────────────────────────────────────

function UpsellAssumptionsDrawer({ assumptions, derived, onSave }: {
  assumptions: Assumptions;
  derived: DerivedTargets;
  onSave: (a: Assumptions) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [tmp, setTmp]         = useState<Assumptions | null>(null);
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    if (!tmp) return;
    setSaving(true);
    await onSave(tmp);
    setSaving(false);
    setEditing(false);
    setTmp(null);
  };

  const liveQCloses = (a: Assumptions) =>
    Math.ceil(derived.expansionQRevenueTarget / a.expansion_avg_deal_size);
  const liveQTarget = (a: Assumptions) =>
    Math.ceil(liveQCloses(a) / (a.expansion_close_rate / 100));

  return (
    <DrawerShell>
      {editing && tmp ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Avg Deal Size
              <span style={{ fontSize: 12, color: "#64748b" }}>$</span>
              <input type="number" value={tmp.expansion_avg_deal_size}
                onChange={e => setTmp({ ...tmp, expansion_avg_deal_size: +e.target.value })}
                style={{ width: 100, padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans', system-ui, sans-serif" }} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Close Rate
              <input type="number" value={tmp.expansion_close_rate}
                onChange={e => setTmp({ ...tmp, expansion_close_rate: +e.target.value })}
                style={{ width: 60, padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans', system-ui, sans-serif" }} />
              <span style={{ fontSize: 12, color: "#64748b" }}>%</span>
            </label>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
            <thead>
              <tr>
                <THc>Channel</THc>
                <THc>Q Revenue Target</THc>
                <THc>Avg Deal Size</THc>
                <THc>Q Closes Needed</THc>
                <THc>Q Discovery Target</THc>
              </tr>
            </thead>
            <tbody>
              <tr>
                <TDc><span style={{ fontWeight: 500 }}>Expansion</span></TDc>
                <TDc style={{ color: "#94a3b8" }}>{fmtK(derived.expansionQRevenueTarget)}</TDc>
                <TDc style={{ color: "#94a3b8" }}>{fmtK(tmp.expansion_avg_deal_size)}</TDc>
                <TDc>{liveQCloses(tmp)}</TDc>
                <TDc style={{ fontWeight: 700, color: "#0f172a" }}>{liveQTarget(tmp)}</TDc>
              </tr>
            </tbody>
          </table>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ background: "linear-gradient(135deg, #a0fad7, #82f6c6)", color: "#0a2e1f", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => { setEditing(false); setTmp(null); }}
              style={{ background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Q target: <strong style={{ color: "#374151" }}>{fmtK(derived.expansionQRevenueTarget)}</strong>
            &nbsp;·&nbsp;Avg deal: <strong style={{ color: "#374151" }}>{fmtK(assumptions.expansion_avg_deal_size)}</strong>
            &nbsp;·&nbsp;Close rate: <strong style={{ color: "#374151" }}>{assumptions.expansion_close_rate}%</strong>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
            <thead>
              <tr>
                <THc>Channel</THc>
                <THc>Q Revenue Target</THc>
                <THc>Avg Deal Size</THc>
                <THc>Q Closes Needed</THc>
                <THc>Q Discovery Target</THc>
              </tr>
            </thead>
            <tbody>
              <tr>
                <TDc><span style={{ fontWeight: 500 }}>Expansion</span></TDc>
                <TDc style={{ color: "#94a3b8" }}>{fmtK(derived.expansionQRevenueTarget)}</TDc>
                <TDc style={{ color: "#94a3b8" }}>{fmtK(assumptions.expansion_avg_deal_size)}</TDc>
                <TDc>{derived.expansionQCloses}</TDc>
                <TDc style={{ fontWeight: 700 }}>{derived.expansionQTarget}</TDc>
              </tr>
            </tbody>
          </table>
          <button
            onClick={() => { setEditing(true); setTmp(JSON.parse(JSON.stringify(assumptions))); }}
            style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e4ed", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Edit
          </button>
        </div>
      )}
    </DrawerShell>
  );
}
