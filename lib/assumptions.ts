// lib/assumptions.ts

import type { Assumptions } from "@/types/deals";

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  // Four-step funnel — updated from 12 months of HubSpot historical data (Mar 2025–Mar 2026)
  disc_to_demo:   20,  // % — manual conservative estimate
  demo_to_prop:   92,  // % — HubSpot historical (was 79)
  prop_to_legal:  64,  // % — HubSpot historical (new — replaces prop_to_close)
  legal_to_close: 86,  // % — HubSpot historical (was 73)
  // Quarterly close target
  q_closes: 6,
  // Channel revenue share % (Methodology panel only)
  ch: {
    Outbound:    25,
    Events:      16,
    Partnership: 15,
    Inbound:     15,
    Expansion:   20,
  },
  // Annual closes needed per channel — from GTM spreadsheet
  annual_closes: {
    Outbound:    8.1,
    Events:      3.4,
    Partnership: 3.5,
    Inbound:     3.5,
    Expansion:   4.6,
  },
  expansion_annual_deals: 12,
  expansion_close_rate:   40,
};

export interface DerivedTargets {
  legalTarget:      number;
  propTarget:       number;
  demoTarget:       number;
  discTarget:       number;
  expansionQTarget: number;
  nbTargets:        Record<string, number>;
  channelQTargets:  Record<string, number>;
}

export const deriveTargets = (a: Assumptions): DerivedTargets => {
  // Four-step funnel — work backwards from Q closes
  const legalTarget = Math.ceil(a.q_closes        / (a.legal_to_close / 100));
  const propTarget  = Math.ceil(legalTarget        / (a.prop_to_legal  / 100));
  const demoTarget  = Math.ceil(propTarget         / (a.demo_to_prop   / 100));
  const discTarget  = Math.ceil(demoTarget         / (a.disc_to_demo   / 100));

  // Expansion Q target — separate from funnel math
  const expansionQTarget = Math.ceil(
    (a.expansion_annual_deals / 4) / (a.expansion_close_rate / 100)
  );

  // New Business channel Q targets — derived from annual closes per channel
  // Annual closes ÷ legal_to_close ÷ prop_to_legal ÷ demo_to_prop ÷ disc_to_demo = annual Discovery needed
  // ÷ 4 = quarterly Discovery target
  const nbChannels = ["Outbound", "Events", "Partnership", "Inbound"] as const;
  const nbTargets: Record<string, number> = {};
  for (const ch of nbChannels) {
    const annualCloses    = a.annual_closes[ch];
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

  return { legalTarget, propTarget, demoTarget, discTarget, expansionQTarget, nbTargets, channelQTargets };
};

export const REDIS_ASSUMPTIONS_KEY = "pipeline:assumptions";
