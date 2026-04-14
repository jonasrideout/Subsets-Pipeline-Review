// components/OutboundPanel.tsx

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { OutboundReport, OutboundWindow, RepOutboundStats, EmailCategory, SentEmail } from "@/types/outbound";

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

function EmailDrillDown({
  emails, category, hiddenIds, onHide,
}: {
  emails: SentEmail[];
  category: EmailCategory;
  hiddenIds: Set<string>;
  onHide: (emailId: string, subject: string | null) => void;
}) {
  const { bg, text } = CATEGORY_COLORS[category];
  const visible = emails.filter(e => !hiddenIds.has(e.emailId));

  if (!emails.length) return (
    <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: font, padding: "10px 14px" }}>
      No {category.toLowerCase()} emails in this period.
    </div>
  );

  if (!visible.length) return (
    <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: font, padding: "10px 14px" }}>
      All {category.toLowerCase()} emails hidden.
    </div>
  );

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "#f8fafc" }}>
          {["Subject", "Sent", ""].map((h, i) => (
            <th key={i} style={{
              padding: "6px 12px", textAlign: "left", fontSize: 10,
              fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" as const,
              letterSpacing: 0.4, fontFamily: font, borderBottom: "1px solid #f1f5f9",
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {visible.map((e, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
            <td style={{
              padding: "7px 12px", fontSize: 12, color: "#374151",
              fontFamily: font, maxWidth: 340,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              <span style={{
                display: "inline-block", marginRight: 6,
                background: bg, color: text, fontSize: 9, fontWeight: 700,
                borderRadius: 3, padding: "1px 5px", fontFamily: font,
                textTransform: "uppercase" as const, letterSpacing: 0.4, verticalAlign: "middle",
              }}>{category}</span>
              {e.subject ?? "—"}
            </td>
            <td style={{ padding: "7px 12px", fontSize: 11, color: "#94a3b8", fontFamily: font, whiteSpace: "nowrap" }}>
              {e.sentAt ? new Date(e.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
            </td>
            <td style={{ padding: "7px 12px", textAlign: "right" }}>
              <button
                onClick={() => onHide(e.emailId, e.subject)}
                style={{
                  fontSize: 10, color: "#94a3b8", background: "none",
                  border: "1px solid #e2e8f0", borderRadius: 4, padding: "2px 8px",
                  cursor: "pointer", fontFamily: font,
                }}
              >
                Hide
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RepCard({ rep, portalId, hiddenIds, onHide }: {
  rep: RepOutboundStats;
  portalId: string;
  hiddenIds: Set<string>;
  onHide: (emailId: string, subject: string | null) => void;
}) {
  const [drillDown, setDrillDown]   = useState<EmailCategory | "attributed" | null>(null);
  const hasAttribution = rep.newDeals > 0 || rep.progressions > 0;

  const toggle = (key: EmailCategory | "attributed") =>
    setDrillDown(prev => prev === key ? null : key);

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

        {/* Email count tiles — clickable */}
        <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
          {(["Sequence", "Roundtable", "Outreach"] as EmailCategory[]).map(cat => {
            const active = drillDown === cat;
            const { bg, text } = CATEGORY_COLORS[cat];
            return (
              <button
                key={cat}
                onClick={() => rep.counts[cat] > 0 ? toggle(cat) : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: active ? bg : "#f8fafc",
                  borderRadius: 6, padding: "4px 10px",
                  border: active ? `1.5px solid ${text}` : "1.5px solid transparent",
                  cursor: rep.counts[cat] > 0 ? "pointer" : "default",
                  transition: "all 0.1s",
                }}
              >
                <span style={{ fontSize: 11, color: active ? text : "#64748b", fontFamily: font }}>{cat}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: active ? text : "#0f172a", fontFamily: font }}>
                  {rep.counts[cat]}
                </span>
              </button>
            );
          })}
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

        {/* Attribution tiles — clickable */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {rep.newDeals > 0 && (
            <button
              onClick={() => toggle("attributed")}
              style={{
                background: drillDown === "attributed" ? "#dcfce7" : "#f0fdf4",
                border: drillDown === "attributed" ? "1.5px solid #15803d" : "1px solid #bbf7d0",
                borderRadius: 6, padding: "4px 10px", textAlign: "center", cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 11, color: "#15803d", fontFamily: font }}>New deals</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#15803d", fontFamily: font }}>{rep.newDeals}</div>
            </button>
          )}
          {rep.progressions > 0 && (
            <button
              onClick={() => toggle("attributed")}
              style={{
                background: drillDown === "attributed" ? "#dbeafe" : "#eff6ff",
                border: drillDown === "attributed" ? "1.5px solid #1e40af" : "1px solid #bfdbfe",
                borderRadius: 6, padding: "4px 10px", textAlign: "center", cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 11, color: "#1e40af", fontFamily: font }}>→ Demo</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1e40af", fontFamily: font }}>{rep.progressions}</div>
            </button>
          )}
          {!hasAttribution && rep.counts.total > 0 && (
            <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: font }}>No attributed outcomes</span>
          )}
          {rep.counts.total === 0 && (
            <span style={{ fontSize: 11, color: "#cbd5e1", fontFamily: font }}>No activity</span>
          )}
        </div>
      </div>

      {/* Drill-down panel */}
      {drillDown && (
        <div style={{ borderTop: "1px solid #f1f5f9" }}>
          {drillDown === "attributed" ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Type", "Subject", "Deal", "Outcome"].map(h => (
                    <th key={h} style={{
                      padding: "6px 12px", textAlign: "left", fontSize: 10,
                      fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" as const,
                      letterSpacing: 0.4, fontFamily: font, borderBottom: "1px solid #f1f5f9",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rep.attributed.map((a, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "7px 12px" }}><CategoryPill category={a.category} /></td>
                    <td style={{
                      padding: "7px 12px", fontSize: 12, color: "#374151",
                      fontFamily: font, maxWidth: 260,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{a.subject ?? "—"}</td>
                    <td style={{ padding: "7px 12px" }}>
                      {a.dealId ? (
                        <a
                          href={`https://app.hubspot.com/contacts/${portalId}/record/0-3/${a.dealId}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 12, color: "#4f46e5", fontFamily: font, textDecoration: "none", fontWeight: 500 }}
                        >
                          {a.dealName || a.dealId}
                        </a>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "7px 12px" }}>
                      {a.attribution && <AttributionBadge type={a.attribution} />}
                      {a.preExistingDeal && a.attribution === "progression" && (
                        <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 6, fontFamily: font }}>(pre-existing)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmailDrillDown emails={rep.emailsByCategory[drillDown]} category={drillDown} hiddenIds={hiddenIds} onHide={onHide} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

const PORTAL_ID = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID ?? "25962322";

export default function OutboundPanel() {
  const [window, setWindow]       = useState<OutboundWindow>("week");
  const [report, setReport]       = useState<OutboundReport | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [toast, setToast]         = useState<{ emailId: string; subject: string | null } | null>(null);
  const toastTimer                = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load hidden IDs from Redis on mount
  useEffect(() => {
    fetch("/api/outbound-hidden")
      .then(r => r.json())
      .then(d => setHiddenIds(new Set(d.hiddenIds ?? [])))
      .catch(() => {});
  }, []);

  const saveHidden = useCallback(async (ids: Set<string>) => {
    try {
      await fetch("/api/outbound-hidden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenIds: [...ids] }),
      });
    } catch {}
  }, []);

  const handleHide = useCallback((emailId: string, subject: string | null) => {
    const next = new Set([...hiddenIds, emailId]);
    setHiddenIds(next);
    saveHidden(next);
    // Show toast — dismiss after 6s
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ emailId, subject });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }, [hiddenIds, saveHidden]);

  const handleHideAllFromSender = useCallback((subject: string | null) => {
    if (!report) return;
    // Match by subject — hide all emails with this exact subject across all reps
    const toHide = new Set<string>();
    for (const rep of report.reps) {
      for (const cat of ["Sequence", "Roundtable", "Outreach"] as EmailCategory[]) {
        for (const e of rep.emailsByCategory[cat]) {
          if (e.subject === subject) toHide.add(e.emailId);
        }
      }
    }
    const next = new Set([...hiddenIds, ...toHide]);
    setHiddenIds(next);
    saveHidden(next);
    setToast(null);
  }, [report, hiddenIds, saveHidden]);

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
    <>
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
              <RepCard key={rep.repName} rep={rep} portalId={PORTAL_ID} hiddenIds={hiddenIds} onHide={handleHide} />
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Toast */}
    {toast && (
      <div style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 16px", borderRadius: 12, zIndex: 50,
        background: "#1a0f4e", border: "1px solid rgba(160,250,215,0.2)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap",
      }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontFamily: font }}>
          Hide all emails with this subject?
        </span>
        <button
          onClick={() => handleHideAllFromSender(toast.subject)}
          style={{
            padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
            background: "linear-gradient(135deg, #A0FAD7, #82F6C6)",
            color: "#0a2e1f", border: "none", cursor: "pointer", fontFamily: font,
          }}
        >
          Hide all
        </button>
        <button
          onClick={() => setToast(null)}
          style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", fontFamily: font }}
        >
          ✕
        </button>
      </div>
    )}
    </>
  );
}
