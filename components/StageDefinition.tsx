// components/StageDefinition.tsx
"use client";

import React, { useState } from "react";

interface StageDef {
  summary: string;
  enter: string;
  exit: string;
  special?: string;
}

const STAGE_DEFS: Record<string, StageDef> = {
  discovery: {
    summary:
      "Companies that have shown concrete interest — asked for a meeting, attended a roundtable or sponsored event, or requested more info. The goal is to book a meeting or demo while running a nurture cadence in parallel.",
    enter:
      "Expressed interest in a concrete way: asked for a meeting or demo, attended a roundtable or sponsored event, or requested more info at a conference.",
    exit:
      "A meeting or demo is scheduled. Deals stalled for 2+ months move to Dormant/No Deal; contacts at those deals get tagged for nurture emails.",
    special:
      "Deals in this stage should not yet have a deal amount or a close date.",
  },
  demo: {
    summary:
      "Prospect has committed to a specific meeting time. The goal is to meet all stakeholders, establish fit, and build a tight close plan before advancing.",
    enter: "Meeting is scheduled.",
    exit:
      "Met all business, tech, and data stakeholders; closed all open questions; completed an airtight close plan. Deals stalled for 2+ months without progressing move back to Discovery/nurture.",
    special:
      "Offer to meet in person for qualified deals. Build relationships with multiple contacts at the account.",
  },
  proposal: {
    summary:
      "Agreeing on pricing and contract terms. The customer has asked for a formal proposal, success metrics are set, and the deal has an amount and close date in HubSpot.",
    enter:
      "Customer asked for a formal proposal; success metrics agreed; close date and deal amount added in HubSpot.",
    exit: "Agreement on terms, confirmed with a revised proposal or terms document.",
    special:
      "Offer to meet in person for qualified deals. Build relationships with multiple contacts at the account.",
  },
  legal: {
    summary:
      "The customer's legal team is engaged and both sides are working toward a signed agreement.",
    enter: "Customer has engaged their legal team.",
    exit: "Signed agreement.",
    special:
      "Offer to meet in person for qualified deals. Build relationships with multiple contacts at the account.",
  },
};

interface StageDefinitionProps {
  stage: "discovery" | "demo" | "proposal" | "legal";
}

export default function StageDefinition({ stage }: StageDefinitionProps) {
  const [expanded, setExpanded] = useState(false);
  const def = STAGE_DEFS[stage];
  if (!def) return null;

  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 20,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Summary row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 15, color: "#64748b", marginTop: 1 }}>📋</span>
        <p style={{ margin: 0, fontSize: 13.5, color: "#374151", lineHeight: 1.5, flex: 1 }}>
          {def.summary}
        </p>
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            color: "#6366f1",
            fontFamily: "'DM Sans', system-ui, sans-serif",
            whiteSpace: "nowrap",
            padding: "0 0 0 12px",
            flexShrink: 0,
          }}
        >
          {expanded ? "Less ▲" : "Details ▼"}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid #e2e8f0",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px 24px",
          }}
        >
          <div>
            <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 600, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Entrance criteria
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{def.enter}</p>
          </div>
          <div>
            <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 600, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Exit criteria
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{def.exit}</p>
          </div>
          {def.special && (
            <div style={{ gridColumn: "1 / -1" }}>
              <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 600, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Special conditions
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{def.special}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
