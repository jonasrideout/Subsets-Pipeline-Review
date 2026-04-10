"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useEmails } from "@/lib/useEmails";
import { getTemplate } from "@/lib/templates";
import {
  EmailRecord,
  TIME_RANGES,
  getCutoffMs,
  fmtDate,
  hsEmailUrl,
  hsContactUrl,
  gmailUrl,
  OWNERS,
} from "@/lib/types";
import MobileView from "@/components/MobileView";

const OWNER_STORAGE_KEY = "engagement:selectedOwner";

const DIR_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  EMAIL:          { bg: "rgba(160,250,215,0.15)", color: "#0a7a50", border: "rgba(130,246,198,0.4)", label: "Outbound" },
  INCOMING_EMAIL: { bg: "#f3f4f6",                color: "#6b7280", border: "#e5e7eb",               label: "Inbound"  },
};

function EyeIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>;
}

function ClickIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3L9 14L12.5 10.5L14.5 15.5L16.5 14.5L14.5 9.5L19 9.5Z"/></svg>;
}

function ActivityBadges({ openCount, clickCount, minOpens, hasReply }: { openCount: number; clickCount: number; minOpens: number; hasReply?: boolean }) {
  const triggered = openCount >= minOpens;
  return (
    <div className="flex items-center gap-1.5">
      {hasReply && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600,
          background: "rgba(34,197,94,0.1)", color: "#15803d",
          border: "1px solid rgba(34,197,94,0.25)", whiteSpace: "nowrap",
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="12" x2="18" y2="12"/><polyline points="12,6 18,12 12,18"/>
          </svg>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </span>
      )}
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap"
        style={{ background: triggered ? "rgba(160,250,215,0.2)" : "#f4f5f8", color: triggered ? "#0a7a50" : "#b0b5c3", borderColor: triggered ? "rgba(130,246,198,0.5)" : "#e8eaf0" }}>
        <EyeIcon />{openCount}
      </span>
      {clickCount >= 1 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap"
          style={{ background: "rgba(46,0,158,0.08)", color: "#2E009E", borderColor: "rgba(46,0,158,0.25)" }}>
          <ClickIcon />{clickCount}
        </span>
      )}
    </div>
  );
}

function SequenceBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap"
      style={{ background: "rgba(46,0,158,0.06)", color: "#2E009E", borderColor: "rgba(46,0,158,0.2)" }}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      {name}
    </span>
  );
}

