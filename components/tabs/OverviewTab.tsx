// components/tabs/OverviewTab.tsx

"use client";

import { useMemo } from "react";
import type { Deal, ClosedWonDeal, EmailSignalMap, ClosePlanMap, Assumptions } from "@/types/deals";
import { STAGE_COLORS, ownerName, fmtDate, fmtCur, daysSince, weightedPipeline, UNRESOLVED_OWNER_IDS } from "@/lib/deals";
import { deriveTargets } from "@/lib/assumptions";
import { getSignsOfLife, getNeedsActionAlerts, opensColor } from "@/lib/flags";
import { TH, TD, TableCard, TableCardHeader } from "@/components/Table";
import { CloseDateBadge, StageBadge, UnresolvedOwnerBadge } from "@/components/Badges";
import DealLink from "@/components/DealLink";
import type { TabId } from "@/components/TabNav";

interface OverviewTabProps {
  legal: Deal[];
  proposal: Deal[];
  demo: Deal[];
  discovery: Deal[];
  closedWon: ClosedWonDeal[];
  emailSignals: EmailSignalMap;
  closePlans: ClosePlanMap;
  assumptions: Assumptions;
  now: Date;
  weekAgo: Date;
  qStart: Date;
  onTabChange: (tab: TabId) => void;
}

