"use client";

import { useState } from "react";
import type { Deal, ClosePlanMap } from "@/types/deals";
import { isStale } from "@/lib/flags";
import { TableCard } from "@/components/Table";
import DealTable from "@/components/DealTable";
import StatCard from "@/components/StatCard";
import type { PipelineCounts } from "@/app/page";

type NewFilter = "all" | "week" | "quarter";

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
  const [newFilter, setNewFilter] = useState<NewFilter>("all");

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
    if (newFilter === "week")    return !!d.createdate && new Date(d.createdate) >= weekAgo;
    if (newFilter === "quarter") return !!d.createdate && new Date(d.createdate) >= qStart;
    return true;
  });

  const toggleFilter = (f: NewFilter) => setNewFilter(prev => prev === f ? "all" : f);

  return (
    <div>
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Currently in Meeting / Demo" value={deals.length} />
        <StatCard
          label="New This Week"
          value={newThisWeek}
          onClick={() => toggleFilter("week")}
          active={newFilter === "week"}
        />
        <StatCard
          label="New This Quarter"
          value={newThisQ}
          target={demoQTarget}
          goalPct={goalPct}
          pacePct={pacePct}
          onClick={() => toggleFilter("quarter")}
          active={newFilter === "quarter"}
        />
        <StatCard label="Stale >60 days" value={staleCount} />
      </div>

      {/* Active filter label */}
      {newFilter !== "all" && (
        <div style={{ marginBottom: 10, fontSize: 12, color: "#64748b", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          Showing <strong>{newFilter === "week" ? "new this week" : "new this quarter"}</strong>
          {" "}({filtered.length} deal{filtered.length !== 1 ? "s" : ""})
          <button
            onClick={() => setNewFilter("all")}
            style={{ marginLeft: 10, fontSize: 11, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
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
