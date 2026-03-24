// components/ValidationDashboard.tsx

"use client";

import { useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface DemoDeal {
  id: string;
  name: string;
  stage: string;
  demo: string | null;
  prop: string | null;
  legal: string | null;
  anomaly: boolean;
  converted: boolean;
  anomalyNote: string | null;
}

interface PropDeal {
  id: string;
  name: string;
  stage: string;
  prop: string | null;
  legal: string | null;
  anomaly: boolean;
  converted: boolean;
  anomalyNote: string | null;
}

interface LegalDeal {
  id: string;
  name: string;
  stage: string;
  legal: string | null;
  won: boolean;
}

interface ValidationData {
  demoCohort: DemoDeal[];
  propCohort: PropDeal[];
  legalCohort: LegalDeal[];
}

interface SampleData {
  enteredDemo: number;
  enteredProposal: number;
  enteredLegal: number;
  closedWon: number;
  nbDealsForAvg: number;
  totalDeals: number;
  periodMonths: number;
  anomaliesExcluded: { demo: number; prop: number };
}

interface Rates {
  disc_to_demo: number | null;
  demo_to_prop: number | null;
  prop_to_legal: number | null;
  legal_to_close: number | null;
}

interface ValidationDashboardProps {
  rates: Rates;
  sample: SampleData;
  validation: ValidationData;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string | null) => iso ? iso.slice(0, 10) : "—";

const STAGE_LABELS: Record<string, string> = {
  appointmentscheduled: "Discovery",
  qualifiedtobuy:       "Meeting/Demo",
  contractsent:         "Proposal/Negotiation",
  "1446534336":         "Legal/Procurement",
  closedwon:            "Closed Won",
  closedlost:           "Closed Lost",
  "563428070":          "Closed Lost (Churn)",
  "582003949":          "Bad Fit",
};

const stageLabel = (s: string) => STAGE_LABELS[s] ?? s;

// ── Sub-components ───────────────────────────────────────────────────────────

function RateSummaryTile({
  label, rate, n, anomalies,
}: { label: string; rate: number | null; n: number; anomalies?: number }) {
  return (
    <div style={{
      flex: 1, minWidth: 160,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(160,250,215,0.15)",
      borderRadius: 10, padding: "14px 16px",
    }}>
      <div style={{ fontSize: 11, color: "rgba(160,250,215,0.6)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#a0fad7" }}>
        {rate !== null ? `${rate}%` : "—"}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
        n = {n}{anomalies ? ` · ${anomalies} anomaly excluded` : ""}
      </div>
    </div>
  );
}

function ResultBadge({ converted, anomaly, tab }: { converted: boolean; anomaly: boolean; tab: string }) {
  if (anomaly) {
    return (
      <span style={{
        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
        background: "rgba(245,158,11,0.15)", color: "#d97706",
      }}>⚠ Anomaly</span>
    );
  }
  if (tab === "demo") {
    return converted
      ? <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>Reached Proposal</span>
      : <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>Did not reach Proposal</span>;
  }
  if (tab === "prop") {
    return converted
      ? <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>Reached Legal</span>
      : <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>Did not reach Legal</span>;
  }
  return null;
}

function WonBadge({ won }: { won: boolean }) {
  return won
    ? <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>Closed Won</span>
    : <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>Did not close</span>;
}

const TH = ({ children }: { children: React.ReactNode }) => (
  <th style={{
    padding: "8px 14px", textAlign: "left",
    fontSize: 10, fontWeight: 700, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.05em",
    background: "#fafbfc", borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  }}>{children}</th>
);

const TD = ({ children, muted }: { children: React.ReactNode; muted?: boolean }) => (
  <td style={{
    padding: "9px 14px", fontSize: 12,
    color: muted ? "#94a3b8" : "#374151",
    borderBottom: "1px solid #f4f5f8",
    verticalAlign: "middle",
  }}>{children}</td>
);

// ── Main component ───────────────────────────────────────────────────────────

export default function ValidationDashboard({ rates, sample, validation }: ValidationDashboardProps) {
  const [tab, setTab] = useState<"demo" | "prop" | "legal">("demo");

  const tabs: { id: "demo" | "prop" | "legal"; label: string; count: number }[] = [
    { id: "demo",  label: "Demo → Proposal",   count: validation.demoCohort.length  },
    { id: "prop",  label: "Proposal → Legal",   count: validation.propCohort.length  },
    { id: "legal", label: "Legal → Close",      count: validation.legalCohort.length },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f0a2e 0%, #1a0f4e 60%, #0d1a3a 100%)",
        borderRadius: "12px 12px 0 0",
        padding: "18px 24px 16px",
        borderBottom: "1px solid rgba(160,250,215,0.15)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 2 }}>
          Conversion Rate Methodology
        </div>
        <div style={{ fontSize: 11, color: "rgba(160,250,215,0.55)" }}>
          Rolling 12 months · Resolved deals only · Anomalies excluded from calculations
        </div>

        {/* Rate tiles */}
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <RateSummaryTile
            label="Demo → Proposal"
            rate={rates.demo_to_prop}
            n={sample.enteredDemo}
            anomalies={sample.anomaliesExcluded.demo}
          />
          <RateSummaryTile
            label="Proposal → Legal"
            rate={rates.prop_to_legal}
            n={sample.enteredProposal}
            anomalies={sample.anomaliesExcluded.prop}
          />
          <RateSummaryTile
            label="Legal → Close"
            rate={rates.legal_to_close}
            n={sample.enteredLegal}
          />
          <RateSummaryTile
            label="Discovery → Demo"
            rate={rates.disc_to_demo}
            n={0}
          />
        </div>
      </div>

      {/* Tab nav */}
      <div style={{
        display: "flex", gap: 0,
        borderBottom: "1px solid #e2e8f0",
        background: "#fff",
        padding: "0 24px",
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 16px",
            fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? "#0f1117" : "#94a3b8",
            background: "transparent", border: "none",
            borderBottom: tab === t.id ? "2px solid #a0fad7" : "2px solid transparent",
            cursor: "pointer", marginBottom: -1,
          }}>
            {t.label}
            <span style={{
              marginLeft: 6, fontSize: 10, fontWeight: 700,
              padding: "1px 6px", borderRadius: 999,
              background: tab === t.id ? "rgba(160,250,215,0.15)" : "#f1f5f9",
              color: tab === t.id ? "#0a2e1f" : "#94a3b8",
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Tables */}
      <div style={{ background: "#fff", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>

        {/* Demo → Proposal */}
        {tab === "demo" && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <TH>Deal</TH>
                <TH>Current Stage</TH>
                <TH>Entered Demo</TH>
                <TH>Entered Proposal</TH>
                <TH>Entered Legal</TH>
                <TH>Result</TH>
              </tr>
            </thead>
            <tbody>
              {validation.demoCohort.map(d => (
                <tr key={d.id} style={{
                  background: d.anomaly
                    ? "rgba(245,158,11,0.03)"
                    : d.converted
                      ? "rgba(99,102,241,0.02)"
                      : "white",
                }}>
                  <TD><span style={{ fontWeight: 600, color: "#0f1117" }}>{d.name}</span></TD>
                  <TD muted>{stageLabel(d.stage)}</TD>
                  <TD muted>{fmtDate(d.demo)}</TD>
                  <TD muted>{fmtDate(d.prop)}</TD>
                  <TD muted>{fmtDate(d.legal)}</TD>
                  <td style={{ padding: "9px 14px", borderBottom: "1px solid #f4f5f8", verticalAlign: "middle" }}>
                    <ResultBadge converted={d.converted} anomaly={d.anomaly} tab="demo" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Proposal → Legal */}
        {tab === "prop" && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <TH>Deal</TH>
                <TH>Current Stage</TH>
                <TH>Entered Proposal</TH>
                <TH>Entered Legal</TH>
                <TH>Result</TH>
              </tr>
            </thead>
            <tbody>
              {validation.propCohort.map(d => (
                <tr key={d.id} style={{
                  background: d.anomaly
                    ? "rgba(245,158,11,0.03)"
                    : d.converted
                      ? "rgba(99,102,241,0.02)"
                      : "white",
                }}>
                  <TD><span style={{ fontWeight: 600, color: "#0f1117" }}>{d.name}</span></TD>
                  <TD muted>{stageLabel(d.stage)}</TD>
                  <TD muted>{fmtDate(d.prop)}</TD>
                  <TD muted>{fmtDate(d.legal)}</TD>
                  <td style={{ padding: "9px 14px", borderBottom: "1px solid #f4f5f8", verticalAlign: "middle" }}>
                    <ResultBadge converted={d.converted} anomaly={d.anomaly} tab="prop" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Legal → Close */}
        {tab === "legal" && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <TH>Deal</TH>
                <TH>Current Stage</TH>
                <TH>Entered Legal</TH>
                <TH>Result</TH>
              </tr>
            </thead>
            <tbody>
              {validation.legalCohort.map(d => (
                <tr key={d.id} style={{
                  background: d.won ? "rgba(34,197,94,0.02)" : "white",
                }}>
                  <TD><span style={{ fontWeight: 600, color: "#0f1117" }}>{d.name}</span></TD>
                  <TD muted>{stageLabel(d.stage)}</TD>
                  <TD muted>{fmtDate(d.legal)}</TD>
                  <td style={{ padding: "9px 14px", borderBottom: "1px solid #f4f5f8", verticalAlign: "middle" }}>
                    <WonBadge won={d.won} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer note */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid #f0f2f7" }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            ⚠ Anomaly = a downstream stage timestamp predates the stage entry being measured, indicating a stage regression in HubSpot. Excluded from both numerator and denominator. · Discovery → Demo is manually set at 40% and not derived from historical data.
          </span>
        </div>
      </div>
    </div>
  );
}
