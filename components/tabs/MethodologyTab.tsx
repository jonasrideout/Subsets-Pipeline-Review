// components/tabs/MethodologyTab.tsx

"use client";

import { useState } from "react";
import type { Assumptions, HubSpotRates, ClosedWonDeal } from "@/types/deals";
import { deriveTargets, QUARTERLY_TARGETS, NB_REVENUE_SHARE } from "@/lib/assumptions";
import { computeACV } from "@/lib/deals";
import { TableCard } from "@/components/Table";
import DealLink from "@/components/DealLink";
import ValidationDashboard from "@/components/ValidationDashboard";

interface MethodologyTabProps {
  assumptions:       Assumptions;
  qIndex:            number;
  hubspotRates:      HubSpotRates | null;
  onAssumptionsSave: (a: Assumptions) => Promise<void>;
  closedWonAllTime:  ClosedWonDeal[];
}

const fmtK    = (n: number) => "$" + Math.round(n / 1000) + "K";
const fmtFull = (n: number) => "$" + n.toLocaleString();
const fmtDate = (s: string) => s ? s.slice(0, 10) : "—";

// ── Shared table primitives ───────────────────────────────────────────────────

const TH = ({ children }: { children: React.ReactNode }) => (
  <th style={{
    padding: "8px 14px", textAlign: "left", fontSize: 10, fontWeight: 700,
    color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em",
    background: "#fafbfc", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" as const,
  }}>{children}</th>
);

const TD = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <td style={{
    padding: "9px 14px", fontSize: 12, color: "#374151",
    borderBottom: "1px solid #f4f5f8", verticalAlign: "middle" as const,
    ...style,
  }}>{children}</td>
);

// ── Flat deal table (All / NB / Expansion) ────────────────────────────────────

