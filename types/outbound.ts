export type OutboundWindow = "week" | "month" | "quarter";

export type EmailCategory = "Sequence" | "Roundtable" | "Outreach";

export interface AttributedEmail {
  emailId:    string;
  contactId:  string;
  category:   EmailCategory;
  sentAt:     string;
  subject:    string | null;
  // Attribution result — null means no deal activity
  dealId:           string | null;
  dealName:         string | null;
  attribution:      "new_deal" | "progression" | null;
  // Was this contact already in a deal before the window?
  preExistingDeal:  boolean;
}

export interface RepOutboundStats {
  ownerId:    string;
  repName:    string;
  // Email counts by category
  counts: {
    Sequence:   number;
    Roundtable: number;
    Outreach:   number;
    total:      number;
  };
  // Attribution
  newDeals:       number;  // contacts emailed → new deal created in window
  progressions:   number;  // contacts emailed → existing deal reached Demo in window
  // The attributed emails themselves, for detail view
  attributed: AttributedEmail[];
}

export interface OutboundReport {
  window:   OutboundWindow;
  windowStart: string;
  windowEnd:   string;
  reps:     RepOutboundStats[];
  asOf:     string;
}
