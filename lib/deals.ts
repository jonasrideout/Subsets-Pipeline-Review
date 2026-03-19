// lib/deals.ts

import type { Deal, DealStage } from "@/types/deals";

export const PORTAL_ID = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID ?? "25962322";

export const OWNERS: Record<string, string> = {
  "78829280":   "Jonas",
  "369437160":  "Nikolai",
  "1758144966": "Martin",
  "419064278":  "Martin", // formerly deactivated — deals migrating to 1758144966
  "31670265":   "Scott",
  "32168180":   "Judith",
  "76008179":   "David",
};

// Owner IDs whose deals should show an unresolved owner flag
export const UNRESOLVED_OWNER_IDS = new Set(["419064278"]);

export const STAGE_LABELS: Record<string, string> = {
  "1446534336":          "Legal",
  contractsent:          "Proposal",
  qualifiedtobuy:        "Demo",
  appointmentscheduled:  "Discovery",
  closedwon:             "Closed Won",
  closedlost:            "Closed Lost",
  "563428070":           "Closed Lost (Churn)",
  "582003949":           "Bad Fit",
};

export const STAGE_PROB: Record<string, number> = {
  "1446534336":         0.9,
  contractsent:         0.6,
  qualifiedtobuy:       0.2,
  appointmentscheduled: 0.1,
};

export const STAGE_COLORS: Record<string, {
  bg: string; border: string; text: string; accent: string;
}> = {
  legal: {
    bg: "#f0fdf4", border: "#86efac", text: "#15803d", accent: "#16a34a",
  },
  proposal: {
    bg: "#fffbeb", border: "#fde68a", text: "#92400e", accent: "#d97706",
  },
  demo: {
    bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", accent: "#2563eb",
  },
  discovery: {
    bg: "#faf5ff", border: "#e9d5ff", text: "#6b21a8", accent: "#7c3aed",
  },
};

export const stageColorKey = (stage: string) => {
  if (stage === "1446534336") return "legal";
  if (stage === "contractsent") return "proposal";
  if (stage === "qualifiedtobuy") return "demo";
  return "discovery";
};

export const stageColor = (stage: string) => STAGE_COLORS[stageColorKey(stage)];
export const stageLabel = (stage: string) => STAGE_LABELS[stage] ?? stage;
export const ownerName  = (id: string)    => OWNERS[id] ?? id;

export const dealUrl = (id: string) =>
  `https://app.hubspot.com/contacts/${PORTAL_ID}/record/0-3/${id}`;

// Active stage IDs used for deal pulls
export const ACTIVE_STAGE_IDS: DealStage[] = [
  "1446534336",
  "contractsent",
  "qualifiedtobuy",
  "appointmentscheduled",
];

export const NB_CHANNELS = ["Outbound", "Events", "Partnership", "Inbound"] as const;
export type NBChannel = typeof NB_CHANNELS[number];

// Channel pacing Q targets — sourced from GTM spreadsheet "Leads Required" ÷ 4
// These are independent of funnel math and do not change with Assumptions edits
export const CHANNEL_Q_TARGETS: Record<string, number> = {
  Outbound:    278,
  Events:      122,
  Partnership:  29,
  Inbound:      22,
  // Expansion is derived dynamically from assumptions — not hardcoded here
};

// Helpers
export const fmtDate = (s: string | null | undefined): string => {
  if (!s) return "—";
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
};

export const fmtCur = (n: number | null | undefined): string => {
  if (n == null) return "—";
  return "$" + (n >= 1000 ? (n / 1000).toFixed(0) + "K" : String(n));
};

export const daysSince = (s: string | null | undefined, now: Date): number | null => {
  if (!s) return null;
  return Math.floor((now.getTime() - new Date(s).getTime()) / 86400000);
};

export const filterByStage = (deals: Deal[], stage: DealStage) =>
  deals.filter(d => d.stage === stage);

export const weightedPipeline = (deals: Deal[]): number =>
  deals
    .filter(d => d.amount != null)
    .reduce((sum, d) => sum + (d.amount! * (STAGE_PROB[d.stage] ?? 0)), 0);
