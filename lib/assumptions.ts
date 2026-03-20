// lib/assumptions.ts

import type { Assumptions } from "@/types/deals";

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  // Funnel conversion rates
  disc_to_demo:   20,   // % — manual conservative estimate
  demo_to_prop:   79,   // % — HubSpot historical
  prop_to_close:  48,   // % — HubSpot historical
  legal_to_close: 73,   // % — HubSpot historical
  // Quarterly close target
  q_closes: 6,
  // Channel revenue share % (Methodology panel only — not used for pacing targets)
  ch: {
    Outbound:    25,
    Events:      16,
    Partnership: 15,
    Inbound:     15,
    Expansion:   20,
  },
  // Annual closes needed per channel — from GTM spreadsheet, editable
  annual_closes: {
    Outbound:    8.1,  // Email/LinkedIn 5.8 + Roundtables 2.3
    Events:      3.4,  // Conference attendance 1.7 + Sponsored 1.7
    Partnership: 3.5,
    Inbound:     3.5,
    Expansion:   4.6,
  },
  // Expansion-specific inputs
  expansion_annual_deals: 12,
  expansion_close_rate:   40,
};

export interface DerivedTargets {
  legalTarget:      number;
  propTarget:       number;
  demoTarget:       number;
  discTarget:       number;
  expansionQTarget: number;
  nbTargets:        Record<string, number>; // New Business channel Q targets
  channelQTargets:  Record<string, number>; // All channel Q targets (incl. Expansion)
}

export const deriveTargets = (a: Assumptions): DerivedTargets => {
  // Stage targets — work backwards from Q closes using funnel rates
  const legalTarget = Math.ceil(a.q_closes / (a.legal_to_close / 100));
  const propTarget  = Math.ceil(a.q_closes / (a.prop_to_close  / 100));
  const demoTarget  = Math.ceil(propTarget  / (a.demo_to_prop   / 100));
  const discTarget  = Math.ceil(demoTarget  / (a.disc_to_demo   / 100));

  // Expansion Q target — separate from funnel math
  const expansionQTarget = Math.ceil(
    (a.expansion_annual_deals / 4) / (a.expansion_close_rate / 100)
  );

  // New Business channel Q targets — derived from annual closes per channel
  // Annual closes ÷ prop_to_close ÷ demo_to_prop ÷ disc_to_demo = annual Discovery needed
  // ÷ 4 = quarterly Discovery target
  const nbChannels = ["Outbound", "Events", "Partnership", "Inbound"] as const;
  const nbTargets: Record<string, number> = {};
  for (const ch of nbChannels) {
    const annualCloses = a.annual_closes[ch];
    const annualDiscovery =
      annualCloses /
      (a.prop_to_close / 100) /
      (a.demo_to_prop  / 100) /
      (a.disc_to_demo  / 100);
    nbTargets[ch] = Math.ceil(annualDiscovery / 4);
  }

  // Channel Q targets — NB channels + Expansion
  const channelQTargets: Record<string, number> = {
    ...nbTargets,
    Expansion: expansionQTarget,
  };

  return { legalTarget, propTarget, demoTarget, discTarget, expansionQTarget, nbTargets, channelQTargets };
};

export const REDIS_ASSUMPTIONS_KEY = "pipeline:assumptions";
