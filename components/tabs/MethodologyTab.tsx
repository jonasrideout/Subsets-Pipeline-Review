// components/tabs/MethodologyTab.tsx

"use client";

import { useState } from "react";
import type { Assumptions } from "@/types/deals";
import { deriveTargets, QUARTERLY_TARGETS, NB_REVENUE_SHARE } from "@/lib/assumptions";
import { TableCard } from "@/components/Table";

interface MethodologyTabProps {
  assumptions:       Assumptions;
  qIndex:            number;
  onAssumptionsSave: (a: Assumptions) => Promise<void>;
}

const fmtK    = (n: number) => "$" + Math.round(n / 1000) + "K";
const fmtFull = (n: number) => "$" + n.toLocaleString();

const HISTORICAL_AVG_DEAL_VALUE = 62137;

export default function MethodologyTab({ assumptions, qIndex, onAssumptionsSave }: MethodologyTabProps) {
  const derived = deriveTargets(assumptions, qIndex);

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

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>

      {/* How it works */}
      <TableCard>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 20, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            How this dashboard works
          </div>

          {section("Setting quarterly targets", <>
            {bullet(<>Each quarter has a combined revenue target split {val("⅔ New Business")} and {val("⅓ Expansion")}. The current quarter's NB target is {val(fmtK(derived.nbQRevenueTarget))}.</>)}
            {bullet(<>Average deal value converts the NB revenue target into a deal count. At {val(fmtFull(assumptions.avg_deal_value))} average deal value, that's {val(derived.qCloses)} NB closes needed this quarter.</>)}
            {bullet(<>Working backwards through four historical conversion rates, the dashboard derives how many deals need to enter each stage to produce those closes — Legal, Proposal, Demo, and Discovery.</>)}
            {bullet(<>Expansion uses its own close rate and average deal size, independent of the NB funnel. The current Expansion target is {val(derived.expansionQCloses)} closes this quarter.</>)}
          </>)}

          {section("Conversion rates", <>
            {bullet(<>Rates are calculated from 12 months of closed deals in HubSpot, tracking how many deals passed through each stage.</>)}
            {bullet(<>The Discovery→Demo rate ({val(assumptions.disc_to_demo + "%")}) is a manual estimate — historical data overstates it due to selection bias (only deals that eventually close or lose are counted).</>)}
            {bullet(<>Rates can be updated using the {val("Recalculate")} button, available in the first week after each quarter ends. A preview shows before any changes are applied.</>)}
            {bullet(<>Individual rates can also be edited manually using the Assumptions drawer under each stage tile on the Overview tab.</>)}
          </>)}

          {section("Channel pacing", <>
            {bullet(<>New Business pacing targets on the Discovery tab are derived from {val("Revenue Share by Channel")} and average deal value. Changing either recalculates the targets live.</>)}
            {bullet(<>Expansion pacing uses a separate quarterly revenue target, average deal size, and close rate.</>)}
            {bullet(<>Actuals count all deals that entered the pipeline this quarter across any active stage — not just Discovery entry — so deals that skip Discovery are not missed.</>)}
          </>)}

          {section("Pour Gas on These", <>
            {bullet(<>Surfaces deals in Legal, Proposal, or Demo with prospect-side activity in the last 7 days.</>)}
            {bullet(<>Signals tracked: inbound email replies, email opens above the minimum threshold, link clicks, and recent stage entry.</>)}
            {bullet(<>Email data is fetched per deal on each Refresh. The first page load may take a few extra seconds as email signals are gathered in batches to avoid rate limits.</>)}
          </>)}

          {section("Needs Action", <>
            {bullet(<>Flags deals that are missing close dates, amounts, or close plans, are overdue or due within 21 days, or have had no activity in 60+ days.</>)}
            {bullet(<>Demo deals are flagged if there has been no contact in 14+ days.</>)}
            {bullet(<>Discovery deals are never flagged — they are not expected to have close dates or amounts set.</>)}
          </>)}

          {section("Q / YTD toggle", <>
            {bullet(<>The toggle on the Overview tab switches between a quarterly view (default) and a full-year view.</>)}
            {bullet(<>In YTD mode, stage tile targets are the sum of all four quarterly targets. The revenue progress bar shows Closed Won YTD against the annual target, with quarterly milestone markers.</>)}
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
                <label style={{ fontSize: 13, color: "#374151", fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Avg NB Deal Value</label>
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
                <span style={{ fontSize: 13, color: "#374151", fontFamily: "'DM Sans', system-ui, sans-serif" }}>Avg NB Deal Value</span>
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
                <span style={{ flex: 1, textAlign: "right" }}>NB (⅔)</span>
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
                <span style={{ flex: 1, textAlign: "right" }}>NB</span>
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
