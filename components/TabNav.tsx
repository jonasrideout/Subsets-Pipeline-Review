// components/TabNav.tsx

"use client";

export type TabId = "overview" | "legal" | "proposal" | "demo" | "discovery";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview",   label: "Overview" },
  { id: "legal",      label: "Legal / Procurement" },
  { id: "proposal",   label: "Proposal / Negotiation" },
  { id: "demo",       label: "Meeting / Demo" },
  { id: "discovery",  label: "Discovery" },
];

interface TabNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export default function TabNav({ active, onChange }: TabNavProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        borderBottom: "2px solid #e2e8f0",
        marginBottom: 20,
        background: "white",
        padding: "0 24px",
      }}
    >
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{
            padding: "10px 16px",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: active === id ? 700 : 500,
            background: "transparent",
            color: active === id ? "#00c896" : "#64748b",
            borderBottom: active === id ? "2.5px solid #00c896" : "2.5px solid transparent",
            marginBottom: -2,
            transition: "color 0.1s",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
