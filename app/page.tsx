// app/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import type { Deal, ClosedWonDeal, EmailSignalMap, ClosePlanMap, Assumptions } from "@/types/deals";
import { DEFAULT_ASSUMPTIONS, deriveTargets } from "@/lib/assumptions";
import { filterByStage } from "@/lib/deals";
import Header from "@/components/Header";
import TabNav, { type TabId } from "@/components/TabNav";
import OverviewTab from "@/components/tabs/OverviewTab";
import LegalTab from "@/components/tabs/LegalTab";
import ProposalTab from "@/components/tabs/ProposalTab";
import DemoTab from "@/components/tabs/DemoTab";
import DiscoveryTab from "@/components/tabs/DiscoveryTab";
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
}

function computeCounts(active: Deal[], weekAgo: Date, qStart: Date, now: Date): PipelineCounts {
  const qEnd        = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 1);
  const qTotalDays  = (qEnd.getTime() - qStart.getTime()) / 86400000;
  const qElapsedPct = Math.min(1, (now.getTime() - qStart.getTime()) / 86400000 / qTotalDays);

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
  };
}

export default function Page() {
  const [tab, setTab]                   = useState<TabId>("overview");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  // Pipeline data
  const [active, setActive]             = useState<Deal[]>([]);
  const [closedWon, setClosedWon]       = useState<ClosedWonDeal[]>([]);
  const [emailSignals, setEmailSignals] = useState<EmailSignalMap>({});
  const [asOf, setAsOf]                 = useState<string | null>(null);

  // Persisted state
  const [closePlans, setClosePlans]     = useState<ClosePlanMap>({});
  const [assumptions, setAssumptions]   = useState<Assumptions>(DEFAULT_ASSUMPTIONS);

  // Recalculate modal
  const [recalculating, setRecalculating] = useState(false);
  const [recalcModal, setRecalcModal] = useState<{ rates: any; avg_deal_value: number | null; sample: any } | null>(null);

  // Date anchors
  const [now, setNow] = useState<Date>(new Date());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const qIndex  = Math.floor(now.getMonth() / 3);
  const qStart  = new Date(now.getFullYear(), qIndex * 3, 1);

  const counts  = computeCounts(active, weekAgo, qStart, now);

  // ── FETCH PIPELINE DATA ───────────────────────────────────────────────────
  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/deals");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setActive(data.active ?? []);
      setClosedWon(data.closedWon ?? []);
      setEmailSignals(data.emailSignals ?? {});
      setAsOf(data.asOf ?? null);
      setNow(new Date(data.asOf ?? Date.now()));
    } catch (e) {
      setError("Failed to load pipeline data. Check your HubSpot token and try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    fetchPipeline();
    fetchClosePlans();
    fetchAssumptions();
  }, [fetchPipeline, fetchClosePlans, fetchAssumptions]);

  // ── RECALCULATE ───────────────────────────────────────────────────────────
  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res  = await fetch("/api/recalculate");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecalcModal({ rates: data.rates, avg_deal_value: data.avg_deal_value ?? null, sample: data.sample });
    } catch (e) {
      console.error("Recalculate failed:", e);
    } finally {
      setRecalculating(false);
    }
  };

  const handleRecalcConfirm = async (updated: Assumptions) => {
    await handleAssumptionsSave(updated);
    setRecalcModal(null);
  };

  // ── HANDLERS ─────────────────────────────────────────────────────────────
  const handleClosePlanSave = async (dealId: string, url: string) => {
    try {
      await fetch("/api/closeplans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, url }),
      });
      setClosePlans(prev => {
        const next = { ...prev };
        if (url) next[dealId] = url;
        else delete next[dealId];
        return next;
      });
    } catch (e) { console.error("Failed to save close plan:", e); }
  };

  const handleAssumptionsSave = async (a: Assumptions) => {
    try {
      await fetch("/api/assumptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a),
      });
      setAssumptions(a);
    } catch (e) { console.error("Failed to save assumptions:", e); }
  };

  // ── SPLIT DEALS BY STAGE ──────────────────────────────────────────────────
  const legal     = filterByStage(active, "1446534336");
  const proposal  = filterByStage(active, "contractsent");
  const demo      = filterByStage(active, "qualifiedtobuy");
  const discovery = filterByStage(active, "appointmentscheduled");
  const derived   = deriveTargets(assumptions, qIndex);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f5f6fa" }}>
      <Header
        asOf={asOf}
        loading={loading}
        onRefresh={fetchPipeline}
        onRecalculate={handleRecalculate}
        recalculating={recalculating}
      />

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "12px 24px", fontSize: 13, fontWeight: 500 }}>
          ⚠️ {error}
        </div>
      )}

      <TabNav active={tab} onChange={setTab} />

      <div className="px-6 py-6 max-w-[1600px] mx-auto">
        {loading && !active.length ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#94a3b8", fontSize: 14 }}>
            Loading pipeline data…
          </div>
        ) : (
          <>
            {tab === "overview" && (
              <OverviewTab
                active={active}
                legal={legal} proposal={proposal} demo={demo} discovery={discovery}
                closedWon={closedWon} emailSignals={emailSignals} closePlans={closePlans}
                assumptions={assumptions} counts={counts}
                now={now} weekAgo={weekAgo} qStart={qStart} qIndex={qIndex}
                onTabChange={setTab}
                onAssumptionsSave={handleAssumptionsSave}
              />
            )}
            {tab === "legal" && (
              <LegalTab deals={legal} closePlans={closePlans} now={now} weekAgo={weekAgo} qStart={qStart} counts={counts} legalQTarget={derived.legalTarget} />
            )}
            {tab === "proposal" && (
              <ProposalTab deals={proposal} closePlans={closePlans} onClosePlanSave={handleClosePlanSave} now={now} weekAgo={weekAgo} qStart={qStart} counts={counts} propQTarget={derived.propTarget} />
            )}
            {tab === "demo" && (
              <DemoTab deals={demo} allActive={active} closePlans={closePlans} now={now} weekAgo={weekAgo} qStart={qStart} counts={counts} demoQTarget={derived.demoTarget} />
            )}
            {tab === "discovery" && (
              <DiscoveryTab deals={discovery} allActive={active} assumptions={assumptions} onAssumptionsSave={handleAssumptionsSave} now={now} weekAgo={weekAgo} qStart={qStart} qIndex={qIndex} counts={counts} />
            )}
          </>
        )}
      </div>

      {recalcModal && (
        <RecalculateModal
          rates={recalcModal.rates}
          avg_deal_value={recalcModal.avg_deal_value}
          sample={recalcModal.sample}
          current={assumptions}
          onConfirm={handleRecalcConfirm}
          onDismiss={() => setRecalcModal(null)}
        />
      )}
    </div>
  );
}
