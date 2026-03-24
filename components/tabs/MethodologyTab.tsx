// components/tabs/MethodologyTab.tsx

"use client";

import { useState } from "react";
import type { Assumptions, HubSpotRates } from "@/types/deals";
import { deriveTargets, QUARTERLY_TARGETS, NB_REVENUE_SHARE } from "@/lib/assumptions";
import { TableCard } from "@/components/Table";

interface MethodologyTabProps {
  assumptions:       Assumptions;
  qIndex:            number;
  hubspotRates:      HubSpotRates | null;
  onAssumptionsSave: (a: Assumptions) => Promise<void>;
}

const fmtK    = (n: number) => "$" + Math.round(n / 1000) + "K";
const fmtFull = (n: number) => "$" + n.toLocaleString();

const HISTORICAL_AVG_DEAL_VALUE = 62137;

export default function MethodologyTab({ assumptions, qIndex, hubspotRates, onAssumptionsSave }: MethodologyTabProps) {
  const derived = deriveTargets(assumptions, qIndex);

  // Build list of manually overridden rates
  const RATE_KEYS: { key: keyof Assumptions; label: string }[] = [
    { key: "disc_to_demo",   label: "Discovery→Demo" },
    { key: "demo_to_prop",   label: "Demo→Proposal" },
    { key: "prop_to_legal",  label: "Proposal→Legal" },
    { key: "legal_to_close", label: "Legal→Close" },
  ];
  const manualRates = RATE_KEYS.filter(({ key }) => {
    if (!hubspotRates) return false;
    const hsVal = hubspotRates[key as keyof HubSpotRates];
    return hsVal !== null && hsVal !== undefined && hsVal !== assumptions[key];
  });

  const [editingAvg, setEditingAvg] = useState(false);
  const [tmpAvg, setTmpAvg]         = useState<number>(assumptions.avg_deal_value);
  const [savingAvg, setSavingAvg]   = useState(false);

  const handleSaveAvg = async () => {
    setSavingAvg(true);
    await onAssumptionsSave({ ...assumptions, avg_deal_value: tmpAvg });
    setSavingAvg(false);
    setEditingAvg(false);
  };

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
            {bullet(<>Each stage tile on the Overview tab is color-coded by {val("pace ratio")}: how far you are toward the stage's quarterly target relative to how far through the quarter (or year) you are. Specifically: {val("(deals entered ÷ Q target) ÷ % of period elapsed")}.</>)}
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
            {bullet(<>The ℹ️ icon on each tile shows the exact percentage of goal reached and a plain-English interpretation. Color updates live when assumptions are edited.</>)}
          </>)}

          {section("Conversion rates", <>
            {bullet(<>Rates are calculated from 12 months of closed deals in HubSpot, tracking how many deals passed through each stage. Any rate can be manually overwritten using the Assumptions drawers on the Overview tab.{" "}
              {manualRates.length > 0
                ? <>Currently set manually: {manualRates.map(({ key, label }, i) => (
                    <span key={key}>{i > 0 ? ", " : ""}{val(`${label} (historically ${hubspotRates?.[key as keyof HubSpotRates]}%, set at ${assumptions[key]}%)`)}</span>
                  ))}.</>
                : <>No rates are currently manually overridden — all values match HubSpot historical data.</>
              }
            </>)}
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

      {/* Avg Deal Value */}
      <TableCard>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 20, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Avg Deal Value
          </div>
          {editingAvg ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                <label style={{ fontSize: 13, color: "#374151", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Avg New Business Deal Value</label>
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
              <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                12-month rolling avg <span style={{ fontWeight: 600, color: "#64748b" }}>{fmtFull(HISTORICAL_AVG_DEAL_VALUE)}</span>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "#374151", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Avg New Business Deal Value</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', system-ui, sans-serif" }}>{fmtFull(assumptions.avg_deal_value)}</span>
                <button onClick={() => { setEditingAvg(true); setTmpAvg(assumptions.avg_deal_value); }}
                  style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e4ed", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 12, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  Edit
                </button>
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                12-month rolling avg <span style={{ fontWeight: 600, color: "#64748b" }}>{fmtFull(HISTORICAL_AVG_DEAL_VALUE)}</span>
              </div>
            </div>
          )}
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
