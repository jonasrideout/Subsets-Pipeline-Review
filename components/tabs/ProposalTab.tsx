// components/tabs/ProposalTab.tsx

"use client";

import type { Deal, ClosePlanMap } from "@/types/deals";
import { isStale } from "@/lib/flags";
import { TableCard } from "@/components/Table";
import DealTable from "@/components/DealTable";
import StatCard from "@/components/StatCard";
import type { PipelineCounts } from "@/app/page";

interface ProposalTabProps {
  deals: Deal[];
  closePlans: ClosePlanMap;
  onClosePlanSave: (dealId: string, url: string) => Promise<void>;
  now: Date;
  weekAgo: Date;
  qStart: Date;
  counts: PipelineCounts;
  propQTarget: number;
}

export default function ProposalTab({ deals, closePlans, onClosePlanSave, now, weekAgo, qStart, counts, propQTarget }: ProposalTabProps) {
  const staleCount = deals.filter(d => isStale(d, now)).length;
  const { propNewW, propNewQ, qElapsedPct } = counts;
  const goalPct = propQTarget > 0 ? Math.round((propNewQ / propQTarget) * 100) : 0;
  const pacePct = propQTarget > 0 && qElapsedPct > 0 ? Math.round((propNewQ / propQTarget) / qElapsedPct * 100) : 0;

  return (
    <div>
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Currently in Proposal" value={deals.length} />
        <StatCard label="New This Week"          value={propNewW} />
        <StatCard label="New This Quarter" value={propNewQ} target={propQTarget} goalPct={goalPct} pacePct={pacePct} />
        <StatCard label="Stale >60 days"   value={staleCount} />
      </div>
      <TableCard>
        <DealTable
          deals={deals}
          mode="standard"
          closePlans={closePlans}
          onClosePlanSave={onClosePlanSave}
          now={now}
          qStart={qStart}
          weekAgo={weekAgo}
          enteredDateFn={d => d.entered_proposal || d.entered_current}
        />
      </TableCard>
    </div>
  );
}
