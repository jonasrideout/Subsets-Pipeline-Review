// components/TabNav.tsx

"use client";

export type TabId = "overview" | "legal" | "proposal" | "demo" | "discovery";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview",  label: "Overview" },
  { id: "legal",     label: "Legal / Procurement" },
  { id: "proposal",  label: "Proposal / Negotiation" },
  { id: "demo",      label: "Meeting / Demo" },
  { id: "discovery", label: "Discovery" },
];

interface TabNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export default function TabNav({ active, onChange }: TabNavProps) {
  return (
    <div style={{
      background: "white",
      borderBottom: "1px solid rgba(99, 102, 241, 0.1)",
      padding: "0 24px",
      display: "flex",
      gap: 0,
    }}>
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{
            padding: "14px 18px",
            border: "none",
            borderBottom: active === id ? "2px solid #82f6c6" : "2px solid transparent",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: active === id ? 700 : 500,
            background: "transparent",
            color: active === id ? "#0f172a" : "#94a3b8",
            marginBottom: -1,
            transition: "all 0.1s",
            whiteSpace: "nowrap",
            letterSpacing: "-0.1px",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
