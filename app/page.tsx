// app/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import type { Deal, ClosedWonDeal, EmailSignalMap, ClosePlanMap, Assumptions } from "@/types/deals";
import { DEFAULT_ASSUMPTIONS } from "@/lib/assumptions";
import { filterByStage } from "@/lib/deals";
import Header from "@/components/Header";
import TabNav, { type TabId } from "@/components/TabNav";
import OverviewTab from "@/components/tabs/OverviewTab";
import LegalTab from "@/components/tabs/LegalTab";
import ProposalTab from "@/components/tabs/ProposalTab";
import DemoTab from "@/components/tabs/DemoTab";
import DiscoveryTab from "@/components/tabs/DiscoveryTab";

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

  // Date anchors — computed once per load/refresh
  const [now, setNow]                   = useState<Date>(new Date());
  const weekAgo = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
  const qStart  = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

  // ── FETCH PIPELINE DATA ──────────────────────────────────────────────────────
  const fetchPipeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/deals");
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

  // ── FETCH CLOSE PLANS ────────────────────────────────────────────────────────
  const fetchClosePlans = useCallback(async () => {
    try {
      const res = await fetch("/api/closeplans");
      if (res.ok) setClosePlans(await res.json());
    } catch (e) {
      console.error("Failed to load close plans:", e);
    }
  }, []);

  // ── FETCH ASSUMPTIONS ────────────────────────────────────────────────────────
  const fetchAssumptions = useCallback(async () => {
    try {
      const res = await fetch("/api/assumptions");
      if (res.ok) setAssumptions(await res.json());
    } catch (e) {
      console.error("Failed to load assumptions:", e);
    }
  }, []);

  // ── INITIAL LOAD ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPipeline();
    fetchClosePlans();
    fetchAssumptions();
  }, [fetchPipeline, fetchClosePlans, fetchAssumptions]);

  // ── HANDLERS ─────────────────────────────────────────────────────────────────
  const handleRefresh = () => {
    fetchPipeline();
  };

  const handleClosePlanSave = async (dealId: string, url: string) => {
    try {
      await fetch("/api/closeplans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, url }),
      });
      // Optimistic update
      setClosePlans(prev => {
        const next = { ...prev };
        if (url) next[dealId] = url;
        else delete next[dealId];
        return next;
      });
    } catch (e) {
      console.error("Failed to save close plan:", e);
    }
  };

  const handleAssumptionsSave = async (a: Assumptions) => {
    try {
      await fetch("/api/assumptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a),
      });
      setAssumptions(a);
    } catch (e) {
      console.error("Failed to save assumptions:", e);
    }
  };

  // ── SPLIT DEALS BY STAGE ──────────────────────────────────────────────────────
  const legal     = filterByStage(active, "1446534336");
  const proposal  = filterByStage(active, "contractsent");
  const demo      = filterByStage(active, "qualifiedtobuy");
  const discovery = filterByStage(active, "appointmentscheduled");

  // ── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      <Header asOf={asOf} loading={loading} onRefresh={handleRefresh} />

      {error && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626",
          padding: "12px 24px", fontSize: 13, fontWeight: 500,
        }}>
          ⚠️ {error}
        </div>
      )}

      <TabNav active={tab} onChange={setTab} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 40px" }}>
        {loading && !active.length ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#94a3b8", fontSize: 14 }}>
            Loading pipeline data…
          </div>
        ) : (
          <>
            {tab === "overview"  && (
              <OverviewTab
                legal={legal} proposal={proposal} demo={demo} discovery={discovery}
                closedWon={closedWon} emailSignals={emailSignals} closePlans={closePlans}
                assumptions={assumptions} now={now} weekAgo={weekAgo} qStart={qStart}
                onTabChange={setTab}
              />
            )}
            {tab === "legal"     && <LegalTab deals={legal} now={now} />}
            {tab === "proposal"  && (
              <ProposalTab
                deals={proposal} closePlans={closePlans}
                onClosePlanSave={handleClosePlanSave} now={now}
              />
            )}
            {tab === "demo"      && <DemoTab deals={demo} now={now} weekAgo={weekAgo} qStart={qStart} />}
            {tab === "discovery" && (
              <DiscoveryTab
                deals={discovery} allActive={active} assumptions={assumptions}
                onAssumptionsSave={handleAssumptionsSave}
                now={now} weekAgo={weekAgo} qStart={qStart}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
