// components/tabs/OverviewTab.tsx 

"use client";

import { useMemo, useState } from "react";
import type { Deal, ClosedWonDeal, EmailSignalMap, ClosePlanMap, Assumptions } from "@/types/deals";
import { ownerName, fmtDate, fmtCur, daysSince, weightedPipeline, UNRESOLVED_OWNER_IDS } from "@/lib/deals";
import { deriveTargets } from "@/lib/assumptions";
import { getSignsOfLife, getNeedsActionAlerts, opensColor } from "@/lib/flags";
import { TH, TD, TableCard, TableCardHeader } from "@/components/Table";
import { CloseDateBadge, StageBadge, UnresolvedOwnerBadge } from "@/components/Badges";
import DealLink from "@/components/DealLink";
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
  onTabChange: (tab: TabId) => void;
  onAssumptionsSave: (a: Assumptions) => Promise<void>;
}

export default function OverviewTab({
  active, legal, proposal, demo, discovery, closedWon,
  emailSignals, closePlans, assumptions, counts,
  now, weekAgo, qStart, onTabChange, onAssumptionsSave,
}: OverviewTabProps) {
  const derived = deriveTargets(assumptions);
  const { legalTarget, propTarget, demoTarget, channelQTargets } = derived;
  const discTarget = Object.values(channelQTargets).reduce((s, v) => s + v, 0);

  const { discNewW, discNewQ, demoNewW, demoNewQ, propNewW, propNewQ, legalNewW, legalNewQ } = counts;

  const legalAmt = legal.reduce((s, d) => s + (d.amount || 0), 0);
  const propAmt  = proposal.reduce((s, d) => s + (d.amount || 0), 0);
  const wp       = weightedPipeline(active);
  const closedWonTotal = closedWon.reduce((s, d) => s + d.amount, 0);
  const QUARTERLY_TARGET = 600000;

  const qTotalDays   = (new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 1).getTime() - qStart.getTime()) / 86400000;
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
    if (ratio >= 0.90) return `You're ${elapsedPct}% through Q1 and have reached ${goalPct}% of your ${label} target — on track.`;
    if (ratio >= 0.75) return `You're ${elapsedPct}% through Q1 and have reached ${goalPct}% of your ${label} target — slightly behind pace.`;
    if (ratio >= 0.50) return `You're ${elapsedPct}% through Q1 and have reached ${goalPct}% of your ${label} target — behind pace.`;
    return `You're ${elapsedPct}% through Q1 and have reached ${goalPct}% of your ${label} target — significantly behind, needs attention.`;
  };

  const tiles = [
    { key: "legal" as TabId,     label: "Legal / Procurement",    count: legal.length,    amount: legalAmt, newW: legalNewW, newQ: legalNewQ, target: legalTarget, actual: legalNewQ },
    { key: "proposal" as TabId,  label: "Proposal / Negotiation", count: proposal.length, amount: propAmt,  newW: propNewW,  newQ: propNewQ,  target: propTarget,  actual: propNewQ  },
    { key: "demo" as TabId,      label: "Meeting / Demo",         count: demo.length,     amount: null,     newW: demoNewW,  newQ: demoNewQ,  target: demoTarget,  actual: demoNewQ  },
    { key: "discovery" as TabId, label: "Discovery",              count: discovery.length,amount: null,     newW: discNewW,  newQ: discNewQ,  target: discTarget,  actual: discNewQ  },
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
            {/* Tile */}
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

            {/* Assumption drawer */}
            <AssumptionDrawer
              tileKey={t.key}
              assumptions={assumptions}
              borderColor={t.color.border}
              onSave={onAssumptionsSave}
            />
          </div>
        ))}
      </div>

      {/* Weighted pipeline + Closed Won */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {[
          { label: "Weighted Pipeline", value: wp,             color: "#2563eb", sub: "vs $600K Q target" },
          { label: "Closed Won YTD",    value: closedWonTotal, color: "#16a34a", sub: `${closedWon.length} deals · vs $600K Q target` },
        ].map(({ label, value, color, sub }) => (
          <div key={label} style={{ flex: 1, minWidth: 200, background: "#fff", border: "1px solid #e2e4ed", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 12, color: "#8b90a0", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color }}>${Math.round(value / 1000)}K</div>
            <div style={{ fontSize: 12, color: "#b0b5c3", marginTop: 2 }}>{sub}</div>
            <div style={{ marginTop: 8, background: "#f1f5f9", borderRadius: 6, height: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, value / QUARTERLY_TARGET * 100)}%`, background: color, borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Signs of Life */}
      <TableCard>
        <TableCardHeader>
          <span>⚡ Signs of Life <span style={{ color: "#b0b5c3", fontWeight: 400, fontSize: 12 }}>— prospect-side activity in last 7 days</span></span>
        </TableCardHeader>
        {solRows.length === 0 ? (
          <div style={{ padding: "16px 18px", color: "#b0b5c3", fontSize: 13 }}>No signals this week.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Company", "Stage", "Owner", "Last Inbound", "Opens 7d", "Clicks 7d", "Last Subject"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {solRows.map(({ deal: d, opens7d, clicks7d, lastInbound, lastSubject, enteredNew }) => (
                <tr key={d.id} className="table-row-hover" style={{ background: lastInbound ? "#f0fdf4" : "white", borderBottom: "1px solid #f4f5f8" }}>
                  <TD><DealLink id={d.id} name={d.name} /></TD>
                  <TD><StageBadge stage={d.stage} /></TD>
                  <TD style={{ color: "#374151" }}>{ownerName(d.owner)}</TD>
                  <TD style={{ color: "#15803d", fontWeight: lastInbound ? 600 : 400 }}>{lastInbound ? fmtDate(lastInbound) : "—"}</TD>
                  <TD style={{ color: opensColor(opens7d), fontWeight: opens7d >= 2 ? 700 : 400 }}>{opens7d > 0 ? opens7d : "—"}</TD>
                  <TD style={{ color: clicks7d > 0 ? "#7c3aed" : "#b0b5c3" }}>{clicks7d > 0 ? clicks7d : "—"}</TD>
                  <TD style={{ color: "#8b90a0", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lastSubject ?? (enteredNew ? "🆕 Entered stage" : "—")}
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>

      {/* Needs Action */}
      <TableCard>
        <TableCardHeader><span>⚠️ Needs Action</span></TableCardHeader>
        {naAlerts.length === 0 ? (
          <div style={{ padding: "16px 18px", color: "#b0b5c3", fontSize: 13 }}>All clear.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Company", "Stage", "Alerts"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {naAlerts.map(({ deal: d, alerts, stageLabel: sl }) => (
                <tr key={d.id} className="table-row-hover" style={{ borderBottom: "1px solid #f4f5f8" }}>
                  <TD><DealLink id={d.id} name={d.name} /></TD>
                  <TD><span style={{ fontSize: 12, fontWeight: 600, color: "#8b90a0" }}>{sl}</span></TD>
                  <TD style={{ lineHeight: 1.8 }}>{alerts.join("  ·  ")}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableCard>

      {/* Closed Won YTD */}
      <TableCard>
        <TableCardHeader><span>✅ Closed Won YTD</span></TableCardHeader>
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
      <MethodologyPanel assumptions={assumptions} derived={derived} />
    </div>
  );
}

// ── ASSUMPTION DRAWER ─────────────────────────────────────────────────────────

interface AssumptionDrawerProps {
  tileKey: TabId;
  assumptions: Assumptions;
  borderColor: string;
  onSave: (a: Assumptions) => Promise<void>;
}

function AssumptionDrawer({ tileKey, assumptions, borderColor, onSave }: AssumptionDrawerProps) {
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

  const legalNeeded = Math.ceil(assumptions.q_closes / (assumptions.legal_to_close / 100));
  const propNeeded  = Math.ceil(legalNeeded / (assumptions.prop_to_legal / 100));
  const demoNeeded  = Math.ceil(propNeeded  / (assumptions.demo_to_prop  / 100));

  const rows: { label: string; value: string | number }[] = (() => {
    switch (tileKey) {
      case "legal": return [
        { label: "Deals to close this quarter",               value: assumptions.q_closes },
        { label: "% of Legal deals that close",               value: `${assumptions.legal_to_close}%` },
      ];
      case "proposal": return [
        { label: "Legal deals needed this quarter",            value: legalNeeded },
        { label: "% of Proposal deals that progress to Legal", value: `${assumptions.prop_to_legal}%` },
      ];
      case "demo": return [
        { label: "Proposal deals needed this quarter",         value: propNeeded },
        { label: "% of Demo deals that convert to Proposal",   value: `${assumptions.demo_to_prop}%` },
      ];
      case "discovery": return [
        { label: "Demo deals needed this quarter",             value: demoNeeded },
        { label: "% of Discovery deals that convert to Demo",  value: `${assumptions.disc_to_demo}%` },
      ];
      default: return [];
    }
  })();

  const editableFields: (keyof Assumptions)[] = (() => {
    switch (tileKey) {
      case "legal":     return ["q_closes", "legal_to_close"];
      case "proposal":  return ["prop_to_legal"];
      case "demo":      return ["demo_to_prop"];
      case "discovery": return ["disc_to_demo"];
      default: return [];
    }
  })();

  const fieldLabel = (f: keyof Assumptions): string => ({
    q_closes:        "Deals to close this quarter",
    legal_to_close:  "% Legal → Close",
    prop_to_legal:   "% Proposal → Legal",
    demo_to_prop:    "% Demo → Proposal",
    disc_to_demo:    "% Discovery → Demo",
  } as Record<string, string>)[f as string] ?? String(f);

  return (
    <div style={{
      border: `1.5px solid ${borderColor}`,
      borderTop: "none",
      borderRadius: "0 0 12px 12px",
      background: "#fff",
      overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 14px",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 11,
          color: "#94a3b8",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        <span>Assumptions</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          {editing && tmp ? (
            <div>
              {editableFields.map(field => (
                <div key={field} style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 3, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    {fieldLabel(field)}
                  </label>
                  <input
                    type="number"
                    value={tmp[field] as number}
                    onChange={e => setTmp({ ...tmp, [field]: +e.target.value })}
                    style={{ width: "100%", padding: "4px 8px", border: "1px solid #e2e4ed", borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans', system-ui, sans-serif" }}
                  />
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
              {rows.map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: 12, marginBottom: 6, fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300, color: "#374151" }}>
                  <span style={{ flex: 1, paddingRight: 8 }}>{label}</span>
                  <span style={{ fontWeight: 500, color: "#0f1117", whiteSpace: "nowrap" }}>{value}</span>
                </div>
              ))}
              <button
                onClick={() => { setEditing(true); setTmp(JSON.parse(JSON.stringify(assumptions))); }}
                style={{ marginTop: 8, background: "#f8fafc", color: "#64748b", border: "1px solid #e2e4ed", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
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

function MethodologyPanel({ assumptions, derived }: { assumptions: Assumptions; derived: ReturnType<typeof deriveTargets> }) {
  const { legalTarget, propTarget, demoTarget, discTarget, expansionQTarget, nbTargets } = derived;
  const NB_CHANNELS = ["Outbound", "Events", "Partnership", "Inbound"];

  return (
    <TableCard>
      <details>
        <summary style={{ padding: "12px 18px", cursor: "pointer", fontWeight: 700, fontSize: 14, listStyle: "none", display: "flex", justifyContent: "space-between" }}>
          <span>📊 Methodology</span>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 400 }}>expand ▼</span>
        </summary>
        <div style={{ padding: "0 18px 18px" }}>
          <div className="flex gap-3 flex-wrap">
            <div style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e4ed", borderRadius: 10, padding: "12px 14px", minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#374151", marginBottom: 6 }}>Q Stage Targets (Derived)</div>
              {[
                ["Legal needed",     legalTarget, `${assumptions.q_closes} closes ÷ ${assumptions.legal_to_close}%`],
                ["Proposal needed",  propTarget,  `${legalTarget} legal ÷ ${assumptions.prop_to_legal}%`],
                ["Demo needed",      demoTarget,  `${propTarget} prop ÷ ${assumptions.demo_to_prop}%`],
                ["Discovery needed", discTarget,  `${demoTarget} demo ÷ ${assumptions.disc_to_demo}%`],
              ].map(([k, v, d]) => (
                <div key={String(k)} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "#374151" }}>{k}</span>
                    <span style={{ fontWeight: 700 }}>{v}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{d}</div>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e4ed", borderRadius: 10, padding: "12px 14px", minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#374151", marginBottom: 6 }}>Q Channel Targets (New Business Discovery)</div>
              {NB_CHANNELS.map(ch => (
                <div key={ch} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: "#374151" }}>{ch}</span>
                  <span style={{ color: "#64748b" }}>{assumptions.annual_closes[ch as keyof typeof assumptions.annual_closes]} annual closes → <strong style={{ color: "#0f172a" }}>{nbTargets[ch]}</strong></span>
                </div>
              ))}
              <div style={{ marginTop: 8, borderTop: "1px solid #e2e4ed", paddingTop: 8, fontSize: 12 }}>
                <div style={{ fontWeight: 600, color: "#374151", marginBottom: 4 }}>Expansion (Upsell)</div>
                <div style={{ color: "#64748b" }}>{assumptions.expansion_annual_deals} annual ÷ 4 ÷ {assumptions.expansion_close_rate}% = <strong style={{ color: "#0f172a" }}>{expansionQTarget}</strong></div>
              </div>
            </div>
            <div style={{ flex: 1, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", minWidth: 160 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#2563eb", marginBottom: 6 }}>Quarterly Close Targets</div>
              {[["Q1", 6], ["Q2", 6], ["Q3", 5], ["Q4", 6]].map(([q, n]) => (
                <div key={String(q)} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                  <span style={{ color: "#1e40af" }}>{q}</span>
                  <span style={{ fontWeight: 700, color: "#2563eb" }}>{n} closes</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>
    </TableCard>
  );
}
