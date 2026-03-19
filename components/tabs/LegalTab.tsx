// components/tabs/LegalTab.tsx

"use client";

import type { Deal } from "@/types/deals";
import { ownerName, fmtCur, daysSince, UNRESOLVED_OWNER_IDS } from "@/lib/deals";
import { TH, TD, TableCard } from "@/components/Table";
import { CloseDateBadge, UnresolvedOwnerBadge } from "@/components/Badges";
import DealLink from "@/components/DealLink";

interface LegalTabProps {
  deals: Deal[];
  now: Date;
}

export default function LegalTab({ deals, now }: LegalTabProps) {
  return (
    <div>
      <TableCard>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Company", "Amount", "Close Date", "Owner", "Days in Stage"].map(h => (
                <TH key={h}>{h}</TH>
              ))}
            </tr>
          </thead>
          <tbody>
            {deals.map(d => {
              const daysIn = daysSince(d.entered_legal || d.entered_current, now);
              return (
                <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <TD><DealLink id={d.id} name={d.name} /></TD>
                  <TD style={{ fontWeight: 600, color: "#15803d" }}>{fmtCur(d.amount)}</TD>
                  <TD><CloseDateBadge dateStr={d.closedate} now={now} /></TD>
                  <TD style={{ color: "#374151" }}>
                    {ownerName(d.owner)}
                    {UNRESOLVED_OWNER_IDS.has(d.owner) && <UnresolvedOwnerBadge />}
                  </TD>
                  <TD style={{ color: "#374151" }}>{daysIn != null ? `${daysIn}d` : "—"}</TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>

      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#92400e" }}>
        <strong>Discussion:</strong> Current status and blockers — what needs to happen this week to move to signed?
      </div>
    </div>
  );
}
