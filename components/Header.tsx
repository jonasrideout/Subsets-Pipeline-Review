// components/Header.tsx

"use client";

interface HeaderProps {
  asOf: string | null;
  loading: boolean;
  onRefresh: () => void;
}

export default function Header({ asOf, loading, onRefresh }: HeaderProps) {
  const formatted = asOf
    ? new Date(asOf).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "2-digit",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

  return (
    <header
      style={{
        background: "#1a1f36",
        padding: "0 24px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Left — logo + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "#00c896",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 16,
            color: "#1a1f36",
          }}
        >
          S
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>
              Pipeline Review
            </span>
            <span
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.7)",
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: 4,
                letterSpacing: 0.3,
              }}
            >
              SUBSETS
            </span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 1 }}>
            {loading ? "Refreshing…" : `Refreshed ${formatted} · Q1 target: $600K`}
          </div>
        </div>
      </div>

      {/* Right — refresh button */}
      <button
        onClick={onRefresh}
        disabled={loading}
        style={{
          background: loading ? "rgba(0,200,150,0.5)" : "#00c896",
          color: "#1a1f36",
          border: "none",
          borderRadius: 8,
          padding: "8px 16px",
          fontWeight: 700,
          fontSize: 13,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          transition: "background 0.15s",
        }}
      >
        <span style={{ fontSize: 14 }}>↻</span>
        {loading ? "Refreshing…" : "Refresh"}
      </button>
    </header>
  );
}
