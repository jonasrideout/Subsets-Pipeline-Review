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

  return (
    <DrawerShell>
      {editing && tmp ? (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12, color: "#374151", marginBottom: 8 }}>
            Revenue Share by Channel %
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            {NB.map(ch => (
              <label key={ch} style={{ display: "flex", flexDirection: "column", fontSize: 12, color: "#374151", gap: 3, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                {ch}
                <input
                  type="number"
                  value={tmp.ch[ch]}
                  onChange={e => setTmp({ ...tmp, ch: { ...tmp.ch, [ch]: +e.target.value } })}
                  style={{ width: 60, padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
                />
              </label>
            ))}
          </div>
          <div style={{ fontWeight: 600, fontSize: 12, color: "#374151", marginBottom: 8 }}>
            Avg Deal Value
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <label style={{ display: "flex", flexDirection: "column", fontSize: 12, color: "#374151", gap: 3, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              $
              <input
                type="number"
                value={tmp.avg_deal_value}
                onChange={e => setTmp({ ...tmp, avg_deal_value: +e.target.value })}
                style={{ width: 90, padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
              />
            </label>
          </div>
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
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {/* Revenue Share by Channel — editable input */}
            <div style={{ flex: 1, background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 10, padding: "12px 14px", minWidth: 160 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#0f766e", marginBottom: 6 }}>Revenue Share by Channel</div>
              {NB.map(ch => (
                <div key={ch} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                  <span style={{ color: "#115e59" }}>{ch}</span>
                  <span style={{ fontWeight: 700, color: "#0f766e" }}>{assumptions.ch[ch]}%</span>
                </div>
              ))}
            </div>
            {/* Annual Closes per Channel — derived */}
            <div style={{ flex: 1, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 14px", minWidth: 160 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#15803d", marginBottom: 2 }}>Annual Closes per Channel</div>
              <div style={{ fontSize: 11, color: "#86efac", marginBottom: 6, fontStyle: "italic" }}>
                derived · avg deal {fmtK(assumptions.avg_deal_value)}
              </div>
              {NB.map(ch => (
                <div key={ch} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                  <span style={{ color: "#166534" }}>{ch}</span>
                  <span style={{ fontWeight: 700, color: "#15803d" }}>{derived.annualClosesByChannel[ch]?.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => { setEditing(true); setTmp(JSON.parse(JSON.stringify(assumptions))); }}
            style={{ marginTop: 10, background: "#f8fafc", color: "#64748b", border: "1px solid #e2e4ed", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
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

  return (
    <DrawerShell>
      {editing && tmp ? (
        <div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            {([
              ["expansion_annual_deals", "Annual Deals Needed"],
              ["expansion_close_rate",   "Close Rate %"],
            ] as [keyof Assumptions, string][]).map(([k, label]) => (
              <label key={k} style={{ display: "flex", flexDirection: "column", fontSize: 12, color: "#374151", gap: 3, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                {label}
                <input
                  type="number"
                  value={tmp[k] as number}
                  onChange={e => setTmp({ ...tmp, [k]: +e.target.value })}
                  style={{ width: 80, padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
                />
              </label>
            ))}
          </div>
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
          <div style={{ display: "inline-block", background: "#fefce8", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px", minWidth: 160 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#92400e", marginBottom: 6 }}>Expansion (Upsell)</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2, gap: 24 }}>
              <span style={{ color: "#78350f" }}>Annual deals needed</span>
              <span style={{ fontWeight: 700, color: "#92400e" }}>{assumptions.expansion_annual_deals}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
              <span style={{ color: "#78350f" }}>Close rate</span>
              <span style={{ fontWeight: 700, color: "#92400e" }}>{assumptions.expansion_close_rate}%</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 6, borderTop: "1px solid #fde68a", paddingTop: 6 }}>
              <span style={{ color: "#78350f" }}>Q Discovery target</span>
              <span style={{ fontWeight: 700, color: "#92400e" }}>{derived.expansionQTarget}</span>
            </div>
          </div>
          <button
            onClick={() => { setEditing(true); setTmp(JSON.parse(JSON.stringify(assumptions))); }}
            style={{ marginTop: 10, display: "block", background: "#f8fafc", color: "#64748b", border: "1px solid #e2e4ed", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Edit
          </button>
        </div>
      )}
    </DrawerShell>
  );
}
