"use client";

import { useState, useEffect, useCallback } from "react";
import type { Deal, ClosedWonDeal, EmailSignalMap, ClosePlanMap, Assumptions, HubSpotRates } from "@/types/deals";
import { DEFAULT_ASSUMPTIONS, deriveTargets } from "@/lib/assumptions";
import { filterByStage } from "@/lib/deals";
import Header from "@/components/Header";
import TabNav, { type TabId } from "@/components/TabNav";
import OverviewTab from "@/components/tabs/OverviewTab";
import LegalTab from "@/components/tabs/LegalTab";
import ProposalTab from "@/components/tabs/ProposalTab";
import DemoTab from "@/components/tabs/DemoTab";
import DiscoveryTab from "@/components/tabs/DiscoveryTab";
import MethodologyTab from "@/components/tabs/MethodologyTab";
import RecalculateModal from "@/components/RecalculateModal";

// ── COUNT HELPER ──────────────────────────────────────────────────────────────

export interface PipelineCounts {
  discNewW:    number;
  discNewQ:    number;
  demoNewW:    number;
  demoNewQ:    number;
  propNewW:    number;
  propNewQ:    number;
  legalNewW:   number;
  legalNewQ:   number;
  qElapsedPct: number;
  discNewY:    number;
  demoNewY:    number;
  propNewY:    number;
  legalNewY:   number;
  yElapsedPct: number;
}

function computeCounts(active: Deal[], weekAgo: Date, qStart: Date, yearStart: Date, now: Date): PipelineCounts {
  const qEnd        = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 1);
  const qTotalDays  = (qEnd.getTime() - qStart.getTime()) / 86400000;
  const qElapsedPct = Math.min(1, (now.getTime() - qStart.getTime()) / 86400000 / qTotalDays);
  const yearEnd     = new Date(now.getFullYear() + 1, 0, 1);
  const yTotalDays  = (yearEnd.getTime() - yearStart.getTime()) / 86400000;
  const yElapsedPct = Math.min(1, (now.getTime() - yearStart.getTime()) / 86400000 / yTotalDays);

  return {
    discNewW:  active.filter(d => d.createdate && new Date(d.createdate) >= weekAgo).length,
    discNewQ:  active.filter(d => d.createdate && new Date(d.createdate) >= qStart).length,
    demoNewW:  active.filter(d => d.entered_demo     && d.createdate && new Date(d.createdate) >= weekAgo).length,
    demoNewQ:  active.filter(d => d.entered_demo     && d.createdate && new Date(d.createdate) >= qStart).length,
    propNewW:  active.filter(d => d.entered_proposal && d.createdate && new Date(d.createdate) >= weekAgo).length,
    propNewQ:  active.filter(d => d.entered_proposal && d.createdate && new Date(d.createdate) >= qStart).length,
    legalNewW: active.filter(d => d.entered_legal    && d.createdate && new Date(d.createdate) >= weekAgo).length,
    legalNewQ: active.filter(d => d.entered_legal    && d.createdate && new Date(d.createdate) >= qStart).length,
    qElapsedPct,
    discNewY:  active.filter(d => d.createdate && new Date(d.createdate) >= yearStart).length,
    demoNewY:  active.filter(d => d.entered_demo     && d.createdate && new Date(d.createdate) >= yearStart).length,
    propNewY:  active.filter(d => d.entered_proposal && d.createdate && new Date(d.createdate) >= yearStart).length,
    legalNewY: active.filter(d => d.entered_legal    && d.createdate && new Date(d.createdate) >= yearStart).length,
    yElapsedPct,
  };
}

// ── PROGRESS UI ───────────────────────────────────────────────────────────────

interface ProgressStep {
  message: string;
  done:    boolean;
}

function LoadingScreen({ steps }: { steps: ProgressStep[] }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "60vh", gap: 8,
    }}>
      <div style={{
        background: "#fff", border: "1px solid #e2e4ed", borderRadius: 14,
        padding: "28px 36px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        minWidth: 320,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f1117", marginBottom: 16, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          Loading pipeline data…
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 18, flexShrink: 0, textAlign: "center" }}>
                {s.done
                  ? <span style={{ color: "#16a34a", fontSize: 14 }}>✓</span>
                  : <span style={{
                      display: "inline-block", width: 12, height: 12, borderRadius: "50%",
                      border: "2px solid #94a3b8", borderTopColor: "#0f172a",
                      animation: "spin 0.7s linear infinite",
                    }} />
                }
              </div>
              <span style={{
                fontSize: 13, fontFamily: "'DM Sans', system-ui, sans-serif",
                color: s.done ? "#64748b" : "#0f1117",
                fontWeight: s.done ? 400 : 500,
              }}>
                {s.message}
              </span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────────

