// components/tabs/ProposalTab.tsx

"use client";

import { useState } from "react";
import type { Deal, ClosePlanMap } from "@/types/deals";
import { ownerName, fmtDate, fmtCur, daysSince, UNRESOLVED_OWNER_IDS } from "@/lib/deals";
import { isStale } from "@/lib/flags";
import { TH, TD, TableCard } from "@/components/Table";
import { CloseDateBadge, UnresolvedOwnerBadge, StaleBadge, NoContactBadge, OverdueBadge, DueSoonBadge, NoClosePlanBadge, NoActivityBadge, NewQBadge } from "@/components/Badges";
import DealLink from "@/components/DealLink";

interface ProposalTabProps {
  deals: Deal[];
  closePlans: ClosePlanMap;
  onClosePlanSave: (dealId: string, url: string) => Promise<void>;
  now: Date;
  qStart: Date;
}

export default function ProposalTab({ deals, closePlans, onClosePlanSave, now, qStart }: ProposalTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputVal, setInputVal]   = useState("");
  const [saving, setSaving]       = useState(false);

  const handleSave = async (dealId: string) => {
    setSaving(true);
    await onClosePlanSave(dealId, inputVal);
    setSaving(false);
    setEditingId(null);
    setInputVal("");
  };

  return (
    <div>
      <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#4338ca", marginBottom: 12 }}>
        📎 Close plan links are persisted in Redis across sessions.
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
              const enteredDate = d.entered_proposal || d.entered_current;
              const daysIn      = daysSince(enteredDate, now);
              const lc          = daysSince(d.last_contacted, now);
              const stale       = isStale(d, now);
              const isNew       = enteredDate ? new Date(enteredDate) >= qStart : false;
              const daysUntil   = d.closedate ? Math.ceil((new Date(d.closedate).getTime() - now.getTime()) / 86400000) : null;

              return (
                <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f8faff")}
                  onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                  <TD><DealLink id={d.id} name={d.name} /></TD>
                  <TD style={{ color: d.channel ? "#374151" : "#f59e0b" }}>{d.channel ?? "⚠ missing"}</TD>
                  <TD style={{ fontWeight: 600 }}>{fmtCur(d.amount)}</TD>
                  <TD><CloseDateBadge dateStr={d.closedate} now={now} /></TD>
                  <TD>
                    {editingId === d.id ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          value={inputVal}
                          onChange={e => setInputVal(e.target.value)}
                          placeholder="Paste URL…"
                          autoFocus
                          style={{ border: "1px solid #c7d2fe", borderRadius: 6, padding: "3px 8px", fontSize: 12, width: 180, outline: "none" }}
                        />
                        <button onClick={() => handleSave(d.id)} disabled={saving}
                          style={{ background: "linear-gradient(135deg, #a0fad7, #82f6c6)", color: "#0a2e1f", border: "none", borderRadius: 5, padding: "3px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                          {saving ? "…" : "Save"}
                        </button>
                        <button onClick={() => { setEditingId(null); setInputVal(""); }}
                          style={{ background: "#f1f5f9", border: "none", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 12 }}>✕</button>
                      </div>
                    ) : closePlans[d.id] ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <a href={closePlans[d.id]} target="_blank" rel="noopener noreferrer"
                          style={{ color: "#6366f1", fontSize: 12 }}>📄 View</a>
                        <button onClick={() => { setEditingId(d.id); setInputVal(closePlans[d.id]); }}
                          style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 11 }}>edit</button>
                      </span>
                    ) : (
                      <button onClick={() => { setEditingId(d.id); setInputVal(""); }}
                        style={{ background: "none", border: "1px dashed #c7d2fe", borderRadius: 5, color: "#94a3b8", cursor: "pointer", fontSize: 12, padding: "2px 10px" }}>
                        + add link
                      </button>
                    )}
                  </TD>
                  <TD style={{ color: "#374151" }}>
                    {ownerName(d.owner)}
                    {UNRESOLVED_OWNER_IDS.has(d.owner) && <UnresolvedOwnerBadge />}
                  </TD>
                  <TD style={{ color: "#64748b" }}>{fmtDate(enteredDate)}</TD>
                  <TD style={{ color: lc !== null && lc >= 14 ? "#c2410c" : "#64748b" }}>
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
                    {!closePlans[d.id] && <NoClosePlanBadge />}
                    {(lc === null || lc >= 60) && <NoActivityBadge />}
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
