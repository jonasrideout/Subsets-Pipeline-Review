"use client";

import { useState, useEffect, useCallback } from "react";
import type { OutboundReport, OutboundWindow, RepOutboundStats, EmailCategory } from "@/types/outbound";

// ── Shared style helpers ──────────────────────────────────────────────────────

const font = "'DM Sans', system-ui, sans-serif";

const CATEGORY_COLORS: Record<EmailCategory, { bg: string; text: string }> = {
  Sequence:   { bg: "#eff6ff", text: "#1e40af" },
  Roundtable: { bg: "#faf5ff", text: "#6b21a8" },
  Outreach:   { bg: "#f0fdf4", text: "#15803d" },
};

const WINDOW_LABELS: Record<OutboundWindow, string> = {
  week:    "Last 7 days",
  month:   "Last 30 days",
  quarter: "This quarter",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function CategoryPill({ category }: { category: EmailCategory }) {
  const { bg, text } = CATEGORY_COLORS[category];
  return (
    <span style={{
      background: bg, color: text, fontSize: 10, fontWeight: 700,
      borderRadius: 4, padding: "2px 6px", fontFamily: font,
      textTransform: "uppercase", letterSpacing: 0.4,
    }}>
      {category}
    </span>
  );
}

function AttributionBadge({ type }: { type: "new_deal" | "progression" }) {
  const isNew = type === "new_deal";
  return (
    <span style={{
      background: isNew ? "#f0fdf4" : "#eff6ff",
      color:      isNew ? "#15803d" : "#1e40af",
      fontSize: 10, fontWeight: 700, borderRadius: 4,
      padding: "2px 6px", fontFamily: font,
      textTransform: "uppercase", letterSpacing: 0.4,
    }}>
      {isNew ? "New deal" : "→ Demo"}
    </span>
  );
}

function RepCard({ rep, portalId }: { rep: RepOutboundStats; portalId: string }) {
  const [expanded, setExpanded] = useState(false);
  const hasAttribution = rep.newDeals > 0 || rep.progressions > 0;

  return (
    <div style={{
      border: "1.5px solid #e2e8f0", borderRadius: 10,
      background: "#fff", overflow: "hidden",
    }}>
      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "12px 16px", flexWrap: "wrap",
      }}>
        {/* Rep name */}
        <div style={{ minWidth: 70 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: font }}>
            {rep.repName}
          </div>
        </div>

        {/* Email counts */}
        <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
          {(["Sequence", "Roundtable", "Outreach"] as EmailCategory[]).map(cat => (
            <div key={cat} style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "#f8fafc", borderRadius: 6, padding: "4px 10px",
            }}>
              <span style={{ fontSize: 11, color: "#64748b", fontFamily: font }}>{cat}</span>
              <span style={{
                fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: font,
              }}>
                {rep.counts[cat]}
              </span>
            </div>
          ))}
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "#f1f5f9", borderRadius: 6, padding: "4px 10px",
          }}>
            <span style={{ fontSize: 11, color: "#64748b", fontFamily: font }}>Total</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: font }}>
              {rep.counts.total}
            </span>
          </div>
        </div>

        {/* Attribution summary */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {rep.newDeals > 0 && (
            <div style={{
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 6, padding: "4px 10px", textAlign: "center",
            }}>
              <div style={{ fontSize: 11, color: "#15803d", fontFamily: font }}>New deals</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#15803d", fontFamily: font }}>
                {rep.newDeals}
              </div>
            </div>
          )}
          {rep.progressions > 0 && (
            <div style={{
              background: "#eff6ff", border: "1px solid #bfdbfe",
              borderRadius: 6, padding: "4px 10px", textAlign: "center",
            }}>
              <div style={{ fontSize: 11, color: "#1e40af", fontFamily: font }}>→ Demo</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1e40af", fontFamily: font }}>
                {rep.progressions}
              </div>
            </div>
          )}
          {!hasAttribution && rep.counts.total > 0 && (
            <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: font }}>No attributed outcomes</span>
          )}
          {rep.counts.total === 0 && (
            <span style={{ fontSize: 11, color: "#cbd5e1", fontFamily: font }}>No activity</span>
          )}
        </div>

        {/* Expand toggle */}
        {rep.attributed.length > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 11, color: "#94a3b8", fontFamily: font,
              padding: "2px 6px", borderRadius: 4,
            }}
          >
            {expanded ? "▲ hide" : "▼ detail"}
          </button>
        )}
      </div>

      {/* Attribution detail */}
      {expanded && rep.attributed.length > 0 && (
        <div style={{ borderTop: "1px solid #f1f5f9" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Type", "Subject", "Deal", "Outcome"].map(h => (
                  <th key={h} style={{
                    padding: "6px 12px", textAlign: "left", fontSize: 10,
                    fontWeight: 600, color: "#94a3b8", textTransform: "uppercase",
                    letterSpacing: 0.4, fontFamily: font,
                    borderBottom: "1px solid #f1f5f9",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rep.attributed.map((a, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                  <td style={{ padding: "7px 12px" }}>
                    <CategoryPill category={a.category} />
                  </td>
                  <td style={{
                    padding: "7px 12px", fontSize: 12, color: "#374151",
                    fontFamily: font, maxWidth: 260,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {a.subject ?? "—"}
                  </td>
                  <td style={{ padding: "7px 12px" }}>
                    {a.dealId ? (
                      <a
                        href={`https://app.hubspot.com/contacts/${portalId}/record/0-3/${a.dealId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 12, color: "#4f46e5", fontFamily: font,
                          textDecoration: "none", fontWeight: 500,
                        }}
                      >
                        {a.dealName || a.dealId}
                      </a>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "7px 12px" }}>
                    {a.attribution && <AttributionBadge type={a.attribution} />}
                    {a.preExistingDeal && a.attribution === "progression" && (
                      <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 6, fontFamily: font }}>
                        (pre-existing)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

const PORTAL_ID = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID ?? "25962322";

export default function OutboundPanel() {
  const [window, setWindow]   = useState<OutboundWindow>("week");
  const [report, setReport]   = useState<OutboundReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async (w: OutboundWindow) => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/outbound?window=${w}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json() as OutboundReport;
      setReport(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(window); }, [window]);

  const totalEmails = report?.reps.reduce((s, r) => s + r.counts.total, 0) ?? 0;
  const totalNew    = report?.reps.reduce((s, r) => s + r.newDeals, 0) ?? 0;
  const totalProg   = report?.reps.reduce((s, r) => s + r.progressions, 0) ?? 0;

  return (
    <div style={{
      border: "1.5px solid #e2e8f0", borderRadius: 12,
      background: "#fff", overflow: "hidden", marginTop: 14,
    }}>
      {/* Panel header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 16px", borderBottom: "1.5px solid #f1f5f9",
        flexWrap: "wrap", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: font }}>
            Outbound Activity
          </span>
          {!loading && report && (
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#64748b", fontFamily: font }}>
                {totalEmails} emails
              </span>
              {totalNew > 0 && (
                <span style={{ fontSize: 11, color: "#15803d", fontWeight: 600, fontFamily: font }}>
                  · {totalNew} new deal{totalNew !== 1 ? "s" : ""}
                </span>
              )}
              {totalProg > 0 && (
                <span style={{ fontSize: 11, color: "#1e40af", fontWeight: 600, fontFamily: font }}>
                  · {totalProg} → Demo
                </span>
              )}
            </div>
          )}
        </div>

        {/* Window selector */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["week", "month", "quarter"] as OutboundWindow[]).map(w => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              style={{
                padding: "4px 10px", fontSize: 11, fontFamily: font,
                borderRadius: 6, cursor: "pointer", fontWeight: window === w ? 700 : 400,
                background: window === w ? "#0f172a" : "#f8fafc",
                color:      window === w ? "#fff"    : "#64748b",
                border:     window === w ? "none"    : "1px solid #e2e8f0",
              }}
            >
              {WINDOW_LABELS[w]}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 14 }}>
        {loading && (
          <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: font, padding: "8px 0" }}>
            Loading outbound data…
          </div>
        )}
        {error && (
          <div style={{ fontSize: 12, color: "#ef4444", fontFamily: font, padding: "8px 0" }}>
            {error}
          </div>
        )}
        {!loading && !error && report && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {report.reps.map(rep => (
              <RepCard key={rep.repName} rep={rep} portalId={PORTAL_ID} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
