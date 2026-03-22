// components/tabs/DiscoveryTab.tsx

"use client";

import { useState } from "react";
import type { Deal, Assumptions } from "@/types/deals";
import { NB_CHANNELS, earliestStageEntry } from "@/lib/deals";
import { deriveTargets, QUARTERLY_REVENUE_TARGET, type DerivedTargets } from "@/lib/assumptions";
import { isStale } from "@/lib/flags";
import { TableCard } from "@/components/Table";
import PacingTable from "@/components/PacingTable";
import DealTable from "@/components/DealTable";
import StatCard from "@/components/StatCard";
import type { PipelineCounts } from "@/app/page";

const NB = ["Outbound", "Events", "Partnership", "Inbound"] as const;
const fmtK = (n: number) => "$" + Math.round(n / 1000) + "K";

interface DiscoveryTabProps {
  deals: Deal[];
  allActive: Deal[];
  assumptions: Assumptions;
  onAssumptionsSave: (a: Assumptions) => Promise<void>;
  now: Date;
  weekAgo: Date;
  qStart: Date;
  counts: PipelineCounts;
}

export default function DiscoveryTab({
  deals, allActive, assumptions, onAssumptionsSave, now, weekAgo, qStart, counts,
}: DiscoveryTabProps) {
  const derived     = deriveTargets(assumptions);
  const { expansionQTarget, nbTargets, channelQTargets } = derived;
  const discQTarget = Object.values(channelQTargets).reduce((s, v) => s + v, 0);

  const sorted    = [...deals].sort((a, b) =>
    new Date(b.entered_current || "").getTime() - new Date(a.entered_current || "").getTime()
  );
  const staleCount = deals.filter(d => isStale(d, now)).length;
  const { discNewW: newThisWeek, discNewQ: newThisQ, qElapsedPct } = counts;
  const goalPct = discQTarget > 0 ? Math.round((newThisQ / discQTarget) * 100) : 0;
  const pacePct = discQTarget > 0 && qElapsedPct > 0
    ? Math.round((newThisQ / discQTarget) / qElapsedPct * 100) : 0;

  const nbActuals: Record<string, number> = {};
  for (const ch of NB) {
    nbActuals[ch] = allActive.filter(d => {
      if (d.channel !== ch) return false;
      const e = earliestStageEntry(d);
      return e ? new Date(e) >= qStart : false;
    }).length;
  }
  const expansionActual = allActive.filter(d => {
    if (d.channel !== "Expansion") return false;
    const e = earliestStageEntry(d);
    return e ? new Date(e) >= qStart : false;
  }).length;

  return (
    <div>
      {/* Summary cards */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Currently in Discovery" value={deals.length} />
        <StatCard label="New This Week"           value={newThisWeek} />
        <StatCard
          label="New This Quarter"
          value={newThisQ}
          target={discQTarget}
          goalPct={goalPct}
          pacePct={pacePct}
        />
        <StatCard label="Stale >60 days" value={staleCount} />
      </div>

      {/* New Business Pacing + attached assumptions drawer */}
      <PacingTable
        title="New Business Pacing — Q1"
        channels={[...NB]}
        targets={nbTargets}
        actuals={nbActuals}
        squareBottom
      />
      <NBAssumptionsDrawer
        assumptions={assumptions}
        derived={derived}
        onSave={onAssumptionsSave}
      />

      {/* Upsell Pacing + attached assumptions drawer */}
      <div style={{ marginTop: 14 }}>
        <PacingTable
          title="Upsell Pacing — Q1"
          channels={["Expansion"]}
          targets={{ Expansion: expansionQTarget }}
          actuals={{ Expansion: expansionActual }}
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
            deals={sorted}
            mode="standard"
            now={now}
            qStart={qStart}
            weekAgo={weekAgo}
            enteredDateFn={d => d.entered_discovery || d.entered_current}
            hiddenColumns={["amount", "closeDate", "closePlan"]}
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

  // Derive live annual closes per channel from tmp (for live preview in edit mode)
  const annualCloses = (a: Assumptions) => {
    const annualRevenue = QUARTERLY_REVENUE_TARGET * 4;
    const result: Record<string, number> = {};
    for (const ch of NB) {
      result[ch] = (annualRevenue * (a.ch[ch] / 100)) / a.avg_deal_value;
    }
    return result;
  };

  const THc = ({ children }: { children: React.ReactNode }) => (
    <th style={{ padding: "6px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {children}
    </th>
  );
  const TDc = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <td style={{ padding: "7px 12px", fontSize: 12, color: "#374151", fontFamily: "'DM Sans', system-ui, sans-serif", ...style }}>
      {children}
    </td>
  );

  return (
    <DrawerShell>
      {editing && tmp ? (() => {
        const liveCloses = annualCloses(tmp);
        return (
          <div>
            {/* Avg Deal Size — above table, single shared field */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#374151", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                Avg Deal Size
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>$</span>
                <input
                  type="number"
                  value={tmp.avg_deal_value}
                  onChange={e => setTmp({ ...tmp, avg_deal_value: +e.target.value })}
                  style={{ width: 100, padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans', system-ui, sans-serif" }}
                />
              </div>
            </div>
            {/* Table */}
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
                {NB.map(ch => (
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
                ))}
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
        );
      })() : (
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Avg deal size: <strong style={{ color: "#374151" }}>{fmtK(assumptions.avg_deal_value)}</strong>
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

  // Live derived values for edit preview
  const liveQCloses = (a: Assumptions) =>
    Math.ceil(a.expansion_q_revenue_target / a.expansion_avg_deal_size);
  const liveQTarget = (a: Assumptions) =>
    Math.ceil(liveQCloses(a) / (a.expansion_close_rate / 100));

  const THc = ({ children }: { children: React.ReactNode }) => (
    <th style={{ padding: "6px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {children}
    </th>
  );
  const TDc = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <td style={{ padding: "7px 12px", fontSize: 12, color: "#374151", fontFamily: "'DM Sans', system-ui, sans-serif", ...style }}>
      {children}
    </td>
  );

  return (
    <DrawerShell>
      {editing && tmp ? (
        <div>
          {/* Editable inputs above table */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Q Revenue Target
              <span style={{ fontSize: 12, color: "#64748b" }}>$</span>
              <input type="number" value={tmp.expansion_q_revenue_target}
                onChange={e => setTmp({ ...tmp, expansion_q_revenue_target: +e.target.value })}
                style={{ width: 100, padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans', system-ui, sans-serif" }} />
            </label>
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
          {/* Table */}
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
                <TDc style={{ color: "#94a3b8" }}>{fmtK(tmp.expansion_q_revenue_target)}</TDc>
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
            Q target: <strong style={{ color: "#374151" }}>{fmtK(assumptions.expansion_q_revenue_target)}</strong>
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
                <TDc style={{ color: "#94a3b8" }}>{fmtK(assumptions.expansion_q_revenue_target)}</TDc>
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
