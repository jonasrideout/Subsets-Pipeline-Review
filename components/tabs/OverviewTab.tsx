// components/tabs/OverviewTab.tsx

"use client";

import { useMemo, useState } from "react";
import type { Deal, ClosedWonDeal, EmailSignalMap, ClosePlanMap, Assumptions, HubSpotRates } from "@/types/deals";
import { ownerName, fmtCur, weightedPipeline, UNRESOLVED_OWNER_IDS } from "@/lib/deals";
import { deriveTargets, QUARTERLY_TARGETS, NB_REVENUE_SHARE } from "@/lib/assumptions";
import { getSignsOfLife, getNeedsActionAlerts } from "@/lib/flags";
import { TH, TD, TableCard, TableCardHeader } from "@/components/Table";
import { CloseDateBadge, UnresolvedOwnerBadge } from "@/components/Badges";
import DealLink from "@/components/DealLink";
import DealTable from "@/components/DealTable";
import type { TabId } from "@/components/TabNav";
import type { PipelineCounts } from "@/app/page";

interface OverviewTabProps {
  active: Deal[];
  legal: Deal[];
  proposal: Deal[];
  demo: Deal[];
  discovery: Deal[];
  closedWon: ClosedWonDeal[];
  emailSignals: EmailSignalMap;
  closePlans: ClosePlanMap;
  assumptions: Assumptions;
  counts: PipelineCounts;
  now: Date;
  weekAgo: Date;
  qStart: Date;
  qIndex: number;
  hubspotRates: HubSpotRates | null;
  onTabChange: (tab: TabId) => void;
  onAssumptionsSave: (a: Assumptions) => Promise<void>;
}

