// types/outbound.ts

export type OutboundWindow = "week" | "month" | "quarter";

export type EmailCategory = "Sequence" | "Roundtable" | "Outreach";

// Every sent email in the window — used for category drill-down
export interface SentEmail {
  emailId:     string;
  contactName: string | null;
  category:    EmailCategory;
  sentAt:      string;
  subject:     string | null;
}

// Emails that can be traced to a deal outcome
export interface AttributedEmail {
  emailId:    string;
  contactId:  string;
  category:   EmailCategory;
  sentAt:     string;
  subject:    string | null;
  dealId:           string | null;
  dealName:         string | null;
  attribution:      "new_deal" | "progression" | null;
  preExistingDeal:  boolean;
}

export interface RepOutboundStats {
  ownerId:    string;
  repName:    string;
  counts: {
    Sequence:   number;
    Roundtable: number;
    Outreach:   number;
    total:      number;
  };
  newDeals:       number;
  progressions:   number;
  attributed:     AttributedEmail[];
  // All sent emails by category — for tile drill-down
  emailsByCategory: Record<EmailCategory, SentEmail[]>;
}

export interface OutboundReport {
  window:   OutboundWindow;
  windowStart: string;
  windowEnd:   string;
  reps:     RepOutboundStats[];
  asOf:     string;
}
