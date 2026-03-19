// components/tabs/DiscoveryTab.tsx

"use client";

import { useState } from "react";
import type { Deal, Assumptions } from "@/types/deals";
import { ownerName, fmtDate, daysSince, NB_CHANNELS, CHANNEL_Q_TARGETS, UNRESOLVED_OWNER_IDS } from "@/lib/deals";
import { deriveTargets, DEFAULT_ASSUMPTIONS } from "@/lib/assumptions";
import { isNewGenuine, isStale } from "@/lib/flags";
import { TH, TD, TableCard, TableCardHeader } from "@/components/Table";
import { FlagBadge, UnresolvedOwnerBadge } from "@/components/Badges";
import DealLink from "@/components/DealLink";
import WindowToggle, { type WindowValue } from "@/components/WindowToggle";
import PacingTable from "@/components/PacingTable";

interface DiscoveryTabProps {
  deals: Deal[];
  assumptions: Assumptions;
  onAssumptionsSave: (a: Assumptions) => Promise<void>;
  now: Date;
  weekAgo: Date;
  qStart: Date;
}

export default function DiscoveryTab({
  deals, assumptions, onAssumptionsSave, now, weekAgo, qStart,
}: DiscoveryTabProps) {
  const [window, setWindow]         = useState<WindowValue>("week");
  const [editing, setEditing]       = useState(false);
  const [tmp, setTmp]               = useState<Assumptions | null>(null);
  const [saving, setSaving]         = useState(false);

  const windowStart = window === "week" ? weekAgo : qStart;
  const derived     = deriveTargets(assumptions);
  const { discTarget, expansionQTarget, nbTargets } = derived;

  const sorted     = [...deals].sort((a, b) =>
    new Date(b.entered_current || "").getTime() - new Date(a.entered_current || "").getTime()
  );
  const staleCount = deals.filter(d => isStale(d, now)).length;
  const newWeek    = deals.filter(d => isNewGenuine(d, weekAgo, now)).length;

  // Actuals for pacing — genuine new deals entered since Q start
  const nbActuals: Record<string, number> = {};
  for (const ch of [...NB_CHANNELS]) {
    nbActuals[ch] = deals.filter(d => d.channel === ch && isNewGenuine(d, qStart, now)).length;
  }
  const expansionActual = deals.filter(d => d.channel === "Expansion" && isNewGenuine(d, qStart, now)).length;

  const handleSave = async () => {
    if (!tmp) return;
    setSaving(true);
    await onAssumptionsSave(tmp);
    setSaving(false);
    setEditing(false);
    setTmp(null);
  };

  return (
    <div>
      {/* Window toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <WindowToggle value={window} onChange={setWindow} color="#7c3aed" />
      </div>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          ["Total in Discovery", deals.length,  "#7c3aed"],
          ["New This Week (genuine)", newWeek,   "#2563eb"],
          ["Stale >60 days", staleCount,         "#dc2626"],
        ].map(([label, val, color]) => (
          <div key={String(label)} style={{ flex: 1, minWidth: 120, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 16px" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: String(color) }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Pacing tables */}
      <PacingTable
        title="New Business Pacing — Q1"
        channels={[...NB_CHANNELS]}
        targets={CHANNEL_Q_TARGETS}
        actuals={nbActuals}
      />
      <PacingTable
        title="Upsell Pacing — Q1"
        channels={["Expansion"]}
        targets={{ Expansion: expansionQTarget }}
        actuals={{ Expansion: expansionActual }}
      />

      {/* Main table */}
      <TableCard>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Company", "Channel", "Owner", "Entered Discovery", "Days in Stage", "Flag"].map(h => (
                <TH key={h}>{h}</TH>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(d => {
              const genuineNew = isNewGenuine(d, windowStart, now);
              const stale      = isStale(d, now);
              const daysIn     = daysSince(d.entered_current, now);
              const rowBg      = stale ? "#fff5f5" : "white";

              return (
                <tr key={d.id} style={{ background: rowBg, borderBottom: "1px solid #f1f5f9" }}>
                  <TD><DealLink id={d.id} name={d.name} /></TD>
                  <TD style={{ color: d.channel ? "#374151" : "#f59e0b" }}>
                    {d.channel ?? "⚠ missing"}
                  </TD>
                  <TD style={{ color: "#374151" }}>
                    {ownerName(d.owner)}
                    {UNRESOLVED_OWNER_IDS.has(d.owner) && <UnresolvedOwnerBadge />}
                  </TD>
                  <TD style={{ color: "#64748b" }}>{fmtDate(d.entered_current)}</TD>
                  <TD style={{ color: stale ? "#dc2626" : "#374151", fontWeight: stale ? 700 : 400 }}>
                    {daysIn != null ? `${daysIn}d` : "—"}
                  </TD>
                  <TD>
                    {genuineNew && <FlagBadge type="new" />}
                    {stale      && <FlagBadge type="stale" />}
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>

      {/* Assumptions panel */}
      <AssumptionsPanel
        assumptions={assumptions}
        derived={derived}
        editing={editing}
        tmp={tmp}
        saving={saving}
        onEdit={() => { setEditing(true); setTmp(JSON.parse(JSON.stringify(assumptions))); }}
        onCancel={() => { setEditing(false); setTmp(null); }}
        onSave={handleSave}
        onTmpChange={setTmp}
      />
    </div>
  );
}

// ── ASSUMPTIONS PANEL ─────────────────────────────────────────────────────────

interface AssumptionsPanelProps {
  assumptions: Assumptions;
  derived: ReturnType<typeof deriveTargets>;
  editing: boolean;
  tmp: Assumptions | null;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onTmpChange: (a: Assumptions) => void;
}

function AssumptionsPanel({ assumptions, derived, editing, tmp, saving, onEdit, onCancel, onSave, onTmpChange }: AssumptionsPanelProps) {
  const NB_CHANNELS_LIST = ["Outbound", "Events", "Partnership", "Inbound"];

  return (
    <TableCard>
      <details>
        <summary style={{ padding: "12px 18px", cursor: "pointer", fontWeight: 700, fontSize: 14, listStyle: "none", display: "flex", justifyContent: "space-between" }}>
          <span>📐 Assumptions</span>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 400 }}>expand ▼</span>
        </summary>
        <div style={{ padding: "0 18px 18px" }}>
          {editing && tmp ? (
            <div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                {([
                  ["disc_to_demo",            "Disc→Demo %"],
                  ["demo_to_prop",            "Demo→Prop %"],
                  ["prop_to_close",           "Prop→Close %"],
                  ["legal_to_close",          "Legal→Close %"],
                  ["q_closes",                "Q Closes Target"],
                  ["expansion_annual_deals",  "Expansion Annual Deals"],
                  ["expansion_close_rate",    "Expansion Close Rate %"],
                ] as [keyof Assumptions, string][]).map(([k, label]) => (
                  <label key={k} style={{ display: "flex", flexDirection: "column", fontSize: 12, color: "#374151", gap: 3 }}>
                    {label}
                    <input
                      type="number"
                      value={tmp[k] as number}
                      onChange={e => onTmpChange({ ...tmp, [k]: +e.target.value })}
                      style={{ width: 80, padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
                    />
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                {([...NB_CHANNELS_LIST, "Expansion"] as (keyof typeof tmp.ch)[]).map(ch => (
                  <label key={ch} style={{ display: "flex", flexDirection: "column", fontSize: 12, color: "#374151", gap: 3 }}>
                    {ch} %
                    <input
                      type="number"
                      value={tmp.ch[ch]}
                      onChange={e => onTmpChange({ ...tmp, ch: { ...tmp.ch, [ch]: +e.target.value } })}
                      style={{ width: 60, padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
                    />
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onSave} disabled={saving}
                  style={{ background: "#00c896", color: "#1a1f36", border: "none", borderRadius: 6, padding: "7px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  {saving ? "Saving…" : "Save & Recalculate"}
                </button>
                <button onClick={onCancel}
                  style={{ background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 6, padding: "7px 16px", cursor: "pointer", fontSize: 13 }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {/* Funnel rates */}
                <div style={{ flex: 1, background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 10, padding: "12px 14px", minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#7c3aed", marginBottom: 6 }}>Funnel Conversion Rates</div>
                  {([
                    ["Discovery→Demo",   assumptions.disc_to_demo  + "%", "*"],
                    ["Demo→Proposal",    assumptions.demo_to_prop  + "%", "†"],
                    ["Proposal→Close",   assumptions.prop_to_close + "%", "†"],
                    ["Legal→Close",      assumptions.legal_to_close + "%", "†"],
                  ] as [string, string, string][]).map(([k, v, m]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                      <span style={{ color: "#6b21a8" }}>{k}</span>
                      <span style={{ fontWeight: 700, color: "#7c3aed" }}>{v}<sup>{m}</sup></span>
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: "#a78bfa", marginTop: 6 }}>* Manual estimate · † HubSpot historical</div>
                </div>
                {/* Channel revenue share */}
                <div style={{ flex: 1, background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 10, padding: "12px 14px", minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#0f766e", marginBottom: 6 }}>Channel Revenue Share</div>
                  {([...NB_CHANNELS_LIST, "Expansion"] as (keyof typeof assumptions.ch)[]).map(ch => (
                    <div key={ch} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                      <span style={{ color: "#115e59" }}>{ch}</span>
                      <span style={{ fontWeight: 700, color: "#0f766e" }}>{assumptions.ch[ch]}%</span>
                    </div>
                  ))}
                </div>
                {/* Expansion inputs */}
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
              <button
                onClick={onEdit}
                style={{ marginTop: 12, background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </details>
    </TableCard>
  );
}
