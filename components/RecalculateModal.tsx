// components/RecalculateModal.tsx

"use client";

import { useState } from "react";
import type { Assumptions } from "@/types/deals";
import { deriveTargets } from "@/lib/assumptions";

interface Rates {
  disc_to_demo:   number | null;
  demo_to_prop:   number | null;
  prop_to_legal:  number | null;
  legal_to_close: number | null;
}

interface Sample {
  enteredDiscovery: number;
  enteredDemo:      number;
  enteredProposal:  number;
  enteredLegal:     number;
  closedWon:        number;
  nbDealsForAvg:    number;
  totalDeals:       number;
  periodMonths:     number;
}

interface RecalculateModalProps {
  rates:          Rates;
  avg_deal_value: number | null;
  sample:         Sample;
  current:        Assumptions;
  onConfirm:      (updated: Assumptions) => void;
  onDismiss:      () => void;
}

const RATE_LABELS: Record<string, string> = {
  disc_to_demo:   "Discovery → Demo",
  demo_to_prop:   "Demo → Proposal",
  prop_to_legal:  "Proposal → Legal",
  legal_to_close: "Legal → Close",
};

const fmtCur = (n: number) => "$" + n.toLocaleString();

export default function RecalculateModal({ rates, avg_deal_value, sample, current, onConfirm, onDismiss }: RecalculateModalProps) {
  const rateKeys = ["disc_to_demo", "demo_to_prop", "prop_to_legal", "legal_to_close"] as const;

  const avgChanged  = avg_deal_value !== null && avg_deal_value !== current.avg_deal_value;
  const anyRateChange = rateKeys.some(k => rates[k] !== null && rates[k] !== current[k]);

  // Per-row selection state — default checked if value changed
  const [selectedRates, setSelectedRates] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(rateKeys.map(k => [k, rates[k] !== null && rates[k] !== current[k]]))
  );
  const [selectedAvg, setSelectedAvg] = useState(avgChanged);

  const anySelected = Object.values(selectedRates).some(Boolean) || selectedAvg;

  const buildUpdated = (): Assumptions => ({
    ...current,
    ...Object.fromEntries(
      rateKeys
        .filter(k => selectedRates[k] && rates[k] !== null)
        .map(k => [k, rates[k]])
    ),
    ...(selectedAvg && avg_deal_value !== null ? { avg_deal_value } : {}),
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15, 10, 46, 0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600,
        margin: "0 24px", boxShadow: "0 24px 64px rgba(15,10,46,0.2)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #0f0a2e 0%, #1a0f4e 60%, #0d1a3a 100%)",
          padding: "18px 24px",
          borderBottom: "1px solid rgba(160,250,215,0.15)",
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Recalculate Assumptions</div>
          <div style={{ fontSize: 11, color: "rgba(160,250,215,0.6)", marginTop: 3 }}>
            Based on {sample.totalDeals} closed deals from the last {sample.periodMonths} months
          </div>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {/* Sample sizes */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              ["Entered Discovery", sample.enteredDiscovery],
              ["Entered Demo",      sample.enteredDemo],
              ["Entered Proposal",  sample.enteredProposal],
              ["Entered Legal",     sample.enteredLegal],
              ["Closed Won",        sample.closedWon],
              ["NB Deals (avg)",    sample.nbDealsForAvg],
            ].map(([label, val]) => (
              <div key={String(label)} style={{ flex: 1, minWidth: 80, background: "#f8fafc", border: "1px solid #e2e4ed", borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f1117" }}>{val}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Avg Deal Value row */}
          {avg_deal_value !== null && (
            <div style={{ background: selectedAvg ? "rgba(130,246,198,0.05)" : "#fafbfc", border: "1px solid #e2e4ed", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" checked={selectedAvg} disabled={!avgChanged}
                  onChange={e => setSelectedAvg(e.target.checked)}
                  style={{ width: 15, height: 15, cursor: avgChanged ? "pointer" : "default", accentColor: "#16a34a" }} />
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>Avg NB Deal Value</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>{fmtCur(current.avg_deal_value)}</span>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>→</span>
                <span style={{ fontSize: 13, fontWeight: avgChanged ? 700 : 400, color: avgChanged ? "#0f1117" : "#94a3b8" }}>{fmtCur(avg_deal_value)}</span>
                {avgChanged ? (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: avg_deal_value > current.avg_deal_value ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: avg_deal_value > current.avg_deal_value ? "#16a34a" : "#dc2626" }}>
                    {avg_deal_value > current.avg_deal_value ? "+" : ""}{fmtCur(avg_deal_value - current.avg_deal_value)}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "#b0b5c3" }}>no change</span>
                )}
              </div>
            </div>
          )}

          {/* Rate comparison table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f0f1f5" }}>
                <th style={{ padding: "8px 10px", width: 32, background: "#fafbfc" }} />
                {["Conversion Rate", "Current", "New", "Change"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", background: "#fafbfc" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rateKeys.map(k => {
                const cur     = current[k];
                const nw      = rates[k];
                const diff    = nw !== null ? nw - cur : null;
                const changed = diff !== null && diff !== 0;
                return (
                  <tr key={k} style={{ borderBottom: "1px solid #f4f5f8", background: selectedRates[k] ? "rgba(130,246,198,0.05)" : "white" }}>
                    <td style={{ padding: "10px 10px", textAlign: "center" }}>
                      <input type="checkbox" checked={!!selectedRates[k]} disabled={!changed}
                        onChange={e => setSelectedRates(prev => ({ ...prev, [k]: e.target.checked }))}
                        style={{ width: 15, height: 15, cursor: changed ? "pointer" : "default", accentColor: "#16a34a" }} />
                    </td>
                    <td style={{ padding: "10px 10px", color: "#374151", fontWeight: 500 }}>{RATE_LABELS[k]}</td>
                    <td style={{ padding: "10px 10px", color: "#64748b" }}>{cur}%</td>
                    <td style={{ padding: "10px 10px", fontWeight: changed ? 700 : 400, color: changed ? "#0f1117" : "#94a3b8" }}>
                      {nw !== null ? `${nw}%` : "—"}
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      {diff !== null && diff !== 0 ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: diff > 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: diff > 0 ? "#16a34a" : "#dc2626" }}>
                          {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#b0b5c3" }}>no change</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Q target impact */}
          {anySelected && (() => {
            const currentTargets = deriveTargets(current);
            const updatedTargets = deriveTargets(buildUpdated());
            return (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e4ed", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 10 }}>Impact on Q Targets</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {[
                    ["Legal",     currentTargets.combinedLegalTarget, updatedTargets.combinedLegalTarget],
                    ["Proposal",  currentTargets.combinedPropTarget,  updatedTargets.combinedPropTarget],
                    ["Demo",      currentTargets.combinedDemoTarget,  updatedTargets.combinedDemoTarget],
                    ["Discovery", currentTargets.discTarget,          updatedTargets.discTarget],
                  ].map(([label, cur, upd]) => {
                    const diff = (upd as number) - (cur as number);
                    return (
                      <div key={String(label)} style={{ flex: 1, minWidth: 80, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#0f1117" }}>{upd}</div>
                        {diff !== 0 && (
                          <div style={{ fontSize: 10, fontWeight: 600, color: diff > 0 ? "#dc2626" : "#16a34a" }}>
                            {diff > 0 ? "+" : ""}{diff} vs {cur}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {!anyRateChange && !avgChanged && (
            <div style={{ textAlign: "center", padding: "12px 0 20px", color: "#94a3b8", fontSize: 13 }}>
              No changes — your current assumptions already match the historical data.
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onDismiss}
              style={{ background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              Dismiss
            </button>
            {anySelected && (
              <button onClick={() => onConfirm(buildUpdated())}
                style={{ background: "linear-gradient(135deg, #a0fad7, #82f6c6)", color: "#0a2e1f", border: "none", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 0 16px rgba(130,246,198,0.3)" }}>
                Apply Selected
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
