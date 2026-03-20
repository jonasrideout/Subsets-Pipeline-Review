// components/StatCard.tsx

"use client";

interface StatCardProps {
  label: string;
  value: number;
  accent?: boolean;
  // For "New This Quarter" tiles — shows target, % of goal, and pace
  target?: number;
  goalPct?: number;   // actual ÷ target × 100
  pacePct?: number;   // (actual ÷ target) ÷ quarter elapsed × 100
}

export default function StatCard({ label, value, accent, target, goalPct, pacePct }: StatCardProps) {
  const hasMetrics = target !== undefined && goalPct !== undefined && pacePct !== undefined;

  return (
    <div
      style={{
        padding: "16px 20px",
        minWidth: 130,
        flex: 1,
        background: "#ffffff",
        border: "1px solid #e2e4ed",
        borderRadius: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          fontSize: 32,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: "-0.5px",
          color: "#0f1117",
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "#8b90a0",
          marginBottom: hasMetrics ? 8 : 0,
        }}
      >
        {label}
      </div>
      {hasMetrics && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "#b0b5c3",
            borderTop: "1px solid #f0f1f5",
            paddingTop: 6,
            lineHeight: 1.6,
          }}
        >
          <span>target: {target}</span>
          <span style={{ margin: "0 5px", opacity: 0.4 }}>·</span>
          <span style={{ color: goalPct >= 90 ? "#0a7a50" : goalPct >= 75 ? "#ca8a04" : goalPct >= 50 ? "#ea580c" : "#dc2626", fontWeight: 600 }}>
            {goalPct}% of goal
          </span>
          <span style={{ margin: "0 5px", opacity: 0.4 }}>·</span>
          <span style={{ color: pacePct >= 90 ? "#0a7a50" : pacePct >= 75 ? "#ca8a04" : pacePct >= 50 ? "#ea580c" : "#dc2626", fontWeight: 600 }}>
            pace: {pacePct}%
          </span>
        </div>
      )}
    </div>
  );
}
