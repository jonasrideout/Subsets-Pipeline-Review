// components/tabs/DiscoveryTab.tsx

"use client";

import { useState } from "react";
import type { Deal, Assumptions } from "@/types/deals";
import { ownerName, fmtDate, daysSince, NB_CHANNELS, UNRESOLVED_OWNER_IDS, earliestStageEntry } from "@/lib/deals";
import { deriveTargets } from "@/lib/assumptions";
import { isNewGenuine, isStale } from "@/lib/flags";
import { TH, TD, TableCard } from "@/components/Table";
import { NewQBadge, StaleBadge, UnresolvedOwnerBadge } from "@/components/Badges";
import DealLink from "@/components/DealLink";
import PacingTable from "@/components/PacingTable";
import DealTable from "@/components/DealTable";
import StatCard from "@/components/StatCard";

import type { PipelineCounts } from "@/app/page";

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

  const sorted     = [...deals].sort((a, b) =>
    new Date(b.entered_current || "").getTime() - new Date(a.entered_current || "").getTime()
  );
  const staleCount  = deals.filter(d => isStale(d, now)).length;
  const { discNewW: newThisWeek, discNewQ: newThisQ, qElapsedPct } = counts;
  const goalPct = discQTarget > 0 ? Math.round((newThisQ / discQTarget) * 100) : 0;
  const pacePct = discQTarget > 0 && qElapsedPct > 0 ? Math.round((newThisQ / discQTarget) / qElapsedPct * 100) : 0;

  const nbActuals: Record<string, number> = {};
  for (const ch of [...NB_CHANNELS]) {
    nbActuals[ch] = allActive.filter(d => {
      if (d.channel !== ch) return false;
      const earliest = earliestStageEntry(d);
      return earliest ? new Date(earliest) >= qStart : false;
    }).length;
  }
  const expansionActual = allActive.filter(d => {
    if (d.channel !== "Expansion") return false;
    const earliest = earliestStageEntry(d);
    return earliest ? new Date(earliest) >= qStart : false;
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

      {/* New Business Pacing */}
      <PacingTable
        title="New Business Pacing — Q1"
        channels={[...NB_CHANNELS]}
        targets={nbTargets}
        actuals={nbActuals}
      />

      {/* New Business Assumptions */}
      <NBAssumptionsPanel
        assumptions={assumptions}
        onSave={onAssumptionsSave}
      />

      {/* Upsell Pacing */}
      <PacingTable
        title="Upsell Pacing — Q1"
        channels={["Expansion"]}
        targets={{ Expansion: expansionQTarget }}
        actuals={{ Expansion: expansionActual }}
      />

      {/* Upsell Assumptions */}
      <UpsellAssumptionsPanel
        assumptions={assumptions}
        derived={derived}
        onSave={onAssumptionsSave}
      />

      {/* Main table */}
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
  );
}

// ── SHARED DRAWER SHELL ───────────────────────────────────────────────────────

function AssumptionDrawerShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1.5px solid #e2e4ed", borderRadius: 12, background: "#fff", overflow: "hidden", marginBottom: 12 }}>
      <details>
        <summary style={{
          padding: "8px 14px", cursor: "pointer", listStyle: "none",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 11, color: "#94a3b8", fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>
          <span style={{ fontWeight: 600 }}>Assumptions — {title}</span>
          <span>▼</span>
        </summary>
        <div style={{ padding: "0 14px 14px" }}>
          {children}
        </div>
      </details>
    </div>
  );
}

// ── NEW BUSINESS ASSUMPTIONS ──────────────────────────────────────────────────

const NB = ["Outbound", "Events", "Partnership", "Inbound"] as const;

function NBAssumptionsPanel({ assumptions, onSave }: {
  assumptions: Assumptions;
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
    <AssumptionDrawerShell title="New Business">
      {editing && tmp ? (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12, color: "#374151", marginBottom: 8 }}>Annual Closes per Channel</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            {NB.map(ch => (
              <label key={ch} style={{ display: "flex", flexDirection: "column", fontSize: 12, color: "#374151", gap: 3 }}>
                {ch}
                <input type="number" step="0.1" value={tmp.annual_closes[ch]}
                  onChange={e => setTmp({ ...tmp, annual_closes: { ...tmp.annual_closes, [ch]: +e.target.value } })}
                  style={{ width: 70, padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }} />
              </label>
            ))}
          </div>
          <div style={{ fontWeight: 600, fontSize: 12, color: "#374151", marginBottom: 8 }}>Channel Revenue Share %</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            {NB.map(ch => (
              <label key={ch} style={{ display: "flex", flexDirection: "column", fontSize: 12, color: "#374151", gap: 3 }}>
                {ch}
                <input type="number" value={tmp.ch[ch]}
                  onChange={e => setTmp({ ...tmp, ch: { ...tmp.ch, [ch]: +e.target.value } })}
                  style={{ width: 60, padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }} />
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
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 14px", minWidth: 160 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#15803d", marginBottom: 6 }}>Annual Closes per Channel</div>
              {NB.map(ch => (
                <div key={ch} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                  <span style={{ color: "#166534" }}>{ch}</span>
                  <span style={{ fontWeight: 700, color: "#15803d" }}>{assumptions.annual_closes[ch]}</span>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 10, padding: "12px 14px", minWidth: 160 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#0f766e", marginBottom: 6 }}>Channel Revenue Share</div>
              {NB.map(ch => (
                <div key={ch} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                  <span style={{ color: "#115e59" }}>{ch}</span>
                  <span style={{ fontWeight: 700, color: "#0f766e" }}>{assumptions.ch[ch]}%</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => { setEditing(true); setTmp(JSON.parse(JSON.stringify(assumptions))); }}
            style={{ marginTop: 10, background: "#f8fafc", color: "#64748b", border: "1px solid #e2e4ed", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Edit
          </button>
        </div>
      )}
    </AssumptionDrawerShell>
  );
}

// ── UPSELL ASSUMPTIONS ────────────────────────────────────────────────────────

function UpsellAssumptionsPanel({ assumptions, derived, onSave }: {
  assumptions: Assumptions;
  derived: ReturnType<typeof deriveTargets>;
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
    <AssumptionDrawerShell title="Upsell">
      {editing && tmp ? (
        <div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            {([
              ["expansion_annual_deals", "Annual Deals Needed"],
              ["expansion_close_rate",   "Close Rate %"],
            ] as [keyof Assumptions, string][]).map(([k, label]) => (
              <label key={k} style={{ display: "flex", flexDirection: "column", fontSize: 12, color: "#374151", gap: 3 }}>
                {label}
                <input type="number" value={tmp[k] as number}
                  onChange={e => setTmp({ ...tmp, [k]: +e.target.value })}
                  style={{ width: 80, padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }} />
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
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, background: "#fefce8", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px", minWidth: 160 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#92400e", marginBottom: 6 }}>Expansion (Upsell)</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
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
          </div>
          <button onClick={() => { setEditing(true); setTmp(JSON.parse(JSON.stringify(assumptions))); }}
            style={{ marginTop: 10, background: "#f8fafc", color: "#64748b", border: "1px solid #e2e4ed", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Edit
          </button>
        </div>
      )}
    </AssumptionDrawerShell>
  );
}