export default function OverviewTab({
  legal, proposal, demo, discovery, closedWon,
  emailSignals, closePlans, assumptions, now, weekAgo, qStart, onTabChange,
}: OverviewTabProps) {
  const derived = deriveTargets(assumptions);
  const { legalTarget, propTarget, demoTarget, discTarget } = derived;

  const allActive = [...legal, ...proposal, ...demo, ...discovery];
  const wp = weightedPipeline(allActive);
  const closedWonTotal = closedWon.reduce((s, d) => s + d.amount, 0);
  const QUARTERLY_TARGET = 600000;

  // New counts
  const newLegalW  = legal.filter(d => new Date(d.entered_legal    || d.entered_current || "") >= weekAgo).length;
  const newLegalQ  = legal.filter(d => new Date(d.entered_legal    || d.entered_current || "") >= qStart).length;
  const newPropW   = proposal.filter(d => new Date(d.entered_proposal || d.entered_current || "") >= weekAgo).length;
  const newPropQ   = proposal.filter(d => new Date(d.entered_proposal || d.entered_current || "") >= qStart).length;
  const newDemoW   = demo.filter(d => { const e = new Date(d.entered_current || ""); return e >= weekAgo && e <= now; }).length;
  const newDemoQ   = demo.filter(d => { const e = new Date(d.entered_current || ""); return e >= qStart && e <= now; }).length;
  const newDiscW   = discovery.filter(d => d.new_genuine && new Date(d.entered_current || "") >= weekAgo).length;
  const newDiscQ   = discovery.filter(d => d.new_genuine && new Date(d.entered_current || "") >= qStart).length;

  const legalAmt = legal.reduce((s, d) => s + (d.amount || 0), 0);
  const propAmt  = proposal.reduce((s, d) => s + (d.amount || 0), 0);

  const tiles = [
    { key: "legal" as TabId,     label: "Legal / Procurement",    count: legal.length,    amount: legalAmt, newW: newLegalW, newQ: newLegalQ, target: legalTarget, color: STAGE_COLORS.legal },
    { key: "proposal" as TabId,  label: "Proposal / Negotiation", count: proposal.length, amount: propAmt,  newW: newPropW,  newQ: newPropQ,  target: propTarget,  color: STAGE_COLORS.proposal },
    { key: "demo" as TabId,      label: "Meeting / Demo",         count: demo.length,     amount: null,     newW: newDemoW,  newQ: newDemoQ,  target: demoTarget,  color: STAGE_COLORS.demo },
    { key: "discovery" as TabId, label: "Discovery",              count: discovery.length,amount: null,     newW: newDiscW,  newQ: newDiscQ,  target: discTarget,  color: STAGE_COLORS.disc },
  ];

  const solRows  = useMemo(() => getSignsOfLife(allActive, emailSignals, now), [allActive, emailSignals, now]);
  const naAlerts = useMemo(() => getNeedsActionAlerts([...legal, ...proposal, ...demo], closePlans, now), [legal, proposal, demo, closePlans, now]);

  return (
    <div>
      {/* Stage tiles */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {tiles.map(t => (
          <div
            key={t.key}
            onClick={() => onTabChange(t.key)}
            style={{ flex: 1, minWidth: 140, background: t.color.bg, border: `1.5px solid ${t.color.border}`, borderRadius: 12, padding: "16px 18px", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: t.color.text, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.label}</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: t.color.accent, lineHeight: 1.1, margin: "4px 0 2px" }}>{t.count}</div>
            {t.amount != null && <div style={{ fontSize: 13, color: t.color.text, fontWeight: 500, marginBottom: 6 }}>{fmtCur(t.amount)}</div>}
            <div style={{ borderTop: `1px solid ${t.color.border}`, marginTop: 8, paddingTop: 8 }}>
              {[["New this week", t.newW], ["New this quarter", t.newQ]] .map(([l, v]) => (
                <div key={String(l)} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                  <span style={{ color: "#64748b" }}>{l}</span>
                  <span style={{ fontWeight: 700, color: t.color.accent }}>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, alignItems: "center" }}>
                <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 3 }}>
                  Q target
                  <span title="Derived from funnel math — see Methodology" style={{ cursor: "help", fontSize: 11, opacity: 0.6 }}>ℹ️</span>
                </span>
                <span style={{ fontWeight: 700, color: t.color.accent }}>{t.target}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Weighted pipeline + Closed Won */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Weighted Pipeline", value: wp,             color: "#2563eb", sub: "vs $600K Q target" },
          { label: "Closed Won YTD",    value: closedWonTotal, color: "#16a34a", sub: `${closedWon.length} deals · vs $600K Q target` },
        ].map(({ label, value, color, sub }) => (
          <div key={label} style={{ flex: 1, minWidth: 200, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color }}>${Math.round(value / 1000)}K</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{sub}</div>
            <div style={{ marginTop: 8, background: "#f1f5f9", borderRadius: 6, height: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, value / QUARTERLY_TARGET * 100)}%`, background: color, borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Signs of Life */}
      <TableCard>
        <TableCardHeader>
          <span>⚡ Signs of Life <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 12 }}>— prospect-side activity in last 7 days</span></span>
        </TableCardHeader>
        {solRows.length === 0 ? (
          <div style={{ padding: "16px 18px", color: "#94a3b8", fontSize: 13 }}>No signals this week.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Company", "Stage", "Owner", "Last Inbound", "Opens 7d", "Clicks 7d", "Last Subject"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {solRows.map(({ deal: d, opens7d, clicks7d, lastInbound, lastSubject, enteredNew }) => {
                const rowBg = lastInbound ? "#f0fdf4" : "white";
                return (
                  <tr key={d.id} style={{ background: rowBg, borderBottom: "1px solid #f1f5f9" }}>
                    <TD><DealLink id={d.id} name={d.name} /></TD>
                    <TD><StageBadge stage={d.stage} /></TD>
                    <TD style={{ color: "#374151" }}>{ownerName(d.owner)}</TD>
                    <TD style={{ color: "#15803d", fontWeight: lastInbound ? 600 : 400 }}>
                      {lastInbound ? fmtDate(lastInbound) : "—"}
                    </TD>
                    <TD style={{ color: opensColor(opens7d), fontWeight: opens7d >= 2 ? 700 : 400 }}>
                      {opens7d > 0 ? opens7d : "—"}
                    </TD>
                    <TD style={{ color: clicks7d > 0 ? "#7c3aed" : "#94a3b8" }}>
                      {clicks7d > 0 ? clicks7d : "—"}
                    </TD>
                    <TD style={{ color: "#64748b", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lastSubject ?? (enteredNew ? "🆕 Entered stage" : "—")}
                    </TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableCard>

      {/* Needs Action */}
      <TableCard>
        <TableCardHeader><span>⚠️ Needs Action</span></TableCardHeader>
        {naAlerts.length === 0 ? (
          <div style={{ padding: "16px 18px", color: "#94a3b8", fontSize: 13 }}>All clear.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Company", "Stage", "Alerts"].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {naAlerts.map(({ deal: d, alerts, stageLabel: sl }) => (
                <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <TD><DealLink id={d.id} name={d.name} /></TD>
                  <TD><span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>{sl}</span></TD>
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
              <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
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
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {/* Stage targets */}
            <div style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#374151", marginBottom: 6 }}>Q Stage Targets (Derived)</div>
              {[
                ["Legal needed",     legalTarget, `${assumptions.q_closes} closes ÷ ${assumptions.legal_to_close}%`],
                ["Proposal needed",  propTarget,  `${assumptions.q_closes} closes ÷ ${assumptions.prop_to_close}%`],
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
            {/* Channel targets */}
            <div style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#374151", marginBottom: 6 }}>Q Channel Targets (New Business Discovery)</div>
              {NB_CHANNELS.map(ch => (
                <div key={ch} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: "#374151" }}>{ch}</span>
                  <span style={{ color: "#64748b" }}>{discTarget} × {assumptions.ch[ch as keyof typeof assumptions.ch]}% = <strong style={{ color: "#0f172a" }}>{nbTargets[ch]}</strong></span>
                </div>
              ))}
              <div style={{ marginTop: 8, borderTop: "1px solid #e2e8f0", paddingTop: 8, fontSize: 12 }}>
                <div style={{ fontWeight: 600, color: "#374151", marginBottom: 4 }}>Expansion (Upsell)</div>
                <div style={{ color: "#64748b" }}>{assumptions.expansion_annual_deals} annual ÷ 4 ÷ {assumptions.expansion_close_rate}% = <strong style={{ color: "#0f172a" }}>{expansionQTarget}</strong></div>
              </div>
            </div>
            {/* Quarterly close targets */}
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
