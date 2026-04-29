// components/PacingTable.tsx

"use client";
import React, { useState } from "react";
import { TH, TD } from "@/components/Table";

import type { Deal } from "@/types/deals";

interface PacingTableProps {
  title:            string;
  channels:         string[];
  targets:          Record<string, number>;
  actuals:          Record<string, number>;
  squareBottom?:    boolean;
  dealsByChannel?:  Record<string, Deal[]>;
}

export default function PacingTable({
  title, channels, targets, actuals, squareBottom = false, dealsByChannel,
}: PacingTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const br = squareBottom ? "12px 12px 0 0" : "12px";

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: br, overflow: "hidden" }}>
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
                  <tr key={`${ch}-expanded`}>
                    <td colSpan={4} style={{ padding: "8px 20px 12px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        Deals — {ch}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px" }}>
                        {chDeals.map(d => (
                          <span
                            key={d.name}
                            style={{ fontSize: 12, color: "#374151", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "2px 9px", fontFamily: "'DM Sans', system-ui, sans-serif" }}
                          >
                            {d.name ?? "Unnamed deal"}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
