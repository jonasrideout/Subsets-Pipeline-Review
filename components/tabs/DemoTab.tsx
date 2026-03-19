// components/tabs/DemoTab.tsx

"use client";

import { useState } from "react";
import type { Deal } from "@/types/deals";
import { ownerName, fmtDate, daysSince, UNRESOLVED_OWNER_IDS } from "@/lib/deals";
import { isEnteredInWindow } from "@/lib/flags";
import { TH, TD, TableCard } from "@/components/Table";
import { FlagBadge, UnresolvedOwnerBadge } from "@/components/Badges";
import DealLink from "@/components/DealLink";
import WindowToggle, { type WindowValue } from "@/components/WindowToggle";

interface DemoTabProps {
  deals: Deal[];
  now: Date;
  weekAgo: Date;
  qStart: Date;
}

export default function DemoTab({ deals, now, weekAgo, qStart }: DemoTabProps) {
  const [window, setWindow] = useState<WindowValue>("week");
  const windowStart = window === "week" ? weekAgo : qStart;

  const sorted = [...deals].sort((a, b) => {
    const la = a.last_contacted ? new Date(a.last_contacted).getTime() : 0;
    const lb = b.last_contacted ? new Date(b.last_contacted).getTime() : 0;
    return la - lb;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <WindowToggle value={window} onChange={setWindow} color="#2563eb" />
      </div>

      <TableCard>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Company", "Channel", "Owner", "Entered Demo", "Last Contact", "Flag"].map(h => (
                <TH key={h}>{h}</TH>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(d => {
              const isNew    = isEnteredInWindow(d, windowStart, now);
              const lc       = daysSince(d.last_contacted, now);
              const noContact = lc === null || lc >= 14;
              const rowBg    = isNew && noContact ? "#fef9f0"
                             : isNew              ? "#eff6ff"
                             : noContact          ? "#fffbeb"
                             : "white";

              return (
                <tr key={d.id} style={{ background: rowBg, borderBottom: "1px solid #f1f5f9" }}>
                  <TD><DealLink id={d.id} name={d.name} /></TD>
                  <TD style={{ color: d.channel ? "#374151" : "#f59e0b" }}>
                    {d.channel ?? "⚠ missing"}
                  </TD>
                  <TD style={{ color: "#374151" }}>
                    {ownerName(d.owner)}
                    {UNRESOLVED_OWNER_IDS.has(d.owner) && <UnresolvedOwnerBadge />}
                  </TD>
                  <TD style={{ color: "#64748b" }}>
                    {fmtDate(d.entered_demo || d.entered_current)}
                  </TD>
                  <TD style={{ color: noContact ? "#d97706" : "#374151" }}>
                    {d.last_contacted
                      ? `${fmtDate(d.last_contacted)} (${lc}d ago)`
                      : "—"}
                  </TD>
                  <TD>
                    {isNew     && <FlagBadge type="new" />}
                    {noContact && <FlagBadge type="nocontact" />}
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