function GmailButton({ label, to, subject, body, alreadySent, onSend, onUnsend }: {
  label: string; to: string; subject: string; body: string;
  alreadySent: boolean; onSend: () => void; onUnsend: () => void;
}) {
  const [justSent, setJustSent] = useState(false);
  const sent = alreadySent || justSent;

  const handleClick = (ev: React.MouseEvent) => {
    if (sent) {
      ev.preventDefault();
      setJustSent(false);
      onUnsend();
    } else {
      setJustSent(true);
      onSend();
    }
  };

  return sent ? (
    <button onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap"
      style={{ background: "rgba(160,250,215,0.2)", color: "#0a7a50", borderColor: "rgba(130,246,198,0.6)" }}
      title="Click to mark as not sent">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      {label}
    </button>
  ) : (
    <a href={gmailUrl(to, subject, body)} target="_blank" rel="noopener noreferrer" onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap"
      style={{ background: "#fff", color: "#2E009E", borderColor: "rgba(46,0,158,0.3)", boxShadow: "0 1px 3px rgba(46,0,158,0.08)" }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
        <path d="M2 6C2 4.9 2.9 4 4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6Z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 6L12 13L22 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      {label}
    </a>
  );
}

function MarkClientButton({ onMark }: { onMark: () => void }) {
  return (
    <button onClick={onMark}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all hover:border-amber-300 hover:text-amber-600"
      style={{ color: "#b0b5c3", borderColor: "#e8eaf0" }}
      title="Mark as client — filter from alerts">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
      </svg>
      Client
    </button>
  );
}

function Skeleton({ w = "60px" }: { w?: string }) {
  return <span className="inline-block rounded-md animate-pulse" style={{ width: w, height: "9px", background: "rgba(160,250,215,0.3)" }} />;
}

// ── Stat cards ────────────────────────────────────────────────────────────

function TotalCard({ value }: { value: number }) {
  return (
    <div className="rounded-xl px-5 py-4 min-w-[120px] flex flex-col gap-1"
      style={{
        background: "linear-gradient(135deg, #A0FAD7 0%, #82F6C6 100%)",
        border:     "none",
        boxShadow:  "0 4px 16px rgba(130,246,198,0.35)",
      }}>
      <div className="text-3xl font-black leading-none tracking-tight" style={{ color: "#0a5c3c" }}>{value}</div>
      <div className="text-xs font-medium" style={{ color: "#1a7a52" }}>Total</div>
    </div>
  );
}

function OpensCard({ value, minOpens, active, onClick, onAdjust }: {
  value: number; minOpens: number; active: boolean;
  onClick: () => void; onAdjust: (delta: number) => void;
}) {
  return (
    <div onClick={onClick}
      className="rounded-xl px-5 py-4 min-w-[140px] flex flex-col gap-1 cursor-pointer select-none transition-all"
      style={{
        background:  active ? "rgba(160,250,215,0.15)" : "#fff",
        border:      active ? "1.5px solid rgba(130,246,198,0.7)" : "1px solid #e8eaf0",
        boxShadow:   active ? "0 4px 16px rgba(130,246,198,0.2)" : "0 1px 4px rgba(0,0,0,0.05)",
      }}>
      <div className="text-3xl font-black leading-none tracking-tight" style={{ color: active ? "#0a5c3c" : "#0f1117" }}>{value}</div>
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <div className="text-xs font-medium" style={{ color: active ? "#1a7a52" : "#8b90a0" }}>
          {minOpens}+ Opens
        </div>
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); onAdjust(-1); }}
            className="w-4 h-4 rounded flex items-center justify-center text-xs font-bold leading-none transition-colors"
            style={{ color: "#8b90a0", background: "rgba(0,0,0,0.04)" }}>−</button>
          <button
            onClick={(e) => { e.stopPropagation(); onAdjust(1); }}
            className="w-4 h-4 rounded flex items-center justify-center text-xs font-bold leading-none transition-colors"
            style={{ color: "#8b90a0", background: "rgba(0,0,0,0.04)" }}>+</button>
        </div>
      </div>
    </div>
  );
}

function FilterCard({ label, value, active, onClick }: {
  label: string; value: number; active: boolean; onClick: () => void;
}) {
  return (
    <div onClick={onClick}
      className="rounded-xl px-5 py-4 min-w-[120px] flex flex-col gap-1 cursor-pointer select-none transition-all"
      style={{
        background:  active ? "rgba(160,250,215,0.15)" : "#fff",
        border:      active ? "1.5px solid rgba(130,246,198,0.7)" : "1px solid #e8eaf0",
        boxShadow:   active ? "0 4px 16px rgba(130,246,198,0.2)" : "0 1px 4px rgba(0,0,0,0.05)",
      }}>
      <div className="text-3xl font-black leading-none tracking-tight" style={{ color: active ? "#0a5c3c" : "#0f1117" }}>{value}</div>
      <div className="text-xs font-medium" style={{ color: active ? "#1a7a52" : "#8b90a0" }}>{label}</div>
    </div>
  );
}

