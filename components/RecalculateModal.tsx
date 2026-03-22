// components/RecalculateModal.tsx

"use client";

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
  totalDeals:       number;
  periodMonths:     number;
}

interface RecalculateModalProps {
  rates:       Rates;
  sample:      Sample;
  current:     Assumptions;
  onConfirm:   (updated: Assumptions) => void;
  onDismiss:   () => void;
}

const RATE_LABELS: Record<string, string> = {
  disc_to_demo:   "Discovery → Demo",
  demo_to_prop:   "Demo → Proposal",
  prop_to_legal:  "Proposal → Legal",
  legal_to_close: "Legal → Close",
};

export default function RecalculateModal({ rates, sample, current, onConfirm, onDismiss }: RecalculateModalProps) {
  // Build updated assumptions
  const updated: Assumptions = {
    ...current,
    ...(rates.disc_to_demo   !== null && { disc_to_demo:   rates.disc_to_demo   }),
    ...(rates.demo_to_prop   !== null && { demo_to_prop:   rates.demo_to_prop   }),
    ...(rates.prop_to_legal  !== null && { prop_to_legal:  rates.prop_to_legal  }),
    ...(rates.legal_to_close !== null && { legal_to_close: rates.legal_to_close }),
  };

  const currentTargets = deriveTargets(current);
  const updatedTargets = deriveTargets(updated);

  const rateKeys = ["disc_to_demo", "demo_to_prop", "prop_to_legal", "legal_to_close"] as const;
  const anyChange = rateKeys.some(k => rates[k] !== null && rates[k] !== current[k]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15, 10, 46, 0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 580,
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
            ].map(([label, val]) => (
              <div key={String(label)} style={{ flex: 1, minWidth: 80, background: "#f8fafc", border: "1px solid #e2e4ed", borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f1117" }}>{val}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Rate comparison table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f0f1f5" }}>
                {["Conversion Rate", "Current", "New", "Change"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", background: "#fafbfc" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rateKeys.map(k => {
                const cur = current[k];
                const nw  = rates[k];
                const diff = nw !== null ? nw - cur : null;
                const changed = diff !== null && diff !== 0;
                return (
                  <tr key={k} style={{ borderBottom: "1px solid #f4f5f8", background: changed ? "rgba(130,246,198,0.05)" : "white" }}>
                    <td style={{ padding: "10px 10px", color: "#374151", fontWeight: 500 }}>{RATE_LABELS[k]}</td>
                    <td style={{ padding: "10px 10px", color: "#64748b" }}>{cur}%</td>
                    <td style={{ padding: "10px 10px", fontWeight: changed ? 700 : 400, color: changed ? "#0f1117" : "#94a3b8" }}>
                      {nw !== null ? `${nw}%` : "—"}
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      {diff !== null && diff !== 0 ? (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
                          background: diff > 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                          color: diff > 0 ? "#16a34a" : "#dc2626",
                        }}>
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
          {anyChange && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e4ed", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 10 }}>Impact on Q Targets</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[
                  ["Legal",     currentTargets.legalTarget,   updatedTargets.legalTarget],
                  ["Proposal",  currentTargets.propTarget,    updatedTargets.propTarget],
                  ["Demo",      currentTargets.demoTarget,    updatedTargets.demoTarget],
                  ["Discovery", currentTargets.discTarget,    updatedTargets.discTarget],
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
          )}

          {!anyChange && (
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
            {anyChange && (
              <button onClick={() => onConfirm(updated)}
                style={{ background: "linear-gradient(135deg, #a0fad7, #82f6c6)", color: "#0a2e1f", border: "none", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 0 16px rgba(130,246,198,0.3)" }}>
                Apply Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