function FlatDealTable({ deals }: { deals: ClosedWonDeal[] }) {
  if (!deals.length) {
    return <div style={{ padding: "16px 18px", color: "#b0b5c3", fontSize: 13 }}>No deals found.</div>;
  }
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr>
          <TH>Deal</TH>
          <TH>Company</TH>
          <TH>Channel</TH>
          <TH>Amount</TH>
          <TH>Close Date</TH>
        </tr>
      </thead>
      <tbody>
        {deals.map(d => (
          <tr key={d.id}>
            <TD><DealLink id={d.id} name={d.name} /></TD>
            <TD style={{ color: "#64748b" }}>{d.company ?? "—"}</TD>
            <TD style={{ color: "#64748b" }}>{d.channel ?? "—"}</TD>
            <TD style={{ fontWeight: 600, color: "#15803d" }}>{fmtFull(d.amount)}</TD>
            <TD style={{ color: "#94a3b8" }}>{fmtDate(d.closedate)}</TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── ACV grouped table ─────────────────────────────────────────────────────────

function ACVTable({ deals }: { deals: ClosedWonDeal[] }) {
  if (!deals.length) {
    return <div style={{ padding: "16px 18px", color: "#b0b5c3", fontSize: 13 }}>No deals found.</div>;
  }

  // Group by company name, preserving insertion order
  const grouped = new Map<string, ClosedWonDeal[]>();
  for (const d of deals) {
    const key = d.company ?? d.name ?? "Unknown";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(d);
  }

  // Sort accounts by total value descending
  const accounts = [...grouped.entries()]
    .map(([company, acvDeals]) => ({
      company,
      deals: acvDeals,
      total: acvDeals.reduce((s, d) => s + d.amount, 0),
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr>
          <TH>Company</TH>
          <TH>Deal</TH>
          <TH>Channel</TH>
          <TH>Amount</TH>
          <TH>Close Date</TH>
        </tr>
      </thead>
      <tbody>
        {accounts.map(({ company, deals: acvDeals, total }) => (
          <>
            {/* Company header row */}
            <tr key={`company-${company}`} style={{ background: "#f8fafc" }}>
              <td colSpan={3} style={{
                padding: "8px 14px", fontSize: 12, fontWeight: 700, color: "#0f172a",
                borderBottom: "1px solid #e2e8f0",
              }}>
                {company}
              </td>
              <td style={{
                padding: "8px 14px", fontSize: 12, fontWeight: 700, color: "#15803d",
                borderBottom: "1px solid #e2e8f0",
              }}>
                {fmtFull(total)}
              </td>
              <td style={{ padding: "8px 14px", borderBottom: "1px solid #e2e8f0" }} />
            </tr>
            {/* Individual deal rows */}
            {acvDeals.map(d => (
              <tr key={d.id} style={{ background: "#fff" }}>
                <TD style={{ paddingLeft: 28, color: "#94a3b8" }} />
                <TD>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#cbd5e1", fontSize: 10 }}>↳</span>
                    <DealLink id={d.id} name={d.name} />
                  </div>
                </TD>
                <TD style={{ color: "#64748b" }}>{d.channel ?? "—"}</TD>
                <TD style={{ color: "#374151" }}>{fmtFull(d.amount)}</TD>
                <TD style={{ color: "#94a3b8" }}>{fmtDate(d.closedate)}</TD>
              </tr>
            ))}
          </>
        ))}
      </tbody>
    </table>
  );
}

// ── Clickable metric value ────────────────────────────────────────────────────

function MetricValue({
  label, value, subLabel, active, onClick,
}: {
  label:    string;
  value:    string;
  subLabel?: string;
  active:   boolean;
  onClick:  () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        cursor: "pointer", userSelect: "none" as const,
        padding: "10px 14px", borderRadius: 8,
        border: `1.5px solid ${active ? "#a0fad7" : "#e2e4ed"}`,
        background: active ? "#f0fdf9" : "#fafbfc",
        transition: "all 0.15s",
        minWidth: 140,
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = "#cbd5e1"; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = "#e2e4ed"; }}
    >
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: active ? "#0a2e1f" : "#0f172a", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        {value}
      </div>
      {subLabel && (
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          {subLabel}
        </div>
      )}
      <div style={{ fontSize: 10, color: active ? "#16a34a" : "#b0b5c3", marginTop: 4, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        {active ? "▲ hide" : "▼ show deals"}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MethodologyTab({
  assumptions, qIndex, hubspotRates, onAssumptionsSave, closedWonAllTime,
}: MethodologyTabProps) {
  const derived = deriveTargets(assumptions, qIndex);

  const RATE_KEYS: { key: keyof Assumptions; label: string }[] = [
    { key: "disc_to_demo",   label: "Discovery→Demo" },
    { key: "demo_to_prop",   label: "Demo→Proposal" },
    { key: "prop_to_legal",  label: "Proposal→Legal" },
    { key: "legal_to_close", label: "Legal→Close" },
  ];

  const manualRates = RATE_KEYS.filter(({ key }) => {
    if (!hubspotRates) return true;
    const hsVal = hubspotRates[key as keyof HubSpotRates];
    return hsVal === null || hsVal === undefined || hsVal !== assumptions[key];
  });

  const hubspotDerivedRates = RATE_KEYS.filter(({ key }) => {
    if (!hubspotRates) return false;
    const hsVal = hubspotRates[key as keyof HubSpotRates];
    return hsVal !== null && hsVal !== undefined && hsVal === assumptions[key];
  });

  const [showAssumptions, setShowAssumptions]     = useState(false);
  const [validationData, setValidationData]       = useState<any | null>(null);
  const [validationRates, setValidationRates]     = useState<any | null>(null);
  const [validationSample, setValidationSample]   = useState<any | null>(null);
  const [loadingValidation, setLoadingValidation] = useState(false);

  const handleViewAssumptions = async () => {
    if (showAssumptions) { setShowAssumptions(false); return; }
    if (!validationData) {
      setLoadingValidation(true);
      try {
        const res = await fetch("/api/recalculate");
        if (res.ok) {
          const data = await res.json();
          setValidationData(data.validation);
          setValidationRates(data.rates);
          setValidationSample(data.sample);
        }
      } catch (e) { console.error("Failed to load validation data:", e); }
      finally { setLoadingValidation(false); }
    }
    setShowAssumptions(true);
  };

  const [editingAvg, setEditingAvg] = useState(false);
  const [tmpAvg, setTmpAvg]         = useState<number>(assumptions.avg_deal_value);
  const [savingAvg, setSavingAvg]   = useState(false);

  const handleSaveAvg = async () => {
    setSavingAvg(true);
    await onAssumptionsSave({ ...assumptions, avg_deal_value: tmpAvg });
    setSavingAvg(false);
    setEditingAvg(false);
  };

  // ACV
  const { acv, accountCount } = computeACV(closedWonAllTime);

  // Rolling 12M deal splits — these come from hubspotRates which uses recalculate's
  // closedWonDeals query. For the drill-down tables we use closedWonAllTime filtered
  // to rolling 12M by closedate.
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  const rolling12M     = closedWonAllTime.filter(d => new Date(d.closedate) >= twelveMonthsAgo);
  const rolling12MNB   = rolling12M.filter(d => d.channel !== "Expansion");
  const rolling12MExp  = rolling12M.filter(d => d.channel === "Expansion");

  // Sort each by close date descending
  const sortByClose = (arr: ClosedWonDeal[]) =>
    [...arr].sort((a, b) => new Date(b.closedate).getTime() - new Date(a.closedate).getTime());

  // Drill-down open state — only one open at a time
  type DrillDown = "all" | "nb" | "expansion" | "acv" | null;
  const [openDrill, setOpenDrill] = useState<DrillDown>(null);
  const toggle = (key: DrillDown) => setOpenDrill(prev => prev === key ? null : key);

  const rollingLabel = hubspotRates?.as_of
    ? `12-month rolling · last updated ${new Date(hubspotRates.as_of).toLocaleDateString()}`
    : "Run Recalculate to compute";

  const section = (title: string, children: React.ReactNode) => (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #f1f5f9", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        {title}
      </div>
      {children}
    </div>
  );

  const bullet = (text: React.ReactNode) => (
    <div style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 13, color: "#374151", fontFamily: "'DM Sans', system-ui, sans-serif", lineHeight: 1.5 }}>
      <span style={{ color: "#82f6c6", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>·</span>
      <span>{text}</span>
    </div>
  );

  const val = (v: React.ReactNode) => (
    <span style={{ fontWeight: 600, color: "#0f172a" }}>{v}</span>
  );

  const COLOR_TIERS: { bg: string; border: string; label: string; desc: string }[] = [
    { bg: "#f0fdf4", border: "#86efac", label: "Green",  desc: "≥ 90% of pace — on track" },
    { bg: "#fefce8", border: "#fde68a", label: "Yellow", desc: "75–89% of pace — slightly behind" },
    { bg: "#fff7ed", border: "#fed7aa", label: "Orange", desc: "50–74% of pace — behind pace" },
    { bg: "#fef2f2", border: "#fecaca", label: "Red",    desc: "< 50% of pace — significantly behind, needs attention" },
  ];

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>

      {/* How it works */}
      <TableCard>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 20, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            How this dashboard works
          </div>

          {section("Setting quarterly targets", <>
            {bullet(<>Each quarter has a revenue target derived from the {val("$3M annual goal")}, divided seasonally. The current quarter's target is {val(fmtK(QUARTERLY_TARGETS[qIndex]))}, split {val("⅔ New Business")} ({val(fmtK(derived.nbQRevenueTarget))}) and {val("⅓ Expansion")} ({val(fmtK(derived.expansionQRevenueTarget))}). That's {val(derived.qCloses)} New Business deals and {val(derived.expansionQCloses)} Expansion deals this quarter.</>)}
            {bullet(<>Average deal value converts the New Business revenue target into a deal count. At {val(fmtFull(assumptions.avg_deal_value))} average deal value, that's {val(derived.qCloses)} New Business closes needed this quarter.</>)}
            {bullet(<>Working backwards through four historical conversion rates, the dashboard derives how many deals need to enter each stage to produce those closes — Legal, Proposal, Demo, and Discovery.</>)}
            {bullet(<>Expansion uses its own close rate and average deal size, independent of the New Business funnel. The current Expansion target is {val(derived.expansionQCloses)} closes this quarter.</>)}
          </>)}

          {section("Stage tile color coding", <>
            {bullet(<>Each stage tile on the Overview tab is color-coded by {val("pace ratio")}: how far we are toward the stage's quarterly target relative to how far through the quarter (or year) we are. Specifically: {val("(deals entered ÷ Q target) ÷ % of period elapsed")}.</>)}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: 20, marginBottom: 8 }}>
              {COLOR_TIERS.map(t => (
                <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 18, borderRadius: 5, background: t.bg, border: `1.5px solid ${t.border}`, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#374151", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    <span style={{ fontWeight: 600 }}>{t.label}</span> — {t.desc}
                  </span>
                </div>
              ))}
            </div>
            {bullet(<>The ℹ️ icon on each tile shows the exact percentage of goal reached and a plain-English interpretation.</>)}
          </>)}

          {section("Conversion rates", <>
            {bullet(<>
              Rates are calculated from 12 months of resolved deals in HubSpot, tracking how many deals
              passed through each stage. Anomalous deals — where a downstream stage timestamp predates
              the stage entry being measured — are excluded from both numerator and denominator.
              Any rate can be manually overwritten using the Assumptions drawers on the Overview tab.
            </>)}
            {hubspotDerivedRates.length > 0 && bullet(<>
              <span style={{ color: "#16a34a", fontWeight: 600 }}>HubSpot historical (12-month rolling):</span>{" "}
              {hubspotDerivedRates.map(({ key, label }, i) => (
                <span key={key}>{i > 0 ? ", " : ""}{val(`${label} (${assumptions[key]}%)`)}</span>
              ))}.
            </>)}
            {manualRates.length > 0 && bullet(<>
              <span style={{ color: "#d97706", fontWeight: 600 }}>Manually set:</span>{" "}
              {manualRates.map(({ key, label }, i) => {
                const hsVal = hubspotRates ? hubspotRates[key as keyof HubSpotRates] : null;
                return (
                  <span key={key}>
                    {i > 0 ? ", " : ""}
                    {label}{" ("}
                    {hsVal !== null && hsVal !== undefined
                      ? <>historically {val(`${hsVal}%`)}, set at {val(`${assumptions[key]}%`)}</>
                      : val(`${assumptions[key]}%`)
                    }
                    {")"}
                  </span>
                );
              })}.
            </>)}
            <div style={{ marginTop: 10, marginLeft: 20 }}>
              <button
                onClick={handleViewAssumptions}
                disabled={loadingValidation}
                style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e4ed", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                {loadingValidation ? "Loading…" : showAssumptions ? "Hide Assumptions" : "View Assumptions"}
              </button>
            </div>
            {showAssumptions && validationData && validationRates && validationSample && (
              <div style={{ marginTop: 16, border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                <ValidationDashboard rates={validationRates} sample={validationSample} validation={validationData} />
              </div>
            )}
          </>)}

          {section("Channel pacing", <>
            {bullet(<>New Business pacing targets on the Discovery tab are derived from {val("Revenue Share by Channel")} and average deal value. Changing either recalculates the targets.</>)}
            {bullet(<>Expansion pacing uses a separate quarterly revenue target, average deal size, and close rate.</>)}
            {bullet(<>Actuals count all deals that entered the pipeline this quarter across any active stage — not just Discovery entry — so deals that skip Discovery are not missed.</>)}
          </>)}

          {section("Pour Gas on These", <>
            {bullet(<>Surfaces deals in Legal, Proposal, or Demo with prospect-side activity in the last 7 days.</>)}
            {bullet(<>Signals tracked: inbound email replies, emails opened more than {val("3")} times (adjustable on the Overview tab), link clicks, and recent stage entry.</>)}
          </>)}

          {section("Needs Action", <>
            {bullet(<>Flags deals that are missing close dates, amounts, or close plans, are overdue or due within 21 days, or have had no activity in 60+ days.</>)}
            {bullet(<>Demo deals are flagged if there has been no contact in 14+ days.</>)}
            {bullet(<>Discovery deals are flagged if there has been no contact in 14+ days, or if the deal has been in Discovery for 60+ days with no movement.</>)}
          </>)}
        </div>
      </TableCard>

      {/* Avg Deal Value + ACV */}
      <TableCard>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 4, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Avg Deal Value
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 20, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            {rollingLabel}
          </div>

          {/* Editable NB assumption */}
          <div style={{ marginBottom: 20 }}>
            {editingAvg ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <label style={{ fontSize: 13, color: "#374151", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Avg New Business Deal Value (assumption)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>$</span>
                  <input type="number" value={tmpAvg} onChange={e => setTmpAvg(+e.target.value)}
                    style={{ width: 120, padding: "5px 8px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans', system-ui, sans-serif" }} />
                </div>
                <button onClick={handleSaveAvg} disabled={savingAvg}
                  style={{ background: "linear-gradient(135deg, #a0fad7, #82f6c6)", color: "#0a2e1f", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  {savingAvg ? "Saving…" : "Save"}
                </button>
                <button onClick={() => { setEditingAvg(false); setTmpAvg(assumptions.avg_deal_value); }}
                  style={{ background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 13, color: "#374151", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Avg New Business Deal Value (assumption)</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{fmtFull(assumptions.avg_deal_value)}</span>
                <button onClick={() => { setEditingAvg(true); setTmpAvg(assumptions.avg_deal_value); }}
                  style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e4ed", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Clickable metric tiles */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: openDrill ? 0 : 0 }}>
            <MetricValue
              label="All deals"
              value={hubspotRates?.avg_deal_value_all != null ? fmtFull(hubspotRates.avg_deal_value_all) : "—"}
              subLabel={`${rolling12M.length} deal${rolling12M.length !== 1 ? "s" : ""}`}
              active={openDrill === "all"}
              onClick={() => toggle("all")}
            />
            <MetricValue
              label="NB only"
              value={hubspotRates?.avg_deal_value != null ? fmtFull(hubspotRates.avg_deal_value) : "—"}
              subLabel={`${rolling12MNB.length} deal${rolling12MNB.length !== 1 ? "s" : ""}`}
              active={openDrill === "nb"}
              onClick={() => toggle("nb")}
            />
            <MetricValue
              label="Expansion"
              value={hubspotRates?.avg_deal_value_expansion != null ? fmtFull(hubspotRates.avg_deal_value_expansion) : "—"}
              subLabel={`${rolling12MExp.length} deal${rolling12MExp.length !== 1 ? "s" : ""}`}
              active={openDrill === "expansion"}
              onClick={() => toggle("expansion")}
            />
          </div>

          {/* Avg deal drill-down tables */}
          {openDrill === "all" && (
            <div style={{ marginTop: 16, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
              <FlatDealTable deals={sortByClose(rolling12M)} />
            </div>
          )}
          {openDrill === "nb" && (
            <div style={{ marginTop: 16, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
              <FlatDealTable deals={sortByClose(rolling12MNB)} />
            </div>
          )}
          {openDrill === "expansion" && (
            <div style={{ marginTop: 16, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
              <FlatDealTable deals={sortByClose(rolling12MExp)} />
            </div>
          )}

          {/* ACV section */}
          <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 20, paddingTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              Avg Account Contract Value (ACV)
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 16, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              All-time closed won · initial + expansion deals summed per account
            </div>
            <MetricValue
              label={`${accountCount} account${accountCount !== 1 ? "s" : ""}`}
              value={acv != null ? fmtFull(acv) : "—"}
              active={openDrill === "acv"}
              onClick={() => toggle("acv")}
            />
            {openDrill === "acv" && (
              <div style={{ marginTop: 16, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                <ACVTable deals={closedWonAllTime} />
              </div>
            )}
          </div>
        </div>
      </TableCard>

      {/* Quarterly Revenue Targets */}
      <TableCard>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 20, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Quarterly Revenue &amp; Close Targets
          </div>
          <div style={{ display: "flex", gap: 64, flexWrap: "wrap" }}>

            {/* Revenue */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Revenue</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 4, paddingBottom: 4, borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ width: 28 }}>Q</span>
                <span style={{ flex: 1, textAlign: "right" }}>Total</span>
                <span style={{ flex: 1, textAlign: "right" }}>New Business (⅔)</span>
                <span style={{ flex: 1, textAlign: "right" }}>Expansion (⅓)</span>
              </div>
              {QUARTERLY_TARGETS.map((total, i) => {
                const nb  = Math.round(total * NB_REVENUE_SHARE);
                const exp = total - nb;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ width: 28, color: "#374151", fontWeight: i === qIndex ? 700 : 400 }}>Q{i + 1}</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: i === qIndex ? 700 : 400 }}>{fmtK(total)}</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: i === qIndex ? 700 : 400 }}>{fmtK(nb)}</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: i === qIndex ? 700 : 400 }}>{fmtK(exp)}</span>
                  </div>
                );
              })}
              {(() => {
                const totalAll = QUARTERLY_TARGETS.reduce((s, v) => s + v, 0);
                const totalNB  = QUARTERLY_TARGETS.reduce((s, v) => s + Math.round(v * NB_REVENUE_SHARE), 0);
                const totalExp = totalAll - totalNB;
                return (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4, paddingTop: 4, borderTop: "1px solid #f1f5f9" }}>
                    <span style={{ width: 28, color: "#374151", fontWeight: 700 }}>Total</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: 700 }}>{fmtK(totalAll)}</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: 700 }}>{fmtK(totalNB)}</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: 700 }}>{fmtK(totalExp)}</span>
                  </div>
                );
              })()}
            </div>

            {/* Closes */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Closes</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 4, paddingBottom: 4, borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ width: 28 }}>Q</span>
                <span style={{ flex: 1, textAlign: "right" }}>New Business</span>
                <span style={{ flex: 1, textAlign: "right" }}>Expansion</span>
              </div>
              {QUARTERLY_TARGETS.map((_, i) => {
                const qd = deriveTargets(assumptions, i);
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ width: 28, color: "#374151", fontWeight: i === qIndex ? 700 : 400 }}>Q{i + 1}</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: i === qIndex ? 700 : 400 }}>{qd.qCloses}</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: i === qIndex ? 700 : 400 }}>{qd.expansionQCloses}</span>
                  </div>
                );
              })}
              {(() => {
                const totalNB  = QUARTERLY_TARGETS.reduce((s, _, i) => s + deriveTargets(assumptions, i).qCloses, 0);
                const totalExp = QUARTERLY_TARGETS.reduce((s, _, i) => s + deriveTargets(assumptions, i).expansionQCloses, 0);
                return (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4, paddingTop: 4, borderTop: "1px solid #f1f5f9" }}>
                    <span style={{ width: 28, color: "#374151", fontWeight: 700 }}>Total</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: 700 }}>{totalNB}</span>
                    <span style={{ flex: 1, textAlign: "right", color: "#374151", fontWeight: 700 }}>{totalExp}</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </TableCard>

    </div>
  );
}
