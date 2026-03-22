// lib/assumptions.ts

import type { Assumptions } from "@/types/deals";

// Quarterly combined revenue targets (NB + Expansion) — not editable
export const QUARTERLY_TARGETS = [600_000, 800_000, 500_000, 1_100_000] as const;

// NB share of combined quarterly target — not editable
export const NB_REVENUE_SHARE = 2 / 3;

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  // Four-step funnel — updated from 12 months of HubSpot historical data (Mar 2025–Mar 2026)
  disc_to_demo:   20,  // % — manual conservative estimate
  demo_to_prop:   92,  // % — HubSpot historical
  prop_to_legal:  64,  // % — HubSpot historical
  legal_to_close: 86,  // % — HubSpot historical
  // Average NB deal value — drives q_closes and annual closes per channel
  avg_deal_value: 130_750,
  // Channel revenue share %
  ch: {
    Outbound:    25,
    Events:      16,
    Partnership: 15,
    Inbound:     15,
    Expansion:   20,
  },
  // Expansion-specific inputs
  expansion_avg_deal_size: 75_000,  // placeholder — editable
  expansion_close_rate:    40,
};

export interface DerivedTargets {
  qCloses:                  number;
  legalTarget:              number;
  propTarget:               number;
  demoTarget:               number;
  discTarget:               number;
  expansionQCloses:         number;
  expansionQTarget:         number;
  expansionLegalTarget:     number;
  expansionPropTarget:      number;
  expansionDemoTarget:      number;
  combinedLegalTarget:      number;
  combinedPropTarget:       number;
  combinedDemoTarget:       number;
  nbQRevenueTarget:         number;
  expansionQRevenueTarget:  number;
  nbTargets:                Record<string, number>;
  channelQTargets:          Record<string, number>;
  annualClosesByChannel:    Record<string, number>;
}

export const deriveTargets = (a: Assumptions, qIndex: number = 0): DerivedTargets => {
  const qTotal                 = QUARTERLY_TARGETS[qIndex] ?? QUARTERLY_TARGETS[0];
  const nbQRevenueTarget        = Math.round(qTotal * NB_REVENUE_SHARE);
  const expansionQRevenueTarget = qTotal - nbQRevenueTarget;

  // Q closes derived from NB revenue target and avg deal value
  const qCloses     = Math.ceil(nbQRevenueTarget / a.avg_deal_value);

  // Four-step NB funnel — work backwards from q closes
  const legalTarget = Math.ceil(qCloses         / (a.legal_to_close / 100));
  const propTarget  = Math.ceil(legalTarget / (a.prop_to_legal  / 100));
  const demoTarget  = Math.ceil(propTarget  / (a.demo_to_prop   / 100));
  const discTarget  = Math.ceil(demoTarget  / (a.disc_to_demo   / 100));

  // Expansion — per-stage targets using same NB funnel rates
  const expansionLegalTarget = Math.ceil(expansionQCloses / (a.legal_to_close / 100));
  const expansionPropTarget  = Math.ceil(expansionLegalTarget / (a.prop_to_legal  / 100));
  const expansionDemoTarget  = Math.ceil(expansionPropTarget  / (a.demo_to_prop   / 100));

  // Combined NB + Expansion per-stage targets
  const combinedLegalTarget = legalTarget + expansionLegalTarget;
  const combinedPropTarget  = propTarget  + expansionPropTarget;
  const combinedDemoTarget  = demoTarget  + expansionDemoTarget;
  const expansionQCloses = Math.ceil(expansionQRevenueTarget / a.expansion_avg_deal_size);
  const expansionQTarget = Math.ceil(expansionQCloses / (a.expansion_close_rate / 100));

  const nbChannels = ["Outbound", "Events", "Partnership", "Inbound"] as const;

  // NB annual closes per channel = (annual NB revenue × channel share%) / avg deal value
  const annualNBRevenue = nbQRevenueTarget * 4;
  const annualClosesByChannel: Record<string, number> = {};
  const nbTargets: Record<string, number> = {};

  for (const ch of nbChannels) {
    const annualCloses = (annualNBRevenue * (a.ch[ch] / 100)) / a.avg_deal_value;
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
    qCloses,
    legalTarget, propTarget, demoTarget, discTarget,
    expansionQCloses, expansionQTarget,
    expansionLegalTarget, expansionPropTarget, expansionDemoTarget,
    combinedLegalTarget, combinedPropTarget, combinedDemoTarget,
    nbQRevenueTarget, expansionQRevenueTarget,
    nbTargets, channelQTargets, annualClosesByChannel,
  };
};

// Annual targets — sum across all quarters
export const ANNUAL_REVENUE_TARGET = QUARTERLY_TARGETS.reduce((s, v) => s + v, 0);

export const REDIS_ASSUMPTIONS_KEY = "pipeline:assumptions";
