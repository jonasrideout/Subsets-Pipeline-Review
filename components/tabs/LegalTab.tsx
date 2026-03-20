// components/tabs/LegalTab.tsx

"use client";

import type { Deal, ClosePlanMap } from "@/types/deals";
import { ownerName, fmtDate, fmtCur, daysSince, UNRESOLVED_OWNER_IDS } from "@/lib/deals";
import { isStale } from "@/lib/flags";
import { TH, TD, TableCard } from "@/components/Table";
import { CloseDateBadge, UnresolvedOwnerBadge, StaleBadge, NoContactBadge, OverdueBadge, DueSoonBadge, NoClosePlanBadge, NoActivityBadge, NewQBadge } from "@/components/Badges";
import DealLink from "@/components/DealLink";

interface LegalTabProps {
  deals: Deal[];
  closePlans: ClosePlanMap;
  now: Date;
  qStart: Date;
}

export default function LegalTab({ deals, closePlans, now, qStart }: LegalTabProps) {
  return (
    <div>
      <TableCard>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Company", "Channel", "Amount", "Close Date", "Close Plan", "Owner", "Entered Stage", "Last Contact", "Days in Stage", "Flags"].map(h => (
                <TH key={h}>{h}</TH>
              ))}
            </tr>
          </thead>
          <tbody>
            {deals.map(d => {
              const enteredDate = d.entered_legal || d.entered_current;
              const daysIn      = daysSince(enteredDate, now);
              const lc          = daysSince(d.last_contacted, now);
              const stale       = isStale(d, now);
              const isNew       = enteredDate ? new Date(enteredDate) >= qStart : false;
              const daysUntil   = d.closedate ? Math.ceil((new Date(d.closedate).getTime() - now.getTime()) / 86400000) : null;

              return (
                <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                  onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                  <TD><DealLink id={d.id} name={d.name} /></TD>
                  <TD style={{ color: d.channel ? "#374151" : "#f59e0b" }}>{d.channel ?? "⚠ missing"}</TD>
                  <TD style={{ fontWeight: 600, color: "#15803d" }}>{fmtCur(d.amount)}</TD>
                  <TD><CloseDateBadge dateStr={d.closedate} now={now} /></TD>
                  <TD>
                    {closePlans[d.id]
                      ? <a href={closePlans[d.id]} target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1", fontSize: 12 }}>📄 View</a>
                      : <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>}
                  </TD>
                  <TD style={{ color: "#374151" }}>
                    {ownerName(d.owner)}
                    {UNRESOLVED_OWNER_IDS.has(d.owner) && <UnresolvedOwnerBadge />}
                  </TD>
                  <TD style={{ color: "#64748b" }}>{fmtDate(enteredDate)}</TD>
                  <TD style={{ color: lc !== null && lc >= 14 ? "#c2410c" : "#64748b" }}>
                    {d.last_contacted ? `${fmtDate(d.last_contacted)} (${lc}d)` : "—"}
                  </TD>
                  <TD style={{ color: stale ? "#dc2626" : "#374151", fontWeight: stale ? 700 : 400 }}>
                    {daysIn != null ? `${daysIn}d` : "—"}
                  </TD>
                  <TD>
                    {isNew && <NewQBadge createdate={d.createdate} />}
                    {stale && <StaleBadge />}
                    {lc !== null && lc >= 14 && <NoContactBadge />}
                    {daysUntil !== null && daysUntil < 0 && <OverdueBadge days={Math.abs(daysUntil)} />}
                    {daysUntil !== null && daysUntil >= 0 && daysUntil <= 21 && <DueSoonBadge days={daysUntil} />}
                    {!closePlans[d.id] && <NoClosePlanBadge />}
                    {(lc === null || lc >= 60) && <NoActivityBadge />}
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>
      <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#92400e" }}>
        <strong>Discussion:</strong> Current status and blockers — what needs to happen this week to move to signed?
      </div>
    </div>
  );
}
