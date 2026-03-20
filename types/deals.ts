// types/deals.ts

export type DealStage =
  | "1446534336"           // Legal/Procurement
  | "contractsent"         // Proposal/Negotiation
  | "qualifiedtobuy"       // Meeting/Demo
  | "appointmentscheduled" // Discovery
  | "closedwon"
  | "closedlost"
  | "563428070"            // Closed Lost Churn
  | "582003949";           // Bad Fit

export interface Deal {
  id: string;
  name: string;
  stage: DealStage;
  amount: number | null;
  closedate: string | null;
  owner: string;
  channel: string | null;
  last_contacted: string | null;
  createdate: string | null;           // when the deal was first created
  entered_current: string | null;
  entered_legal: string | null;
  entered_proposal: string | null;
  entered_demo: string | null;
  entered_discovery: string | null;
  new_genuine?: boolean; // created this quarter (any stage), not recycled
}

export interface ClosedWonDeal {
  id: string;
  name: string;
  amount: number;
  closedate: string;
  owner: string;
  channel: string | null;
}

export interface EmailSignal {
  opens7d: number;
  clicks7d: number;
  lastInbound: string | null;
  lastSubject: string | null;
}

export interface EmailSignalMap {
  [dealId: string]: EmailSignal;
}

export interface ClosePlanMap {
  [dealId: string]: string;
}

export interface ChannelAnnualCloses {
  Outbound:    number;
  Events:      number;
  Partnership: number;
  Inbound:     number;
  Expansion:   number;
}

export interface Assumptions {
  disc_to_demo:   number;
  demo_to_prop:   number;
  prop_to_close:  number;
  legal_to_close: number;
  q_closes: number;
  ch: {
    Outbound:    number;
    Events:      number;
    Partnership: number;
    Inbound:     number;
    Expansion:   number;
  };
  annual_closes: ChannelAnnualCloses;
  expansion_annual_deals: number;
  expansion_close_rate:   number;
}

export interface PipelineData {
  active: Deal[];
  closedWon: ClosedWonDeal[];
  asOf: string;
}
