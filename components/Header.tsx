// components/Header.tsx

"use client";

interface HeaderProps {
  asOf: string | null;
  loading: boolean;
  onRefresh: () => void;
  onRecalculate: () => void;
  recalculating: boolean;
}

// Returns true if we're in the first 7 days after a quarter end
function isRecalculateWindow(now: Date): boolean {
  const m = now.getMonth(); // 0-indexed
  const d = now.getDate();
  // Quarter ends: Mar(2), Jun(5), Sep(8), Dec(11)
  // Active window: first 7 days of Apr, Jul, Oct, Jan
  const isQuarterStart = m === 0 || m === 3 || m === 6 || m === 9;
  return isQuarterStart && d <= 7;
}

export default function Header({ asOf, loading, onRefresh, onRecalculate, recalculating }: HeaderProps) {
  const now       = asOf ? new Date(asOf) : new Date();
  const canRecalc = isRecalculateWindow(now);

  const formatted = asOf
    ? new Date(asOf).toLocaleString("en-US", {
        hour: "numeric", minute: "2-digit", hour12: true,
      })
    : "—";

  return (
    <header style={{
      background: "linear-gradient(135deg, #0f0a2e 0%, #1a0f4e 60%, #0d1a3a 100%)",
      borderBottom: "1px solid rgba(160, 250, 215, 0.15)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{
        padding: "0 24px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: 1600, margin: "0 auto", gap: 12,
      }}>
        {/* Left — logo + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #a0fad7 0%, #82f6c6 100%)",
            boxShadow: "0 0 20px rgba(160, 250, 215, 0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M17 8C17 5.79 14.76 4 12 4C9.24 4 7 5.79 7 8C7 10.21 9.24 12 12 12C14.76 12 17 13.79 17 16C17 18.21 14.76 20 12 20C9.24 20 7 18.21 7 16"
                stroke="#0a2e1f" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "white", letterSpacing: "-0.3px" }}>
                Pipeline Review
              </h1>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 999,
                background: "rgba(160, 250, 215, 0.15)", color: "#82f6c6",
                border: "1px solid rgba(130, 246, 198, 0.25)", letterSpacing: "0.3px",
              }}>SUBSETS</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(160, 250, 215, 0.6)", marginTop: 2 }}>
              {loading ? "Refreshing…" : `Refreshed ${formatted} · Q1 target: $600K`}
            </p>
          </div>
        </div>

        {/* Right — buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Recalculate assumptions button */}
          <button
            onClick={canRecalc ? onRecalculate : undefined}
            disabled={recalculating}
            title={canRecalc
              ? "Recalculate conversion rates from last 12 months of HubSpot data"
              : "Available in the first week after each quarter ends"}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.15)",
              background: canRecalc ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
              color: canRecalc ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
              cursor: canRecalc ? "pointer" : "not-allowed",
              transition: "all 0.15s",
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            {recalculating ? "Calculating…" : "Recalculate"}
          </button>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: loading ? "rgba(160, 250, 215, 0.4)" : "linear-gradient(135deg, #a0fad7 0%, #82f6c6 100%)",
              boxShadow: loading ? "none" : "0 0 20px rgba(160, 250, 215, 0.35)",
              color: "#0a2e1f", fontSize: 13, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", transition: "all 0.15s",
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
    </header>
  );
}
