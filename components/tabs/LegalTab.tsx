// components/tabs/LegalTab.tsx

"use client";

import type { Deal, ClosePlanMap } from "@/types/deals";
import { ownerName, fmtDate, fmtCur, daysSince, UNRESOLVED_OWNER_IDS } from "@/lib/deals";
import { isStale } from "@/lib/flags";
import { TH, TD, TableCard } from "@/components/Table";
import { CloseDateBadge, UnresolvedOwnerBadge, NewQBadge, StaleBadge, NoContactBadge, OverdueBadge, DueSoonBadge, NoClosePlanBadge, NoActivityBadge } from "@/components/Badges";
import DealLink from "@/components/DealLink";
import StatCard from "@/components/StatCard";
import type { PipelineCounts } from "@/app/page";

import type { PipelineCounts } from "@/app/page";

interface LegalTabProps {
  deals: Deal[];
  closePlans: ClosePlanMap;
  now: Date;
  weekAgo: Date;
  qStart: Date;
  counts: PipelineCounts;
  legalQTarget: number;
}

export default function LegalTab({ deals, closePlans, now, weekAgo, qStart, counts, legalQTarget }: LegalTabProps) {
  const staleCount = deals.filter(d => isStale(d, now)).length;
  const { legalNewW, legalNewQ, qElapsedPct } = counts;
  const goalPct = legalQTarget > 0 ? Math.round((legalNewQ / legalQTarget) * 100) : 0;
  const pacePct = legalQTarget > 0 && qElapsedPct > 0 ? Math.round((legalNewQ / legalQTarget) / qElapsedPct * 100) : 0;

  return (
    <div>
      {/* Summary cards */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Currently in Legal" value={deals.length} accent />
        <StatCard label="New This Week"       value={legalNewW} />
        <StatCard
          label="New This Quarter"
          value={legalNewQ}
          target={legalQTarget}
          goalPct={goalPct}
          pacePct={pacePct}
        />
        <StatCard label="Stale >60 days" value={staleCount} />
      </div>

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
              const isNew       = !!d.createdate && new Date(d.createdate) >= qStart;
              const daysUntil   = d.closedate ? Math.ceil((new Date(d.closedate).getTime() - now.getTime()) / 86400000) : null;

              return (
                <tr key={d.id} className="table-row-hover" style={{ borderBottom: "1px solid #f4f5f8" }}>
                  <TD><DealLink id={d.id} name={d.name} /></TD>
                  <TD style={{ color: d.channel ? "#374151" : "#f59e0b" }}>{d.channel ?? "⚠ missing"}</TD>
                  <TD style={{ fontWeight: 600, color: "#15803d" }}>{fmtCur(d.amount)}</TD>
                  <TD><CloseDateBadge dateStr={d.closedate} now={now} /></TD>
                  <TD>
                    {closePlans[d.id]
                      ? <a href={closePlans[d.id]} target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1", fontSize: 12 }}>📄 View</a>
                      : <span style={{ color: "#b0b5c3", fontSize: 12 }}>—</span>}
                  </TD>
                  <TD style={{ color: "#374151" }}>
                    {ownerName(d.owner)}
                    {UNRESOLVED_OWNER_IDS.has(d.owner) && <UnresolvedOwnerBadge />}
                  </TD>
                  <TD style={{ color: "#8b90a0" }}>{fmtDate(enteredDate)}</TD>
                  <TD style={{ color: lc !== null && lc >= 14 ? "#c2410c" : "#8b90a0" }}>
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