export default function Page() {
  const [tab, setTab]                   = useState<TabId>("overview");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);

  const [active, setActive]             = useState<Deal[]>([]);
  const [closedWon, setClosedWon]       = useState<ClosedWonDeal[]>([]);
  const [closedWonYTD, setClosedWonYTD] = useState<ClosedWonDeal[]>([]);
  const [emailSignals, setEmailSignals] = useState<EmailSignalMap>({});
  const [asOf, setAsOf]                 = useState<string | null>(null);

  const [closePlans, setClosePlans]     = useState<ClosePlanMap>({});
  const [assumptions, setAssumptions]   = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [hubspotRates, setHubspotRates] = useState<HubSpotRates | null>(null);

  const [recalculating, setRecalculating] = useState(false);
  const [recalcModal, setRecalcModal]     = useState<{
    rates: any; avg_deal_value: number | null; sample: any; validation: any;
  } | null>(null);
  const [ytdMode, setYtdMode] = useState(false);

  const [now, setNow] = useState<Date>(new Date());
  const weekAgo   = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const qIndex    = Math.floor(now.getMonth() / 3);
  const qStart    = new Date(now.getFullYear(), qIndex * 3, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const counts    = computeCounts(active, weekAgo, qStart, yearStart, now);

  // ── FETCH via SSE ─────────────────────────────────────────────────────────
  const fetchPipeline = useCallback(() => {
    setLoading(true);
    setError(null);
    setProgressSteps([]);

    const es = new EventSource("/api/deals");

    es.addEventListener("progress", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setProgressSteps(prev => {
        // signals_progress updates the last signals line in place
        if (data.step === "signals_progress") {
          const next = [...prev];
          const idx  = next.findLastIndex(s => s.message.startsWith("Fetching email signals"));
          const line = { message: data.message, done: false };
          if (idx >= 0) { next[idx] = line; return next; }
          return [...next, line];
        }
        // _done steps mark the previous matching line as done and add the new one
        if (data.step === "deals_done" || data.step === "signals_done") {
          return [...prev.map(s => ({ ...s, done: true })), { message: data.message, done: true }];
        }
        return [...prev, { message: data.message, done: false }];
      });
    });

    es.addEventListener("result", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setActive(data.active ?? []);
      setClosedWon(data.closedWon ?? []);
      setClosedWonYTD(data.closedWonYTD ?? []);
      setEmailSignals(data.emailSignals ?? {});
      setAsOf(data.asOf ?? null);
      setNow(new Date(data.asOf ?? Date.now()));
      setLoading(false);
      es.close();
    });

    es.addEventListener("error", (e: MessageEvent) => {
      try {
        const data = JSON.parse((e as any).data);
        setError(data.message ?? "Failed to load pipeline data.");
      } catch {
        setError("Failed to load pipeline data. Check your HubSpot token and try again.");
      }
      setLoading(false);
      es.close();
    });

    es.onerror = () => {
      setError("Connection lost. Please refresh.");
      setLoading(false);
      es.close();
    };
  }, []);

  const fetchClosePlans = useCallback(async () => {
    try {
      const res = await fetch("/api/closeplans");
      if (res.ok) setClosePlans(await res.json());
    } catch (e) { console.error("Failed to load close plans:", e); }
  }, []);

  const fetchAssumptions = useCallback(async () => {
    try {
      const res = await fetch("/api/assumptions");
      if (res.ok) setAssumptions(await res.json());
    } catch (e) { console.error("Failed to load assumptions:", e); }
  }, []);

  const fetchHubspotRates = useCallback(async () => {
    try {
      const res = await fetch("/api/hubspot-rates");
      if (res.ok) setHubspotRates(await res.json());
    } catch (e) { console.error("Failed to load hubspot rates:", e); }
  }, []);

  useEffect(() => {
    fetchPipeline();
    fetchClosePlans();
    fetchAssumptions();
    fetchHubspotRates();
  }, [fetchPipeline, fetchClosePlans, fetchAssumptions, fetchHubspotRates]);

  // ── RECALCULATE ───────────────────────────────────────────────────────────
  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res  = await fetch("/api/recalculate");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecalcModal({ rates: data.rates, avg_deal_value: data.avg_deal_value ?? null, sample: data.sample, validation: data.validation });
    } catch (e) { console.error("Recalculate failed:", e); }
    finally { setRecalculating(false); }
  };

  const handleRecalcConfirm = async (updated: Assumptions) => {
    await handleAssumptionsSave(updated);
    setRecalcModal(null);
  };

  // ── HANDLERS ─────────────────────────────────────────────────────────────
  const handleClosePlanSave = async (dealId: string, url: string) => {
    try {
      await fetch("/api/closeplans", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, url }),
      });
      setClosePlans(prev => {
        const next = { ...prev };
        if (url) next[dealId] = url; else delete next[dealId];
        return next;
      });
    } catch (e) { console.error("Failed to save close plan:", e); }
  };

  const handleAssumptionsSave = async (a: Assumptions) => {
    try {
      await fetch("/api/assumptions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a),
      });
      setAssumptions(a);
    } catch (e) { console.error("Failed to save assumptions:", e); }
  };

  // ── SPLIT DEALS ───────────────────────────────────────────────────────────
  const legal     = filterByStage(active, "1446534336");
  const proposal  = filterByStage(active, "contractsent");
  const demo      = filterByStage(active, "qualifiedtobuy");
  const discovery = filterByStage(active, "appointmentscheduled");
  const derived   = deriveTargets(assumptions, qIndex);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f5f6fa" }}>
      <Header
        asOf={asOf} loading={loading} qIndex={qIndex} ytdMode={ytdMode}
        onRefresh={fetchPipeline} onRecalculate={handleRecalculate} recalculating={recalculating}
      />

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 24px", fontSize: 13, fontWeight: 500 }}>
          ⚠️ {error}
        </div>
      )}

      <TabNav active={tab} onChange={setTab} />

      <div className="px-6 py-6 max-w-[1600px] mx-auto">
        {loading ? (
          <LoadingScreen steps={progressSteps} />
        ) : (
          <>
            {tab === "overview" && (
              <OverviewTab
                active={active} legal={legal} proposal={proposal} demo={demo} discovery={discovery}
                closedWon={closedWon} closedWonYTD={closedWonYTD}
                emailSignals={emailSignals} closePlans={closePlans}
                assumptions={assumptions} counts={counts} hubspotRates={hubspotRates}
                now={now} weekAgo={weekAgo} qStart={qStart} yearStart={yearStart} qIndex={qIndex}
                ytdMode={ytdMode} onYtdModeChange={setYtdMode}
                onTabChange={setTab} onAssumptionsSave={handleAssumptionsSave}
              />
            )}
            {tab === "legal" && (
              <LegalTab deals={legal} closePlans={closePlans} now={now} weekAgo={weekAgo} qStart={qStart} counts={counts} legalQTarget={derived.combinedLegalTarget} />
            )}
            {tab === "proposal" && (
              <ProposalTab deals={proposal} closePlans={closePlans} onClosePlanSave={handleClosePlanSave} now={now} weekAgo={weekAgo} qStart={qStart} counts={counts} propQTarget={derived.combinedPropTarget} />
            )}
            {tab === "demo" && (
              <DemoTab deals={demo} allActive={active} closePlans={closePlans} now={now} weekAgo={weekAgo} qStart={qStart} counts={counts} demoQTarget={derived.combinedDemoTarget} />
            )}
            {tab === "discovery" && (
              <DiscoveryTab deals={discovery} allActive={active} assumptions={assumptions} onAssumptionsSave={handleAssumptionsSave} now={now} weekAgo={weekAgo} qStart={qStart} qIndex={qIndex} counts={counts} />
            )}
            {tab === "methodology" && (
              <MethodologyTab assumptions={assumptions} qIndex={qIndex} hubspotRates={hubspotRates} onAssumptionsSave={handleAssumptionsSave} />
            )}
          </>
        )}
      </div>

      {recalcModal && (
        <RecalculateModal
          rates={recalcModal.rates} avg_deal_value={recalcModal.avg_deal_value}
          sample={recalcModal.sample} validation={recalcModal.validation}
          current={assumptions} onConfirm={handleRecalcConfirm} onDismiss={() => setRecalcModal(null)}
        />
      )}
    </div>
  );
}
