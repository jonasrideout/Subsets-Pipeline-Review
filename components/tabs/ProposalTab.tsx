"use client";

import { useState } from "react";
import type { Deal, ClosePlanMap } from "@/types/deals";
import { isStale } from "@/lib/flags";
import { TableCard } from "@/components/Table";
import DealTable from "@/components/DealTable";
import StatCard from "@/components/StatCard";
import type { PipelineCounts } from "@/app/page";

type NewFilter = "all" | "week" | "quarter";

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
  const [newFilter, setNewFilter] = useState<NewFilter>("all");

  const staleCount = deals.filter(d => isStale(d, now)).length;
  const { propNewW, propNewQ, qElapsedPct } = counts;
  const goalPct = propQTarget > 0 ? Math.round((propNewQ / propQTarget) * 100) : 0;
  const pacePct = propQTarget > 0 && qElapsedPct > 0
    ? Math.round((propNewQ / propQTarget) / qElapsedPct * 100) : 0;

  const filtered = deals.filter(d => {
    if (newFilter === "week")    return !!d.createdate && new Date(d.createdate) >= weekAgo;
    if (newFilter === "quarter") return !!d.createdate && new Date(d.createdate) >= qStart;
    return true;
  });

  const toggleFilter = (f: NewFilter) => setNewFilter(prev => prev === f ? "all" : f);

  return (
    <div>
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Currently in Proposal" value={deals.length} />
        <StatCard
          label="New This Week"
          value={propNewW}
          onClick={() => toggleFilter("week")}
          active={newFilter === "week"}
        />
        <StatCard
          label="New This Quarter"
          value={propNewQ}
          target={propQTarget}
          goalPct={goalPct}
          pacePct={pacePct}
          onClick={() => toggleFilter("quarter")}
          active={newFilter === "quarter"}
        />
        <StatCard label="Stale >60 days" value={staleCount} />
      </div>

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
