"use client";

import { useState } from "react";
import type { Deal, ClosePlanMap } from "@/types/deals";
import { isStale } from "@/lib/flags";
import { TableCard } from "@/components/Table";
import DealTable from "@/components/DealTable";
import StatCard from "@/components/StatCard";
import type { PipelineCounts } from "@/app/page";

type Filter = "all" | "week" | "quarter" | "stale";

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
  const [filter, setFilter] = useState<Filter>("all");

  const staleCount = deals.filter(d => isStale(d, now)).length;
  const { propNewW, propNewQ, qElapsedPct } = counts;
  const goalPct = propQTarget > 0 ? Math.round((propNewQ / propQTarget) * 100) : 0;
  const pacePct = propQTarget > 0 && qElapsedPct > 0
    ? Math.round((propNewQ / propQTarget) / qElapsedPct * 100) : 0;

  const filtered = deals.filter(d => {
    if (filter === "week")    return !!d.createdate && new Date(d.createdate) >= weekAgo;
    if (filter === "quarter") return !!d.createdate && new Date(d.createdate) >= qStart;
    if (filter === "stale")   return isStale(d, now);
    return true;
  });

  const toggle = (f: Filter) => setFilter(prev => prev === f ? "all" : f);

  const filterLabel: Record<Filter, string> = {
    all: "", week: "new this week", quarter: "new this quarter", stale: "stale >60 days",
  };

  return (
    <div>
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Currently in Proposal" value={deals.length} />
        <StatCard label="New This Week"    value={propNewW}   onClick={() => toggle("week")}    active={filter === "week"} />
        <StatCard label="New This Quarter" value={propNewQ}   target={propQTarget} goalPct={goalPct} pacePct={pacePct} onClick={() => toggle("quarter")} active={filter === "quarter"} />
        <StatCard label="Stale >60 days"   value={staleCount} onClick={() => toggle("stale")}   active={filter === "stale"} />
      </div>

      {filter !== "all" && (
        <div style={{ marginBottom: 10, fontSize: 12, color: "#64748b", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          Showing <strong>{filterLabel[filter]}</strong>
          {" "}({filtered.length} deal{filtered.length !== 1 ? "s" : ""})
          <button onClick={() => setFilter("all")}
            style={{ marginLeft: 10, fontSize: 11, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Show all
          </button>
        </div>
      )}

      <TableCard>
        <DealTable
          deals={filtered}
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