export default function OverviewTab({
  active, legal, proposal, demo, discovery, closedWon,
  emailSignals, closePlans, assumptions, counts,
  now, weekAgo, qStart, qIndex, onTabChange, onAssumptionsSave, hubspotRates,
}: OverviewTabProps) {
  const derived = deriveTargets(assumptions, qIndex);
  const { legalTarget, propTarget, demoTarget, channelQTargets, combinedLegalTarget, combinedPropTarget, combinedDemoTarget } = derived;
  const discTarget = Object.values(channelQTargets).reduce((s, v) => s + v, 0);

  const { discNewW, discNewQ, demoNewW, demoNewQ, propNewW, propNewQ, legalNewW, legalNewQ } = counts;

  const legalAmt       = legal.reduce((s, d) => s + (d.amount || 0), 0);
  const propAmt        = proposal.reduce((s, d) => s + (d.amount || 0), 0);
  const wp             = weightedPipeline(active);
  const closedWonTotal = closedWon.reduce((s, d) => s + d.amount, 0);
  const QUARTERLY_TARGET = QUARTERLY_TARGETS[qIndex] ?? QUARTERLY_TARGETS[0];

  const qTotalDays   = (new Date(now.getFullYear(), qIndex * 3 + 3, 1).getTime() - qStart.getTime()) / 86400000;
  const qElapsedDays = (now.getTime() - qStart.getTime()) / 86400000;
  const qElapsedPct  = qElapsedDays / qTotalDays;

  const paceRatio = (actual: number, target: number) => {
    if (target === 0) return 1;
    if (qElapsedPct === 0) return 1;
    return (actual / target) / qElapsedPct;
  };

  const tileColor = (ratio: number) => {
    if (ratio >= 0.90) return { bg: "#f0fdf4", border: "#86efac", text: "#1e293b" };
    if (ratio >= 0.75) return { bg: "#fefce8", border: "#fde68a", text: "#1e293b" };
    if (ratio >= 0.50) return { bg: "#fff7ed", border: "#fed7aa", text: "#1e293b" };
    return               { bg: "#fef2f2", border: "#fecaca", text: "#1e293b" };
  };

  const tileTooltip = (actual: number, target: number, ratio: number, label: string) => {
    const elapsedPct = Math.round(qElapsedPct * 100);
    const goalPct    = target > 0 ? Math.round((actual / target) * 100) : 0;
    const qLabel     = `Q${qIndex + 1}`;
    if (ratio >= 0.90) return `You're ${elapsedPct}% through ${qLabel} and have reached ${goalPct}% of your ${label} target — on track.`;
    if (ratio >= 0.75) return `You're ${elapsedPct}% through ${qLabel} and have reached ${goalPct}% of your ${label} target — slightly behind pace.`;
    if (ratio >= 0.50) return `You're ${elapsedPct}% through ${qLabel} and have reached ${goalPct}% of your ${label} target — behind pace.`;
    return `You're ${elapsedPct}% through ${qLabel} and have reached ${goalPct}% of your ${label} target — significantly behind, needs attention.`;
  };

  const tiles = [
    { key: "legal" as TabId,     label: "Legal / Procurement",    count: legal.length,     amount: legalAmt, newW: legalNewW, newQ: legalNewQ, target: combinedLegalTarget, actual: legalNewQ },
    { key: "proposal" as TabId,  label: "Proposal / Negotiation", count: proposal.length,  amount: propAmt,  newW: propNewW,  newQ: propNewQ,  target: combinedPropTarget,  actual: propNewQ  },
    { key: "demo" as TabId,      label: "Meeting / Demo",         count: demo.length,      amount: null,     newW: demoNewW,  newQ: demoNewQ,  target: combinedDemoTarget,  actual: demoNewQ  },
    { key: "discovery" as TabId, label: "Discovery",              count: discovery.length, amount: null,     newW: discNewW,  newQ: discNewQ,  target: discTarget,          actual: discNewQ  },
  ].map(t => ({
    ...t,
    ratio:   paceRatio(t.actual, t.target),
    color:   tileColor(paceRatio(t.actual, t.target)),
    goalPct: t.target > 0 ? Math.round((t.actual / t.target) * 100) : 0,
    tooltip: tileTooltip(t.actual, t.target, paceRatio(t.actual, t.target), t.label),
  }));

  const solRows  = useMemo(() => getSignsOfLife(active, emailSignals, now), [active, emailSignals, now]);
  const naAlerts = useMemo(() => getNeedsActionAlerts([...legal, ...proposal, ...demo], closePlans, now), [legal, proposal, demo, closePlans, now]);

  return (
    <div>
      {/* Stage tiles + assumption drawers */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {tiles.map(t => (
          <div key={t.key} style={{ flex: 1, minWidth: 140, display: "flex", flexDirection: "column" }}>
            <div
              onClick={() => onTabChange(t.key)}
              style={{ background: t.color.bg, border: `1.5px solid ${t.color.border}`, borderRadius: "12px 12px 0 0", padding: "16px 18px", cursor: "pointer", position: "relative" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
            >
              <div title={t.tooltip} onClick={e => e.stopPropagation()}
                style={{ position: "absolute", top: 10, right: 12, cursor: "help", fontSize: 13, opacity: 0.4 }}>ℹ️</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.color.text, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.label}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: t.color.text, lineHeight: 1.1, margin: "4px 0 2px" }}>{t.count}</div>
              <div style={{ fontSize: 13, color: t.color.text, fontWeight: 500, marginBottom: 6, visibility: t.amount != null ? "visible" : "hidden" }}>
                {t.amount != null ? fmtCur(t.amount) : "placeholder"}
              </div>
              <div style={{ borderTop: `1px solid ${t.color.border}`, marginTop: 8, paddingTop: 8 }}>
                {[["New this week", t.newW], ["New this quarter", t.newQ]].map(([l, v]) => (
                  <div key={String(l)} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                    <span style={{ color: t.color.text }}>{l}</span>
                    <span style={{ fontWeight: 700, color: t.color.text }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                  <span style={{ color: t.color.text }}>Q target</span>
                  <span style={{ fontWeight: 700, color: t.color.text }}>{t.target}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: t.color.text }}>Percent of goal</span>
                  <span style={{ fontWeight: 700, color: t.color.text }}>{t.goalPct}%</span>
                </div>
              </div>
            </div>
            <AssumptionDrawer
              tileKey={t.key}
              assumptions={assumptions}
              hubspotRates={hubspotRates}
              borderColor={t.color.border}
              onSave={onAssumptionsSave}
            />
          </div>
        ))}
      </div>

      {/* Combined Pipeline Progress */}
      {(() => {
        const closedPct   = Math.min(100, closedWonTotal / QUARTERLY_TARGET * 100);
        const wpPct       = Math.min(100 - closedPct, wp / QUARTERLY_TARGET * 100);
        const combinedPct = Math.min(100, (closedWonTotal + wp) / QUARTERLY_TARGET * 100);
        const qLabel      = `Q${qIndex + 1}`;
        return (
          <div style={{ background: "#fff", border: "1px solid #e2e4ed", borderRadius: 12, padding: "18px 20px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ position: "relative", height: 28, background: "#f1f5f9", borderRadius: 999, overflow: "visible", marginBottom: 10 }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${closedPct}%`, background: "#16a34a", borderRadius: wpPct > 0 ? "999px 0 0 999px" : "999px" }} />
              {wpPct > 0 && (
                <div style={{ position: "absolute", top: 0, height: "100%", left: `${closedPct}%`, width: `${wpPct}%`, background: "#93c5fd", borderRadius: combinedPct >= 100 ? "0 999px 999px 0" : "0" }} />
              )}
              <div style={{ position: "absolute", left: `${combinedPct}%`, top: "50%", transform: "translate(-50%, -50%)", background: "#0f1117", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 999, whiteSpace: "nowrap", fontFamily: "'DM Sans', system-ui, sans-serif", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}>
                ${Math.round((closedWonTotal + wp) / 1000)}K
              </div>
              <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#94a3b8", fontFamily: "'DM Sans', system-ui, sans-serif", paddingRight: 4 }}>
                {fmtCur(QUARTERLY_TARGET)}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "#16a34a", flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#16a34a", fontFamily: "'DM Sans', system-ui, sans-serif" }}>${Math.round(closedWonTotal / 1000)}K</span>
                  <span style={{ fontSize: 11, color: "#8b90a0", marginLeft: 5, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Closed Won {qLabel} · {closedWon.length} deals · {Math.round(closedPct)}% of goal</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "#93c5fd", flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", fontFamily: "'DM Sans', system-ui, sans-serif" }}>${Math.round(wp / 1000)}K</span>
                  <span style={{ fontSize: 11, color: "#8b90a0", marginLeft: 5, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Weighted Pipeline · {Math.round(combinedPct)}% combined</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Signs of Life */}
      <TableCard>
        <TableCardHeader>
          <span>🔥 Heating Up - pour gas on these <span style={{ color: "#b0b5c3", fontWeight: 400, fontSize: 12 }}>— prospect-side activity in last 7 days</span></span>
        </TableCardHeader>
        {solRows.length === 0 ? (
          <div style={{ padding: "16px 18px", color: "#b0b5c3", fontSize: 13 }}>No signals this week.</div>
        ) : (
          <DealTable deals={solRows.map(r => r.deal)} mode="sol" closePlans={closePlans} emailSignals={emailSignals} now={now} qStart={qStart} weekAgo={weekAgo} />
        )}
      </TableCard>

      {/* Needs Action */}
      <TableCard>
        <TableCardHeader><span>⚠️ Needs Action</span></TableCardHeader>
        {naAlerts.length === 0 ? (
          <div style={{ padding: "16px 18px", color: "#b0b5c3", fontSize: 13 }}>All clear.</div>
        ) : (
          <DealTable deals={naAlerts.map(a => a.deal)} mode="needs-action" closePlans={closePlans} now={now} qStart={qStart} weekAgo={weekAgo} />
        )}
      </TableCard>

      {/* Closed Won */}
      <TableCard>
        <TableCardHeader><span>✅ Closed Won Q{qIndex + 1}</span></TableCardHeader>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Company", "Channel", "Amount", "Close Date", "Owner"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
          <tbody>
            {closedWon.map(d => (
              <tr key={d.id} className="table-row-hover" style={{ borderBottom: "1px solid #f4f5f8" }}>
                <TD><DealLink id={d.id} name={d.name} /></TD>
                <TD style={{ color: "#374151" }}>{d.channel ?? "—"}</TD>
                <TD style={{ fontWeight: 600, color: "#15803d" }}>{fmtCur(d.amount)}</TD>
                <TD><CloseDateBadge dateStr={d.closedate} now={now} /></TD>
                <TD style={{ color: "#374151" }}>
                  {ownerName(d.owner)}
                  {UNRESOLVED_OWNER_IDS.has(d.owner) && <UnresolvedOwnerBadge />}
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {/* Methodology */}
      <MethodologyPanel assumptions={assumptions} derived={derived} qIndex={qIndex} onSave={onAssumptionsSave} />
    </div>
  );
}

// ── ASSUMPTION DRAWER ─────────────────────────────────────────────────────────

interface AssumptionDrawerProps {
  tileKey: TabId;
  assumptions: Assumptions;
  hubspotRates: HubSpotRates | null;
  borderColor: string;
  onSave: (a: Assumptions) => Promise<void>;
}

function AssumptionDrawer({ tileKey, assumptions, hubspotRates, borderColor, onSave }: AssumptionDrawerProps) {
  const [open, setOpen]       = useState(false);
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

  const derived       = deriveTargets(assumptions, Math.floor(new Date().getMonth() / 3));
  const legalNeeded   = derived.combinedLegalTarget;
  const propNeeded    = derived.combinedPropTarget;
  const demoNeeded    = derived.combinedDemoTarget;

  const rows: { label: string; value: string | number; field: keyof Assumptions | null }[] = (() => {
    switch (tileKey) {
      case "legal": return [
        { label: "Deals to close this quarter (NB + Expansion)", value: derived.qCloses + derived.expansionQCloses, field: null },
        { label: "% of Legal deals that close",                  value: `${assumptions.legal_to_close}%`,           field: "legal_to_close" },
      ];
      case "proposal": return [
        { label: "Legal deals needed this quarter",              value: legalNeeded,                                field: null },
        { label: "% of Proposal deals that progress to Legal",   value: `${assumptions.prop_to_legal}%`,            field: "prop_to_legal" },
      ];
      case "demo": return [
        { label: "Proposal deals needed this quarter",           value: propNeeded,                                 field: null },
        { label: "% of Demo deals that convert to Proposal",     value: `${assumptions.demo_to_prop}%`,             field: "demo_to_prop" },
      ];
      case "discovery": return [
        { label: "Demo deals needed this quarter",               value: demoNeeded,                                 field: null },
        { label: "% of Discovery deals that convert to Demo",    value: `${assumptions.disc_to_demo}%`,             field: "disc_to_demo" },
      ];
      default: return [];
    }
  })();
  
  const editableFields: (keyof Assumptions)[] = (() => {
    switch (tileKey) {
      case "legal":     return ["legal_to_close"];
      case "proposal":  return ["prop_to_legal"];
      case "demo":      return ["demo_to_prop"];
      case "discovery": return ["disc_to_demo"];
      default: return [];
    }
  })();

  const fieldLabel = (f: keyof Assumptions): string => ({
    legal_to_close: "% Legal → Close",
    prop_to_legal:  "% Proposal → Legal",
    demo_to_prop:   "% Demo → Proposal",
    disc_to_demo:   "% Discovery → Demo",
  } as Record<string, string>)[f as string] ?? String(f);

  const sourceLabel = (field: keyof Assumptions) => {
    if (!hubspotRates) return "Source: HubSpot historical data";
    const hsVal = hubspotRates[field as keyof HubSpotRates];
    const curVal = assumptions[field];
    if (hsVal === null || hsVal === undefined) return "Source: HubSpot historical data";
    return hsVal === curVal ? "Source: HubSpot historical data" : "Manually entered";
  };

  return (
    <div style={{ border: `1.5px solid ${borderColor}`, borderTop: "none", borderRadius: "0 0 12px 12px", background: "#fff", overflow: "hidden" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#94a3b8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <span>Assumptions</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          {editing && tmp ? (
            <div>
              {editableFields.map(field => (
                <div key={field} style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 3, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{fieldLabel(field)}</label>
                  <input type="number" value={tmp[field] as number}
                    onChange={e => setTmp({ ...tmp, [field]: +e.target.value })}
                    style={{ width: "100%", padding: "4px 8px", border: "1px solid #e2e4ed", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans', system-ui, sans-serif" }} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
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
              {rows.map(({ label, value, field }) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: 12, fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300, color: "#374151" }}>
                    <span style={{ flex: 1, paddingRight: 8 }}>{label}</span>
                    <span style={{ fontWeight: 500, color: "#0f1117", whiteSpace: "nowrap" }}>{value}</span>
                  </div>
                  {field && (
                    <div style={{ fontSize: 10, color: "#b0b5c3", marginTop: 2, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{sourceLabel(field)}</div>
                  )}
                </div>
              ))}
              <button onClick={() => { setEditing(true); setTmp(JSON.parse(JSON.stringify(assumptions))); }}
                style={{ marginTop: 4, background: "#f8fafc", color: "#64748b", border: "1px solid #e2e4ed", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                Edit
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── METHODOLOGY PANEL ─────────────────────────────────────────────────────────

const HISTORICAL_AVG_DEAL_VALUE = 62137; // trailing 12m from HubSpot — updated by Recalculate

function MethodologyPanel({ assumptions, derived, qIndex, onSave }: {
  assumptions: Assumptions;
  derived: ReturnType<typeof deriveTargets>;
  qIndex: number;
  onSave: (a: Assumptions) => Promise<void>;
}) {
  const fmtK    = (n: number) => "$" + Math.round(n / 1000) + "K";
  const fmtFull = (n: number) => "$" + n.toLocaleString();

  const [editingAvg, setEditingAvg] = useState(false);
  const [tmpAvg, setTmpAvg]         = useState<number>(assumptions.avg_deal_value);
  const [saving, setSaving]         = useState(false);

  const handleSaveAvg = async () => {
    setSaving(true);
    await onSave({ ...assumptions, avg_deal_value: tmpAvg });
    setSaving(false);
    setEditingAvg(false);
  };

  return (
    <TableCard>
      <details>
        <summary style={{ padding: "12px 18px", cursor: "pointer", fontWeight: 700, fontSize: 14, listStyle: "none", display: "flex", justifyContent: "space-between" }}>
          <span>📊 Methodology</span>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 400 }}>expand ▼</span>
        </summary>
        <div style={{ padding: "0 18px 18px" }}>

          {/* Average Deal Value */}
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
            {editingAvg ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Avg Deal Value</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>$</span>
                    <input type="number" value={tmpAvg} onChange={e => setTmpAvg(+e.target.value)}
                      style={{ width: 110, padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans', system-ui, sans-serif" }} />
                  </div>
                  <button onClick={handleSaveAvg} disabled={saving}
                    style={{ background: "linear-gradient(135deg, #a0fad7, #82f6c6)", color: "#0a2e1f", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button onClick={() => { setEditingAvg(false); setTmpAvg(assumptions.avg_deal_value); }}
                    style={{ background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    Cancel
                  </button>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>12-month rolling avg </span>
                  <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{fmtFull(HISTORICAL_AVG_DEAL_VALUE)}</span>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#374151", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Avg Deal Value</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{fmtFull(assumptions.avg_deal_value)}</span>
                  <button onClick={() => { setEditingAvg(true); setTmpAvg(assumptions.avg_deal_value); }}
                    style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e4ed", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    Edit
                  </button>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>12-month rolling avg </span>
                  <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>{fmtFull(HISTORICAL_AVG_DEAL_VALUE)}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 128, flexWrap: "wrap" }}>

            {/* Quarterly Revenue Targets */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#374151", marginBottom: 6 }}>Quarterly Revenue Targets</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 4, paddingBottom: 4, borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ width: 28 }}>Q</span>
                <span style={{ flex: 1, textAlign: "right" }}>Total</span>
                <span style={{ flex: 1, textAlign: "right" }}>NB (⅔)</span>
                <span style={{ flex: 1, textAlign: "right" }}>Expansion (⅓)</span>
              </div>
              {QUARTERLY_TARGETS.map((total, i) => {
                const nb  = Math.round(total * NB_REVENUE_SHARE);
                const exp = total - nb;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span style={{ width: 28, color: "#374151", fontWeight: i === qIndex ? 700 : 400 }}>Q{i + 1}</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: i === qIndex ? 700 : 400 }}>{fmtK(total)}</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: i === qIndex ? 700 : 400 }}>{fmtK(nb)}</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: i === qIndex ? 700 : 400 }}>{fmtK(exp)}</span>
                  </div>
                );
              })}
              {(() => {
                const totalAll = QUARTERLY_TARGETS.reduce((s, v) => s + v, 0);
                const totalNB  = QUARTERLY_TARGETS.reduce((s, v) => s + Math.round(v * NB_REVENUE_SHARE), 0);
                const totalExp = totalAll - totalNB;
                return (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4, paddingTop: 4, borderTop: "1px solid #f1f5f9" }}>
                    <span style={{ width: 28, color: "#374151", fontWeight: 700 }}>Total</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: 700 }}>{fmtK(totalAll)}</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: 700 }}>{fmtK(totalNB)}</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: 700 }}>{fmtK(totalExp)}</span>
                  </div>
                );
              })()}
            </div>

            {/* Quarterly Close Targets */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#374151", marginBottom: 6 }}>Quarterly Close Targets</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 4, paddingBottom: 4, borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ width: 28 }}>Q</span>
                <span style={{ flex: 1, textAlign: "right" }}>NB Closes</span>
                <span style={{ flex: 1, textAlign: "right" }}>Exp Closes</span>
              </div>
              {QUARTERLY_TARGETS.map((_, i) => {
                const qd = deriveTargets(assumptions, i);
                const isCurrent = i === qIndex;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span style={{ width: 28, color: "#374151", fontWeight: isCurrent ? 700 : 400 }}>Q{i + 1}</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: isCurrent ? 700 : 400 }}>{qd.qCloses}</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: isCurrent ? 700 : 400 }}>{qd.expansionQCloses}</span>
                  </div>
                );
              })}
              {(() => {
                const totalNB  = QUARTERLY_TARGETS.reduce((s, _, i) => s + deriveTargets(assumptions, i).qCloses, 0);
                const totalExp = QUARTERLY_TARGETS.reduce((s, _, i) => s + deriveTargets(assumptions, i).expansionQCloses, 0);
                return (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4, paddingTop: 4, borderTop: "1px solid #f1f5f9" }}>
                    <span style={{ width: 28, color: "#374151", fontWeight: 700 }}>Total</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: 700 }}>{totalNB}</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: 700 }}>{totalExp}</span>
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      </details>
    </TableCard>
  );
}
