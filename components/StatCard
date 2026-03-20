// components/StatCard.tsx

"use client";

interface StatCardProps {
  label: string;
  value: number;
  accent?: boolean;
  sub?: string;        // optional secondary line e.g. "target: 63"
  subColor?: string;
}

export default function StatCard({ label, value, accent, sub, subColor = "#8b90a0" }: StatCardProps) {
  return (
    <div
      className="rounded-xl flex flex-col gap-1"
      style={{
        padding: "16px 20px",
        minWidth: 130,
        flex: 1,
        background: accent
          ? "linear-gradient(135deg, #A0FAD7 0%, #82F6C6 100%)"
          : "#ffffff",
        border: accent ? "none" : "1px solid #e2e4ed",
        boxShadow: accent
          ? "0 4px 16px rgba(130,246,198,0.35)"
          : "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <div
        className="text-3xl font-black leading-none tracking-tight"
        style={{ color: accent ? "#0a5c3c" : "#0f1117" }}
      >
        {value}
      </div>
      <div
        className="text-xs font-medium"
        style={{ color: accent ? "#1a7a52" : "#8b90a0" }}
      >
        {label}
      </div>
      {sub && (
        <div className="text-[11px] font-medium mt-0.5" style={{ color: subColor }}>
          {sub}
        </div>
      )}
    </div>
  );
}
