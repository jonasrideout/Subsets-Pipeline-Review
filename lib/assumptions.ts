// lib/assumptions.ts

import type { Assumptions } from "@/types/deals";

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  disc_to_demo:   20,   // % — manual estimate
  demo_to_prop:   79,   // % — HubSpot historical
  prop_to_close:  48,   // % — HubSpot historical
  legal_to_close: 73,   // % — HubSpot historical
  q_closes:        6,   // deals — Q1 target
  ch: {
    Outbound:    25,    // % revenue share
    Events:      16,
    Partnership: 15,
    Inbound:     15,
    Expansion:   20,
  },
  expansion_annual_deals: 12,   // from GTM spreadsheet
  expansion_close_rate:   40,   // % — from GTM spreadsheet
};

export interface DerivedTargets {
  legalTarget:       number;
  propTarget:        number;
  demoTarget:        number;
  discTarget:        number;
  expansionQTarget:  number;
  nbTargets:         Record<string, number>; // New Business channel targets
}

export const deriveTargets = (a: Assumptions): DerivedTargets => {
  const legalTarget      = Math.ceil(a.q_closes / (a.legal_to_close / 100));
  const propTarget       = Math.ceil(a.q_closes / (a.prop_to_close  / 100));
  const demoTarget       = Math.ceil(propTarget  / (a.demo_to_prop   / 100));
  const discTarget       = Math.ceil(demoTarget  / (a.disc_to_demo   / 100));
  const expansionQTarget = Math.ceil((a.expansion_annual_deals / 4) / (a.expansion_close_rate / 100));

  const nbChannels = ["Outbound", "Events", "Partnership", "Inbound"];
  const nbTargets: Record<string, number> = {};
  for (const ch of nbChannels) {
    nbTargets[ch] = Math.ceil(discTarget * (a.ch[ch as keyof typeof a.ch] / 100));
  }

  return { legalTarget, propTarget, demoTarget, discTarget, expansionQTarget, nbTargets };
};

export const REDIS_ASSUMPTIONS_KEY = "pipeline:assumptions";