export default function Home() {
  const { emails, stage, error, lastRefresh, refresh, loadMore, hasMore, appState, saveState } = useEmails();

  // ── Mobile detection ──────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [selectedOwner, setSelectedOwner] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem(OWNER_STORAGE_KEY) ?? OWNERS[0].id;
    return OWNERS[0].id;
  });

  const [hideAllPrompt, setHideAllPrompt] = useState<{ emailId: string; contactEmail: string } | null>(null);
  const [clientPrompt,  setClientPrompt]  = useState<{ domain: string; name: string } | null>(null);
  const [showHidden,    setShowHidden]    = useState(false);
  const [filter,        setFilter]        = useState<"all" | "opens" | "clicks" | "sequences">("all");
  const [minOpens,      setMinOpens]      = useState(3);
  const [timeRange,     setTimeRange]     = useState<"24h" | "week" | "month" | "ytd">("24h");

  const cutoffMs  = getCutoffMs(timeRange);
  const enriching = stage === "enriching";
  const isLoading = stage === "fetching" || stage === "enriching";

  const hiddenSet = useMemo(() => new Set(appState.hiddenIds), [appState.hiddenIds]);
  const sentE1Set = useMemo(() => new Set(appState.sentE1),    [appState.sentE1]);
  const sentE2Set = useMemo(() => new Set(appState.sentE2),    [appState.sentE2]);

  useEffect(() => {
    localStorage.setItem(OWNER_STORAGE_KEY, selectedOwner);
    refresh(cutoffMs, selectedOwner, minOpens);
  }, [selectedOwner, timeRange]);

  const toggleFilter = (f: "opens" | "clicks" | "sequences") => {
    setFilter((prev) => prev === f ? "all" : f);
  };

  const adjustMinOpens = (delta: number) => {
    setMinOpens((prev) => Math.max(1, prev + delta));
  };

  // ── State handlers ────────────────────────────────────────────────────────
  const handleHide = useCallback((id: string, primaryEmail: string) => {
    const next = [...new Set([...appState.hiddenIds, id])];
    saveState(selectedOwner, { hiddenIds: next });
    setHideAllPrompt({ emailId: id, contactEmail: primaryEmail });
    setTimeout(() => setHideAllPrompt(null), 6000);
  }, [appState.hiddenIds, selectedOwner, saveState]);

  const handleUnhide = useCallback((id: string) => {
    const next = appState.hiddenIds.filter((h) => h !== id);
    saveState(selectedOwner, { hiddenIds: next });
  }, [appState.hiddenIds, selectedOwner, saveState]);

  const handleHideAllFromContact = useCallback((contactEmail: string) => {
    const domain = contactEmail.split("@")[1]?.toLowerCase();
    if (!domain) return;
    const toHide = emails.filter((e) => e.to_email.split(";")[0].trim().toLowerCase().split("@")[1] === domain).map((e) => e.id);
    const next = [...new Set([...appState.hiddenIds, ...toHide])];
    saveState(selectedOwner, { hiddenIds: next });
    setHideAllPrompt(null);
  }, [emails, appState.hiddenIds, selectedOwner, saveState]);

  const handleSentE1 = useCallback((id: string) => {
    const next = [...new Set([...appState.sentE1, id])];
    saveState(selectedOwner, { sentE1: next });
  }, [appState.sentE1, selectedOwner, saveState]);

  const handleSentE2 = useCallback((id: string) => {
    const next = [...new Set([...appState.sentE2, id])];
    saveState(selectedOwner, { sentE2: next });
  }, [appState.sentE2, selectedOwner, saveState]);

  const handleUnsendE1 = useCallback((id: string) => {
    const next = appState.sentE1.filter((s) => s !== id);
    saveState(selectedOwner, { sentE1: next });
  }, [appState.sentE1, selectedOwner, saveState]);

  const handleUnsendE2 = useCallback((id: string) => {
    const next = appState.sentE2.filter((s) => s !== id);
    saveState(selectedOwner, { sentE2: next });
  }, [appState.sentE2, selectedOwner, saveState]);

  const handleMarkClient = useCallback((primaryEmail: string, companyName: string | null) => {
    const domain = primaryEmail.split("@")[1]?.toLowerCase();
    if (!domain) return;
    setClientPrompt({ domain, name: companyName || domain });
  }, []);

  const [blockedDomains, setBlockedDomains] = useState<Set<string>>(new Set());

  const confirmMarkClient = useCallback(async (domain: string, name: string) => {
    await fetch("/api/clients-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, domains: [domain] }),
    });
    setClientPrompt(null);
    setBlockedDomains((prev) => new Set([...prev, domain]));
    refresh(cutoffMs, selectedOwner, minOpens);
  }, [cutoffMs, selectedOwner, refresh]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const applyFilter = (e: EmailRecord) => {
    if (hiddenSet.has(e.id)) return false;
    const emailDomain = e.to_email.split(";")[0].trim().toLowerCase().split("@")[1] ?? "";
    if (blockedDomains.has(emailDomain)) return false;
    if (e.direction === "INCOMING_EMAIL") return true;
    if (!(e.open_count >= minOpens || e.click_count >= 1 || e.has_reply)) return false;
    if (filter === "opens")     return e.open_count >= minOpens;
    if (filter === "clicks")    return e.click_count >= 1;
    if (filter === "sequences") return e.in_sequence === true;
    return true;
  };

  const visibleRows = useMemo(
    () => emails.filter(applyFilter).sort((a, b) =>
      new Date(b.modified_date || b.created_date).getTime() - new Date(a.modified_date || a.created_date).getTime()
    ),
    [emails, filter, minOpens, hiddenSet, blockedDomains]
  );

  // Counts always based on full unfiltered set (for stat cards)
  const allRows = useMemo(
    () => emails.filter((e) => {
      if (hiddenSet.has(e.id)) return false;
      const emailDomain = e.to_email.split(";")[0].trim().toLowerCase().split("@")[1] ?? "";
      if (blockedDomains.has(emailDomain)) return false;
      if (e.direction === "INCOMING_EMAIL") return true;
      if (!(e.open_count >= minOpens || e.click_count >= 1 || e.has_reply)) return false;
      return true;
    }),
    [emails, minOpens, hiddenSet, blockedDomains]
  );

  const hiddenRows  = emails.filter((e) => hiddenSet.has(e.id));
  const displayRows = showHidden ? hiddenRows : visibleRows;

  const activeToast = clientPrompt ? "client" : hideAllPrompt ? "hide" : null;

  // ── Mobile render ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <MobileView
        emails={emails}
        stage={stage}
        lastRefresh={lastRefresh}
        selectedOwner={selectedOwner}
        setSelectedOwner={setSelectedOwner}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        minOpens={minOpens}
        setMinOpens={setMinOpens}
        hiddenSet={hiddenSet}
        blockedDomains={blockedDomains}
        sentE1Set={sentE1Set}
        sentE2Set={sentE2Set}
        handleSentE1={handleSentE1}
        handleSentE2={handleSentE2}
        handleUnsendE1={handleUnsendE1}
        handleUnsendE2={handleUnsendE2}
        refresh={refresh}
        getCutoffMs={getCutoffMs}
        isLoading={isLoading}
      />
    );
  }

  // ── Desktop render ────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&family=DM+Mono:wght@400;500&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .mono { font-family: 'DM Mono', monospace; }
        .table-row-hover:hover { background: rgba(160,250,215,0.07) !important; }
        .pill-btn { transition: all 0.15s ease; }
        .pill-btn:hover { transform: translateY(-1px); }
      `}</style>

      <div className="min-h-screen" style={{ background: "#f5f6fa" }}>

        {/* ── Header ── */}
        <header style={{ background: "linear-gradient(135deg, #0f0a2e 0%, #1a0f4e 60%, #0d1a3a 100%)", borderBottom: "1px solid rgba(160,250,215,0.15)" }}>
          <div className="px-6 py-4 flex justify-between items-center flex-wrap gap-3 max-w-[1600px] mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #A0FAD7 0%, #82F6C6 100%)", boxShadow: "0 0 20px rgba(160,250,215,0.4)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M17 8C17 5.79 14.76 4 12 4C9.24 4 7 5.79 7 8C7 10.21 9.24 12 12 12C14.76 12 17 13.79 17 16C17 18.21 14.76 20 12 20C9.24 20 7 18.21 7 16"
                    stroke="#0a2e1f" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black tracking-tight" style={{ color: "#fff" }}>Engagement Alerts</h1>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(160,250,215,0.15)", color: "#82F6C6", border: "1px solid rgba(130,246,198,0.25)" }}>
                    SUBSETS
                  </span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(160,250,215,0.6)" }}>
                  {stage === "fetching"  && "Fetching emails from HubSpot..."}
                  {stage === "enriching" && `${emails.length} emails loaded — enriching data...`}
                  {stage === "done"      && `Refreshed ${lastRefresh?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${visibleRows.length} result${visibleRows.length !== 1 ? "s" : ""}${hasMore ? " · more available" : ""}`}
                  {(stage === "idle" || stage === "error") && "Hit Refresh to load engaged emails"}
                </p>
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <Link href="/sequences"
                className="px-3 py-2 rounded-lg text-xs font-semibold border"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.15)" }}>
                Sequences
              </Link>
              <Link href="/clients"
                className="px-3 py-2 rounded-lg text-xs font-semibold border"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.15)" }}>
                Clients
              </Link>
              {hiddenSet.size > 0 && (
                <button onClick={() => setShowHidden((v) => !v)}
                  className="pill-btn px-3 py-2 rounded-lg text-xs font-semibold border"
                  style={{
                    background:  showHidden ? "rgba(160,250,215,0.15)" : "rgba(255,255,255,0.07)",
                    color:       showHidden ? "#82F6C6" : "rgba(255,255,255,0.6)",
                    borderColor: showHidden ? "rgba(130,246,198,0.4)" : "rgba(255,255,255,0.15)",
                  }}>
                  {showHidden ? "← Back" : `Hidden (${hiddenSet.size})`}
                </button>
              )}
              <button onClick={() => refresh(cutoffMs, selectedOwner, minOpens)} disabled={isLoading}
                className="pill-btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
                style={{
                  background: isLoading ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #A0FAD7 0%, #82F6C6 100%)",
                  color:      isLoading ? "rgba(255,255,255,0.4)" : "#0a2e1f",
                  cursor:     isLoading ? "not-allowed" : "pointer",
                  boxShadow:  isLoading ? "none" : "0 0 20px rgba(160,250,215,0.35)",
                  border:     "none",
                }}>
                {isLoading ? (
                  <><span className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  {stage === "fetching" ? "Fetching..." : "Enriching..."}</>
                ) : (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                  </svg>Refresh</>
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="px-6 py-6 max-w-[1600px] mx-auto">

          {/* ── Controls ── */}
          {!showHidden && (
            <div className="flex flex-wrap gap-2 items-center mb-5">
              <select value={selectedOwner} onChange={(e) => setSelectedOwner(e.target.value)}
                className="bg-white border rounded-lg px-3 py-1.5 text-xs font-semibold outline-none cursor-pointer"
                style={{ borderColor: "#e2e4ed", color: "#2E009E", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                {OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>

              <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as any)}
                className="bg-white border rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 outline-none cursor-pointer"
                style={{ borderColor: "#e2e4ed", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                {TIME_RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="border rounded-xl px-4 py-3 text-sm mb-4"
              style={{ background: "#fff1f0", borderColor: "#fecaca", color: "#b91c1c" }}>
              Error: {error}
            </div>
          )}

          {/* ── Idle ── */}
          {stage === "idle" && (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #A0FAD7, #82F6C6)", boxShadow: "0 8px 24px rgba(130,246,198,0.3)" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#0a5c3c" strokeWidth="1.5"/>
                  <polyline points="22,6 12,13 2,6" stroke="#0a5c3c" strokeWidth="1.5"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-500">Hit Refresh to load engaged emails</p>
            </div>
          )}

          {/* ── Fetching ── */}
          {stage === "fetching" && (
            <div className="bg-white border rounded-2xl p-14 text-center" style={{ borderColor: "#e2e4ed" }}>
              <div className="flex justify-center mb-5">
                <div className="w-10 h-10 rounded-full animate-spin"
                  style={{ border: "3px solid rgba(160,250,215,0.3)", borderTopColor: "#82F6C6" }} />
              </div>
              <p className="text-sm font-semibold text-gray-700">Fetching emails from HubSpot...</p>
              <p className="text-xs text-gray-400 mt-1">Usually 2–5 seconds</p>
            </div>
          )}

          {/* ── Enriching banner ── */}
          {enriching && emails.length > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 mb-4 text-xs font-medium"
              style={{ background: "rgba(160,250,215,0.12)", border: "1px solid rgba(130,246,198,0.4)", color: "#0a6644" }}>
              <span className="w-3 h-3 rounded-full flex-shrink-0 animate-spin"
                style={{ border: "2px solid rgba(10,102,68,0.2)", borderTopColor: "#0a6644" }} />
              Loading persona, industry and sequence data...
            </div>
          )}

          {/* ── Stat cards ── */}
          {stage !== "idle" && stage !== "fetching" && !showHidden && allRows.length > 0 && (
            <div className="flex gap-3 mb-5 flex-wrap">
              <TotalCard value={allRows.length} />
              <OpensCard
                value={allRows.filter((e) => e.open_count >= minOpens).length}
                minOpens={minOpens}
                active={filter === "opens"}
                onClick={() => toggleFilter("opens")}
                onAdjust={adjustMinOpens}
              />
              <FilterCard
                label="Click Trigger"
                value={allRows.filter((e) => e.click_count >= 1).length}
                active={filter === "clicks"}
                onClick={() => toggleFilter("clicks")}
              />
              <FilterCard
                label="In Sequence"
                value={allRows.filter((e) => e.in_sequence).length}
                active={filter === "sequences"}
                onClick={() => toggleFilter("sequences")}
              />
            </div>
          )}

          {stage === "done" && !showHidden && visibleRows.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No emails match these filters. Try expanding the time range.</p>
            </div>
          )}
          {showHidden && hiddenRows.length === 0 && (
            <div className="text-center py-12 text-gray-400"><p className="text-sm">No hidden rows.</p></div>
          )}

          {/* ── Table ── */}
          {displayRows.length > 0 && (
            <div className="bg-white rounded-2xl overflow-auto"
              style={{ border: "1px solid #e2e4ed", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              {showHidden && (
                <div className="px-5 py-3 border-b text-xs font-medium"
                  style={{ borderColor: "#f0f1f5", background: "#fafbfc", color: "#8b90a0" }}>
                  Click <strong className="text-gray-700">Unhide</strong> to restore rows.
                </div>
              )}
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ borderBottom: "2px solid #f0f1f5" }}>
                    {["Contact", "Subject", "Industry", "Persona", "Sequence", "Trigger", "Date", "Send Engagement Email", "Client", "", ""].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left whitespace-nowrap"
                        style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", letterSpacing: "0.06em", textTransform: "uppercase", background: "#fafbfc" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((e, i) => {
                    const companyName  = e.company_name ?? undefined;
                    const firstName    = e.first_name   ?? undefined;
                    const tmpl         = getTemplate(e.industry, e.persona, firstName, companyName);
                    const contactName  = [e.first_name, e.last_name].filter(Boolean).join(" ");
                    const primaryEmail = e.to_email.split(";")[0].trim();
                    const isLast       = i === displayRows.length - 1;

                    return (
                      <tr key={e.id} className="table-row-hover transition-colors"
                        style={{ borderBottom: isLast ? "none" : "1px solid #f4f5f8" }}>

                        <td className="px-4 py-3 min-w-[160px]">
                          {e.contact_id ? (
                            <a href={hsContactUrl(e.contact_id)} target="_blank" rel="noopener noreferrer"
                              className="font-bold text-gray-900 hover:text-[#2E009E] transition-colors block"
                              style={{ fontSize: "13px" }}>
                              {contactName || primaryEmail.split("@")[0]}
                            </a>
                          ) : (
                            <span className="font-semibold text-gray-700 block" style={{ fontSize: "13px" }}>
                              {enriching ? <Skeleton w="90px" /> : primaryEmail.split("@")[0]}
                            </span>
                          )}
                          <span className="mono text-[11px] block truncate max-w-[170px]" style={{ color: "#b0b5c3" }}>
                            {primaryEmail}
                          </span>
                        </td>

                        <td className="px-4 py-3 max-w-[210px]">
                          <span title={e.subject} className="block truncate text-gray-500 text-xs">{e.subject}</span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {enriching && !e.industry ? <Skeleton w="55px" /> : (
                            <span className="text-xs font-medium text-gray-600">{e.industry || <span style={{ color: "#d1d5db" }}>—</span>}</span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {enriching && !e.persona ? <Skeleton w="75px" /> : (
                            <span className="text-xs font-medium text-gray-600">{e.persona || <span style={{ color: "#d1d5db" }}>—</span>}</span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {enriching ? <Skeleton w="60px" /> : (
                            e.in_sequence
                              ? <SequenceBadge name="In Sequence" />
                              : <span style={{ color: "#d1d5db" }}>—</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <ActivityBadges openCount={e.open_count} clickCount={e.click_count || 0} minOpens={minOpens} hasReply={e.has_reply} />
                        </td>

                        <td className="px-4 py-3 text-xs whitespace-nowrap mono" style={{ color: "#b0b5c3" }}>
                          {fmtDate(e.modified_date || e.created_date)}
                        </td>

                        <td className="px-4 py-3">
                          {enriching && !e.persona ? (
                            <span className="text-xs" style={{ color: "#d1d5db" }}>loading...</span>
                          ) : tmpl && e.in_sequence ? (
                            <div className="flex gap-1.5">
                              <GmailButton label="Eng. Email 1" to={primaryEmail} subject={tmpl.e1.subject} body={tmpl.e1.body}
                                alreadySent={sentE1Set.has(e.id)} onSend={() => handleSentE1(e.id)} onUnsend={() => handleUnsendE1(e.id)} />
                              <GmailButton label="Eng. Email 2" to={primaryEmail} subject={tmpl.e2.subject} body={tmpl.e2.body}
                                alreadySent={sentE2Set.has(e.id)} onSend={() => handleSentE2(e.id)} onUnsend={() => handleUnsendE2(e.id)} />
                            </div>
                          ) : (
                            <span className="text-xs italic" style={{ color: "#d1d5db" }}>
                              {e.persona || e.industry ? "No template" : "—"}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <MarkClientButton onMark={() => handleMarkClient(primaryEmail, e.company_name)} />
                        </td>

                        <td className="px-4 py-3">
                          <button onClick={() => hiddenSet.has(e.id) ? handleUnhide(e.id) : handleHide(e.id, primaryEmail)}
                            className="text-xs font-medium border rounded-lg px-2.5 py-1 transition-all hover:border-gray-300 hover:text-gray-600"
                            style={{ color: "#b0b5c3", borderColor: "#e8eaf0" }}>
                            {hiddenSet.has(e.id) ? "Unhide" : "Hide"}
                          </button>
                        </td>

                        <td className="px-4 py-3 pr-6">
                          <a href={hsEmailUrl(e.id)} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-bold whitespace-nowrap hover:opacity-75 transition-opacity"
                            style={{ color: "#2E009E" }}>
                            View →
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {stage === "done" && hasMore && (
            <div className="flex justify-center mt-4">
              <button onClick={() => loadMore(cutoffMs, selectedOwner, minOpens)}
                className="pill-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border"
                style={{ background: "#fff", color: "#2E009E", borderColor: "rgba(46,0,158,0.3)", boxShadow: "0 2px 8px rgba(46,0,158,0.1)" }}>
                Load next 100 →
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ── Toasts ── */}
      {activeToast === "client" && clientPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50"
          style={{ background: "#1a0f4e", color: "#fff", border: "1px solid rgba(160,250,215,0.2)", whiteSpace: "nowrap" }}>
          <span style={{ color: "rgba(255,255,255,0.7)" }}>
            Mark <strong className="text-white">{clientPrompt.name}</strong> as a client and remove{" "}
            <span className="mono text-xs">{clientPrompt.domain}</span> from the alerts dashboard?
          </span>
          <button onClick={() => confirmMarkClient(clientPrompt.domain, clientPrompt.name)}
            className="px-3 py-1 rounded-lg text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #A0FAD7, #82F6C6)", color: "#0a2e1f" }}>
            Confirm
          </button>
          <button onClick={() => setClientPrompt(null)} className="text-xs opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {activeToast === "hide" && hideAllPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50"
          style={{ background: "#1a0f4e", color: "#fff", border: "1px solid rgba(160,250,215,0.2)", whiteSpace: "nowrap" }}>
          <span style={{ color: "rgba(255,255,255,0.7)" }}>Hide all emails from this contact?</span>
          <button onClick={() => handleHideAllFromContact(hideAllPrompt.contactEmail)}
            className="px-3 py-1 rounded-lg text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #A0FAD7, #82F6C6)", color: "#0a2e1f" }}>
            Hide all
          </button>
          <button onClick={() => setHideAllPrompt(null)} className="text-xs opacity-50 hover:opacity-100">✕</button>
        </div>
      )}
    </>
  );
}
