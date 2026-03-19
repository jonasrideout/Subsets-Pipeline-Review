// components/WindowToggle.tsx

"use client";

export type WindowValue = "week" | "quarter";

interface WindowToggleProps {
  value: WindowValue;
  onChange: (v: WindowValue) => void;
  color?: string;
}

export default function WindowToggle({
  value,
  onChange,
  color = "#2563eb",
}: WindowToggleProps) {
  return (
    <div
      style={{
        display: "flex",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        overflow: "hidden",
        fontSize: 12,
      }}
    >
      {(["week", "quarter"] as WindowValue[]).map(w => (
        <button
          key={w}
          onClick={() => onChange(w)}
          style={{
            padding: "5px 14px",
            border: "none",
            cursor: "pointer",
            fontWeight: value === w ? 700 : 400,
            background: value === w ? color : "#fff",
            color: value === w ? "white" : "#374151",
            transition: "background 0.1s",
          }}
        >
          {w === "week" ? "This Week" : "This Quarter"}
        </button>
      ))}
    </div>
  );
}
