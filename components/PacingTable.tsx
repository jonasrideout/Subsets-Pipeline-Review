// components/PacingTable.tsx

"use client";

import { TH, TD } from "@/components/Table";

interface PacingTableProps {
  title:         string;
  channels:      string[];
  targets:       Record<string, number>;
  actuals:       Record<string, number>;
  squareBottom?: boolean; // true = square off bottom corners for attached drawer
}

export default function PacingTable({
  title, channels, targets, actuals, squareBottom = false,
}: PacingTableProps) {
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
            const tgt    = targets[ch] ?? 0;
            const actual = actuals[ch] ?? 0;
            const pct    = tgt > 0 ? actual / tgt : 0;
            const behind = actual < tgt * 0.5;
            return (
              <tr key={ch}>
                <TD><span style={{ fontWeight: 500 }}>{ch}</span></TD>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
