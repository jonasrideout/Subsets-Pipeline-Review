// lib/assumptions.ts

import type { Assumptions } from "@/types/deals";

export const QUARTERLY_REVENUE_TARGET = 600_000;

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  // Four-step funnel — updated from 12 months of HubSpot historical data (Mar 2025–Mar 2026)
  disc_to_demo:   20,  // % — manual conservative estimate
  demo_to_prop:   92,  // % — HubSpot historical
  prop_to_legal:  64,  // % — HubSpot historical
  legal_to_close: 86,  // % — HubSpot historical
  // Quarterly close target
  q_closes: 6,
  // Average deal value — used to derive annual closes per channel from revenue share
  // $75K → Outbound ≈ 8.0 annual closes (GTM spreadsheet: 8.1)
  avg_deal_value: 75_000,
  // Channel revenue share %
  ch: {
    Outbound:    25,
    Events:      16,
    Partnership: 15,
    Inbound:     15,
    Expansion:   20,
  },
  // Expansion-specific inputs
  expansion_annual_deals: 12,
  expansion_close_rate:   40,
};

export interface DerivedTargets {
  legalTarget:           number;
  propTarget:            number;
  demoTarget:            number;
  discTarget:            number;
  expansionQTarget:      number;
  nbTargets:             Record<string, number>;
  channelQTargets:       Record<string, number>;
  annualClosesByChannel: Record<string, number>; // derived — for display in Methodology
}

export const deriveTargets = (a: Assumptions): DerivedTargets => {
  // Four-step funnel — work backwards from Q closes
  const legalTarget = Math.ceil(a.q_closes   / (a.legal_to_close / 100));
  const propTarget  = Math.ceil(legalTarget  / (a.prop_to_legal  / 100));
  const demoTarget  = Math.ceil(propTarget   / (a.demo_to_prop   / 100));
  const discTarget  = Math.ceil(demoTarget   / (a.disc_to_demo   / 100));

  // Expansion Q target — independent of funnel math
  const expansionQTarget = Math.ceil(
    (a.expansion_annual_deals / 4) / (a.expansion_close_rate / 100)
  );

  const nbChannels = ["Outbound", "Events", "Partnership", "Inbound"] as const;

  // Annual closes per channel = (annual revenue × channel share%) / avg deal value
  const annualRevenue = QUARTERLY_REVENUE_TARGET * 4;
  const annualClosesByChannel: Record<string, number> = {};
  const nbTargets: Record<string, number> = {};

  for (const ch of nbChannels) {
    const annualCloses = (annualRevenue * (a.ch[ch] / 100)) / a.avg_deal_value;
    annualClosesByChannel[ch] = annualCloses;
    const annualDiscovery =
      annualCloses /
      (a.legal_to_close / 100) /
      (a.prop_to_legal  / 100) /
      (a.demo_to_prop   / 100) /
      (a.disc_to_demo   / 100);
    nbTargets[ch] = Math.ceil(annualDiscovery / 4);
  }

  const channelQTargets: Record<string, number> = {
    ...nbTargets,
    Expansion: expansionQTarget,
  };

  return {
    legalTarget, propTarget, demoTarget, discTarget,
    expansionQTarget, nbTargets, channelQTargets, annualClosesByChannel,
  };
};

export const REDIS_ASSUMPTIONS_KEY = "pipeline:assumptions";
