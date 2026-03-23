// components/DealTable.tsx
// CHANGES: InboundBadge redesigned; inbound7d added from sig

// ── REPLACE InboundBadge with this ───────────────────────────────────────────

function InboundBadge({ count }: { count: number }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: "rgba(34,197,94,0.1)", color: "#15803d",
      border: "1px solid rgba(34,197,94,0.25)", marginRight: 4, whiteSpace: "nowrap",
    }}>
      {/* arrow pointing into envelope */}
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 12 10 12 10 6" transform="rotate(-45 10 12)" />
        <line x1="4" y1="12" x2="14" y2="12" transform="rotate(-45 10 12)" />
      </svg>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
      {count}
    </span>
  );
}

// ── IN THE DEAL ROW — replace the sig destructuring with this ────────────────

          const sig         = emailSignals[String(d.id)] ?? {};
          const opens7d     = sig.opens7d    ?? 0;
          const clicks7d    = sig.clicks7d   ?? 0;
          const inbound7d   = sig.inbound7d  ?? 0;
          const lastInbound = sig.lastInbound ?? null;

// ── IN THE FLAGS CELL — replace the SOL badge block with this ────────────────

                {mode === "sol" ? (
                  <>
                    {inbound7d > 0 && <InboundBadge count={inbound7d} />}
                    {opens7d > 0 && <OpensBadge count={opens7d} />}
                    {clicks7d > 0 && <ClicksBadge count={clicks7d} />}
                    {enteredNew && !lastInbound && opens7d === 0 && clicks7d === 0 && <EnteredStageBadge />}
                  </>
