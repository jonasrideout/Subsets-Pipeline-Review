// components/PacingTable.tsx

"use client";
import React, { useState } from "react";
import { TH, TD } from "@/components/Table";
import type { Deal } from "@/types/deals";
import { ownerName, fmtDate, daysSince } from "@/lib/deals";
import DealLink from "@/components/DealLink";

const STAGE_LABELS: Record<string, string> = {
  "appointmentscheduled": "Discovery",
  "qualifiedtobuy":       "Meeting / Demo",
  "contractsent":         "Proposal / Negotiation",
  "1446534336":           "Legal / Procurement",
  "closedwon":            "Closed Won",
  "closedlost":           "Closed Lost",
  "563428070":            "Closed Lost Churn",
  "582003949":            "Bad Fit",
};

interface PacingTableProps {
  title:            string;
  channels:         string[];
  targets:          Record<string, number>;
  actuals:          Record<string, number>;
  squareBottom?:    boolean;
  dealsByChannel?:  Record<string, Deal[]>;
  now?:             Date;
}

export default function PacingTable({
  title, channels, targets, actuals, squareBottom = false, dealsByChannel, now = new Date(),
}: PacingTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const br = squareBottom ? "12px 12px 0 0" : "12px";

  return (
    <>
      {expanded && (
        <div
          onClick={() => setExpanded(null)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15,23,42,0.25)",
            zIndex: 10,
            backdropFilter: "blur(1px)",
          }}
        />
      )}
      <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: br, overflow: "hidden", position: "relative", zIndex: expanded ? 20 : "auto" }}>
        <div style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, color: "#374151", borderBottom: "1px solid #f1f5f9" }}>
          {title}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>{["Channel", "New This Q", "Q Target", "Pace"].map(h => <TH key={h}>{h}</TH>)}</tr>
          </thead>
          <tbody>
            {channels.map(ch => {
              const tgt      = targets[ch] ?? 0;
              const actual   = actuals[ch] ?? 0;
              const pct      = tgt > 0 ? actual / tgt : 0;
              const behind   = actual < tgt * 0.5;
              const chDeals  = dealsByChannel?.[ch] ?? [];
              const isOpen   = expanded === ch;
              const hasDeals = chDeals.length > 0;

              return (
                <React.Fragment key={ch}>
                  <tr
                    onClick={() => hasDeals && setExpanded(isOpen ? null : ch)}
                    style={{ cursor: hasDeals ? "pointer" : "default", background: isOpen ? "#f8fafc" : undefined }}
                  >
                    <TD>
                      <span style={{ fontWeight: 500 }}>{ch}</span>
                      {hasDeals && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: "#94a3b8" }}>
                          {isOpen ? "▲" : "▼"}
                        </span>
                      )}
                    </TD>
                    <TD>{actual}</TD>
                    <TD>
                      {tgt}
                      {behind && (
                        <span style={{ marginLeft: 8, background: "#fee2e2", color: "#dc2626", padding: "1px 7px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                          BEHIND
                        </span>
                      )}
                    </TD>
                    <TD>
                      <div style={{ background: "#f1f5f9", borderRadius: 6, height: 8, overflow: "hidden", width: 120 }}>
                        <div style={{ height: "100%", width: `${Math.min(100, pct * 100)}%`, background: behind ? "#ef4444" : "#00c896", borderRadius: 6 }} />
                      </div>
                    </TD>
                  </tr>

                  {isOpen && (
                    <tr>
                      <td colSpan={4} style={{ padding: "0 0 2px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                              {["Deal", "Owner", "Entered Discovery", "Days in Discovery", "Last Contacted", "Stage"].map(h => (
                                <th key={h} style={{ padding: "6px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {chDeals.map(d => {
                              const daysIn = daysSince(d.entered_discovery ?? d.entered_current, now);
                              const lc     = daysSince(d.last_contacted, now);
                              const stale  = daysIn !== null && daysIn >= 60;
                              return (
                                <tr key={d.id} style={{ borderBottom: "1px solid #f8fafc", background: stale ? "#fff7f7" : "#fff" }}>
                                  <td style={{ padding: "7px 16px", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                    <DealLink id={d.id} name={d.name} />
                                  </td>
                                  <td style={{ padding: "7px 16px", color: "#374151", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                    {ownerName(d.owner)}
                                  </td>
                                  <td style={{ padding: "7px 16px", color: "#8b90a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                    {fmtDate(d.entered_discovery ?? d.entered_current)}
                                  </td>
                                  <td style={{ padding: "7px 16px", fontWeight: stale ? 700 : 400, color: stale ? "#dc2626" : "#374151", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                    {daysIn != null ? daysIn + "d" : "—"}
                                  </td>
                                  <td style={{ padding: "7px 16px", color: lc !== null && lc >= 14 ? "#c2410c" : "#8b90a0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                    {d.last_contacted ? fmtDate(d.last_contacted) + " (" + lc + "d)" : "—"}
                                  </td>
                                  <td style={{ padding: "7px 16px", color: "#374151", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                    {STAGE_LABELS[d.stage] ?? d.stage}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
