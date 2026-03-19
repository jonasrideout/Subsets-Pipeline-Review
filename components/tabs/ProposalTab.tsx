// components/tabs/ProposalTab.tsx

"use client";

import { useState } from "react";
import type { Deal, ClosePlanMap } from "@/types/deals";
import { ownerName, fmtCur, UNRESOLVED_OWNER_IDS } from "@/lib/deals";
import { TH, TD, TableCard } from "@/components/Table";
import { CloseDateBadge, UnresolvedOwnerBadge } from "@/components/Badges";
import DealLink from "@/components/DealLink";

interface ProposalTabProps {
  deals: Deal[];
  closePlans: ClosePlanMap;
  onClosePlanSave: (dealId: string, url: string) => Promise<void>;
  now: Date;
}

export default function ProposalTab({ deals, closePlans, onClosePlanSave, now }: ProposalTabProps) {
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [inputVal, setInputVal]     = useState("");
  const [saving, setSaving]         = useState(false);

  const handleSave = async (dealId: string) => {
    setSaving(true);
    await onClosePlanSave(dealId, inputVal);
    setSaving(false);
    setEditingId(null);
    setInputVal("");
  };

  return (
    <div>
      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#92400e", marginBottom: 12 }}>
        📎 Close plan links are persisted in Redis. Links survive page refreshes and new sessions.
      </div>

      <TableCard>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Company", "Amount", "Close Date", "Close Plan", "Owner"].map(h => (
                <TH key={h}>{h}</TH>
              ))}
            </tr>
          </thead>
          <tbody>
            {deals.map(d => (
              <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <TD><DealLink id={d.id} name={d.name} /></TD>
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
                        style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "3px 8px", fontSize: 12, width: 200 }}
                      />
                      <button
                        onClick={() => handleSave(d.id)}
                        disabled={saving}
                        style={{ background: "#00c896", color: "#1a1f36", border: "none", borderRadius: 5, padding: "3px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                      >
                        {saving ? "…" : "Save"}
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setInputVal(""); }}
                        style={{ background: "#f1f5f9", border: "none", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 12 }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : closePlans[d.id] ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <a href={closePlans[d.id]} target="_blank" rel="noopener noreferrer"
                        style={{ color: "#2563eb", fontSize: 12 }}>
                        📄 View
                      </a>
                      <button
                        onClick={() => { setEditingId(d.id); setInputVal(closePlans[d.id]); }}
                        style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 11 }}
                      >
                        edit
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => { setEditingId(d.id); setInputVal(""); }}
                      style={{ background: "none", border: "1px dashed #cbd5e1", borderRadius: 5, color: "#94a3b8", cursor: "pointer", fontSize: 12, padding: "2px 10px" }}
                    >
                      + add link
                    </button>
                  )}
                </TD>
                <TD style={{ color: "#374151" }}>
                  {ownerName(d.owner)}
                  {UNRESOLVED_OWNER_IDS.has(d.owner) && <UnresolvedOwnerBadge />}
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </div>
  );
}
