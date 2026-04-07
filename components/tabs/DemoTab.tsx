"use client";

import { useState } from "react";
import type { Deal, ClosePlanMap } from "@/types/deals";
import { isStale } from "@/lib/flags";
import { TableCard } from "@/components/Table";
import DealTable from "@/components/DealTable";
import StatCard from "@/components/StatCard";
import type { PipelineCounts } from "@/app/page";

type Filter = "all" | "week" | "quarter" | "stale";

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
  const [filter, setFilter] = useState<Filter>("all");

  const { demoNewW: newThisWeek, demoNewQ: newThisQ, qElapsedPct } = counts;
  const staleCount = deals.filter(d => isStale(d, now)).length;
  const goalPct = demoQTarget > 0 ? Math.round((newThisQ / demoQTarget) * 100) : 0;
  const pacePct = demoQTarget > 0 && qElapsedPct > 0
    ? Math.round((newThisQ / demoQTarget) / qElapsedPct * 100) : 0;

  const sorted = [...deals].sort((a, b) => {
    const la = a.last_contacted ? new Date(a.last_contacted).getTime() : 0;
    const lb = b.last_contacted ? new Date(b.last_contacted).getTime() : 0;
    return la - lb;
  });

  const filtered = sorted.filter(d => {
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
        <StatCard label="Currently in Meeting / Demo" value={deals.length} />
        <StatCard label="New This Week"    value={newThisWeek} onClick={() => toggle("week")}    active={filter === "week"} />
        <StatCard label="New This Quarter" value={newThisQ}    target={demoQTarget} goalPct={goalPct} pacePct={pacePct} onClick={() => toggle("quarter")} active={filter === "quarter"} />
        <StatCard label="Stale >60 days"   value={staleCount}  onClick={() => toggle("stale")}   active={filter === "stale"} />
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
          now={now}
          qStart={qStart}
          weekAgo={weekAgo}
          enteredDateFn={d => d.entered_demo || d.entered_current}
          hiddenColumns={["amount", "closeDate", "closePlan"]}
        />
      </TableCard>
    </div>
  );
}
