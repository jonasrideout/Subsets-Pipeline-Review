// components/Badges.tsx

"use client";

import { stageColor, stageLabel } from "@/lib/deals";

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

  const [bg, color] =
    daysUntil < 0    ? ["#fef2f2", "#dc2626"] :
    daysUntil <= 14  ? ["#fff7ed", "#c2410c"] :
    daysUntil <= 30  ? ["#fffbeb", "#92400e"] :
                       ["#f0fdf4", "#15803d"];

  return (
    <span
      style={{
        background: bg,
        color,
        padding: "2px 7px",
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

// ── STAGE BADGE ───────────────────────────────────────────────────────────────

interface StageBadgeProps {
  stage: string;
}

export function StageBadge({ stage }: StageBadgeProps) {
  const c = stageColor(stage);
  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        padding: "2px 8px",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {stageLabel(stage)}
    </span>
  );
}

// ── FLAG BADGE ────────────────────────────────────────────────────────────────

interface FlagBadgeProps {
  type: "new" | "stale" | "nocontact";
}

const FLAG_STYLES = {
  new:       { bg: "#dbeafe", color: "#1e40af", label: "🆕 New" },
  stale:     { bg: "#fee2e2", color: "#dc2626", label: "🔴 Stale" },
  nocontact: { bg: "#fef3c7", color: "#92400e", label: "🟠 No contact" },
};

export function FlagBadge({ type }: FlagBadgeProps) {
  const s = FLAG_STYLES[type];
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: "2px 7px",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        marginRight: 4,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

// ── UNRESOLVED OWNER BADGE ────────────────────────────────────────────────────

export function UnresolvedOwnerBadge() {
  return (
    <span
      title="Owner ID unresolved — deals migrating to Martin"
      style={{
        background: "#fff7ed",
        color: "#c2410c",
        padding: "2px 6px",
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        marginLeft: 4,
        cursor: "help",
      }}
    >
      ⚠ owner?
    </span>
  );
}
