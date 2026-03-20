// components/tabs/DemoTab.tsx

"use client";

import type { Deal, ClosePlanMap } from "@/types/deals";
import { ownerName, fmtDate, fmtCur, daysSince, UNRESOLVED_OWNER_IDS } from "@/lib/deals";
import { isStale } from "@/lib/flags";
import { TH, TD, TableCard } from "@/components/Table";
import { CloseDateBadge, UnresolvedOwnerBadge, NewQBadge, StaleBadge, NoContactBadge } from "@/components/Badges";
import DealLink from "@/components/DealLink";
import StatCard from "@/components/StatCard";

import type { PipelineCounts } from "@/app/page";

interface DemoTabProps {
  deals: Deal[];
  allActive: Deal[];
  closePlans: ClosePlanMap;
  now: Date;
  weekAgo: Date;
  qStart: Date;
  demoQTarget: number;
  counts: PipelineCounts;
}

export default function DemoTab({ deals, allActive, closePlans, now, weekAgo, qStart, demoQTarget, counts }: DemoTabProps) {
  const { demoNewW: newThisWeek, demoNewQ: newThisQ, qElapsedPct } = counts;
  const staleCount = deals.filter(d => isStale(d, now)).length;
  const goalPct = demoQTarget > 0 ? Math.round((newThisQ / demoQTarget) * 100) : 0;
  const pacePct = demoQTarget > 0 && qElapsedPct > 0 ? Math.round((newThisQ / demoQTarget) / qElapsedPct * 100) : 0;

  const sorted = [...deals].sort((a, b) => {
    const la = a.last_contacted ? new Date(a.last_contacted).getTime() : 0;
    const lb = b.last_contacted ? new Date(b.last_contacted).getTime() : 0;
    return la - lb;
  });

  return (
    <div>
      {/* Summary cards */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Currently in Meeting / Demo" value={deals.length} accent />
        <StatCard label="New This Week"                value={newThisWeek} />
        <StatCard
          label="New This Quarter"
          value={newThisQ}
          target={demoQTarget}
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
            {sorted.map(d => {
              const enteredDate = d.entered_demo || d.entered_current;
              const daysIn      = daysSince(enteredDate, now);
              const lc          = daysSince(d.last_contacted, now);
              const isNew       = !!d.new_genuine;
              const stale       = isStale(d, now);
              const noContact   = lc === null || lc >= 14;

              return (
                <tr key={d.id} className="table-row-hover" style={{ borderBottom: "1px solid #f4f5f8" }}>
                  <TD><DealLink id={d.id} name={d.name} /></TD>
                  <TD style={{ color: d.channel ? "#374151" : "#f59e0b" }}>{d.channel ?? "⚠ missing"}</TD>
                  <TD style={{ fontWeight: 600 }}>{fmtCur(d.amount)}</TD>
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
                  <TD style={{ color: noContact ? "#c2410c" : "#8b90a0" }}>
                    {d.last_contacted ? `${fmtDate(d.last_contacted)} (${lc}d)` : "—"}
                  </TD>
                  <TD style={{ color: stale ? "#dc2626" : "#374151", fontWeight: stale ? 700 : 400 }}>
                    {daysIn != null ? `${daysIn}d` : "—"}
                  </TD>
                  <TD>
                    {isNew     && <NewQBadge createdate={d.createdate} />}
                    {stale     && <StaleBadge />}
                    {noContact && <NoContactBadge />}
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
