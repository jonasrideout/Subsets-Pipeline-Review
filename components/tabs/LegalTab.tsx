// components/tabs/LegalTab.tsx

"use client";

import type { Deal, ClosePlanMap } from "@/types/deals";
import { isStale } from "@/lib/flags";
import { TableCard } from "@/components/Table";
import DealTable from "@/components/DealTable";
import StatCard from "@/components/StatCard";
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
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Currently in Legal" value={deals.length} />
        <StatCard label="New This Week"       value={legalNewW} />
        <StatCard label="New This Quarter" value={legalNewQ} target={legalQTarget} goalPct={goalPct} pacePct={pacePct} />
        <StatCard label="Stale >60 days"   value={staleCount} />
      </div>
      <TableCard>
        <DealTable
          deals={deals}
          mode="standard"
          closePlans={closePlans}
          now={now}
          qStart={qStart}
          weekAgo={weekAgo}
          enteredDateFn={d => d.entered_legal || d.entered_current}
        />
      </TableCard>
      <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#92400e", marginTop: 8 }}>
        <strong>Discussion:</strong> Current status and blockers — what needs to happen this week to move to signed?
      </div>
    </div>
  );
}
