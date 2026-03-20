// components/Badges.tsx

"use client";

import { stageColor, stageLabel } from "@/lib/deals";

// ── SHARED PILL STYLE ─────────────────────────────────────────────────────────

const pill = (bg: string, color: string, border: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 9px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  background: bg,
  color,
  border: `1px solid ${border}`,
  whiteSpace: "nowrap" as const,
  marginRight: 4,
});

// ── CLOSE DATE BADGE ──────────────────────────────────────────────────────────

interface CloseDateBadgeProps {
  dateStr: string | null | undefined;
  now: Date;
}

export function CloseDateBadge({ dateStr, now }: CloseDateBadgeProps) {
  if (!dateStr) return <span style={{ color: "#94a3b8" }}>—</span>;

  const daysUntil = Math.ceil((new Date(dateStr).getTime() - now.getTime()) / 86400000);
  const d = new Date(dateStr);
  const label = `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;

  const [bg, color, border] =
    daysUntil < 0   ? ["rgba(239,68,68,0.1)",   "#dc2626", "rgba(239,68,68,0.25)"]   :
    daysUntil <= 14 ? ["rgba(249,115,22,0.1)",  "#c2410c", "rgba(249,115,22,0.25)"]  :
    daysUntil <= 30 ? ["rgba(234,179,8,0.1)",   "#92400e", "rgba(234,179,8,0.25)"]   :
                      ["rgba(34,197,94,0.1)",   "#15803d", "rgba(34,197,94,0.25)"];

  return <span style={pill(bg, color, border)}>{label}</span>;
}

// ── STAGE BADGE ───────────────────────────────────────────────────────────────

export function StageBadge({ stage }: { stage: string }) {
  const c = stageColor(stage);
  return (
    <span style={pill(c.bg, c.text, c.border)}>
      {stageLabel(stage)}
    </span>
  );
}

// ── FLAG BADGES ───────────────────────────────────────────────────────────────

export function NewQBadge({ createdate }: { createdate: string | null }) {
  const label = createdate
    ? `Q${Math.floor(new Date(createdate).getMonth() / 3) + 1} · ${String(new Date(createdate).getFullYear()).slice(2)}`
    : "New";
  return (
    <span style={pill("rgba(130,246,198,0.15)", "#059669", "rgba(130,246,198,0.4)")}>
      <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
        <polygon points="5,1 6.5,4 10,4.5 7.5,7 8.2,10.5 5,8.8 1.8,10.5 2.5,7 0,4.5 3.5,4"/>
      </svg>
      {label}
    </span>
  );
}

export function StaleBadge() {
  return (
    <span style={pill("rgba(239,68,68,0.1)", "#dc2626", "rgba(239,68,68,0.25)")}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      Stale
    </span>
  );
}

export function NoContactBadge() {
  return (
    <span style={pill("rgba(249,115,22,0.1)", "#c2410c", "rgba(249,115,22,0.25)")}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M4 4l16 16M10.68 10.68a2 2 0 0 0 2.64 2.64M6.87 6.87A8 8 0 0 0 4.42 9.92C3.9 11.04 4.58 12 5.7 12H8M17.13 17.13A8 8 0 0 1 4 12h0"/>
      </svg>
      No Contact
    </span>
  );
}

export function OverdueBadge({ days }: { days: number }) {
  return (
    <span style={pill("rgba(239,68,68,0.1)", "#dc2626", "rgba(239,68,68,0.25)")}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      Overdue {days}d
    </span>
  );
}

export function DueSoonBadge({ days }: { days: number }) {
  return (
    <span style={pill("rgba(234,179,8,0.1)", "#92400e", "rgba(234,179,8,0.3)")}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      {days}d away
    </span>
  );
}

export function NoClosePlanBadge() {
  return (
    <span style={pill("rgba(99,102,241,0.1)", "#4338ca", "rgba(99,102,241,0.25)")}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
      No Close Plan
    </span>
  );
}

export function NoActivityBadge() {
  return (
    <span style={pill("rgba(239,68,68,0.1)", "#dc2626", "rgba(239,68,68,0.25)")}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 5a10.94 10.94 0 0 0-2.06 6.06C3.07 15.41 6.21 19 12 19c1.81 0 3.44-.47 4.83-1.26"/>
      </svg>
      No Activity 60d
    </span>
  );
}

// ── UNRESOLVED OWNER ──────────────────────────────────────────────────────────

export function UnresolvedOwnerBadge() {
  return (
    <span
      title="Owner ID unresolved — deals migrating to Martin"
      style={pill("rgba(249,115,22,0.1)", "#c2410c", "rgba(249,115,22,0.25)")}
    >
      ⚠ owner?
    </span>
  );
}

// ── LEGACY FLAG BADGE (used in DemoTab / DiscoveryTab) ────────────────────────

interface FlagBadgeProps {
  type: "new" | "stale" | "nocontact";
}

export function FlagBadge({ type }: FlagBadgeProps) {
  if (type === "new")       return <NewQBadge />;
  if (type === "stale")     return <StaleBadge />;
  if (type === "nocontact") return <NoContactBadge />;
  return null;
}
