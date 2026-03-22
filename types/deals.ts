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
  createdate: string | null;
  entered_current: string | null;
  entered_legal: string | null;
  entered_proposal: string | null;
  entered_demo: string | null;
  entered_discovery: string | null;
  new_genuine?: boolean;
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

export interface EmailSignalMap { [dealId: string]: EmailSignal; }
export interface ClosePlanMap   { [dealId: string]: string; }

export interface Assumptions {
  // Four-step funnel conversion rates
  disc_to_demo:   number;  // % Discovery → Demo    (manual estimate)
  demo_to_prop:   number;  // % Demo → Proposal      (HubSpot historical)
  prop_to_legal:  number;  // % Proposal → Legal     (HubSpot historical)
  legal_to_close: number;  // % Legal → Close        (HubSpot historical)
  // Quarterly close target
  q_closes: number;
  // Average deal value — used to derive annual closes per channel from revenue share
  avg_deal_value: number;
  // Channel revenue share %
  ch: {
    Outbound:    number;
    Events:      number;
    Partnership: number;
    Inbound:     number;
    Expansion:   number;
  };
  // Expansion-specific inputs
  expansion_avg_deal_size: number;  // avg expansion deal size
  expansion_close_rate:    number;  // % close rate
}

export interface PipelineData {
  active: Deal[];
  closedWon: ClosedWonDeal[];
  asOf: string;
}
