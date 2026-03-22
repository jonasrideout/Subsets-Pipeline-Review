// components/tabs/DemoTab.tsx

"use client";

import type { Deal, ClosePlanMap } from "@/types/deals";
import { isStale } from "@/lib/flags";
import { TableCard } from "@/components/Table";
import DealTable from "@/components/DealTable";
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
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Currently in Meeting / Demo" value={deals.length} />
        <StatCard label="New This Week"                value={newThisWeek} />
        <StatCard label="New This Quarter" value={newThisQ} target={demoQTarget} goalPct={goalPct} pacePct={pacePct} />
        <StatCard label="Stale >60 days"   value={staleCount} />
      </div>
      <TableCard>
        <DealTable
          deals={sorted}
          mode="standard"
          closePlans={closePlans}
          now={now}
          qStart={qStart}
          weekAgo={weekAgo}
          enteredDateFn={d => d.entered_demo || d.entered_current}
        />
      </TableCard>
    </div>
  );
}
