export type QuoteActivityType =
  | "CREATED"
  | "STATUS_CHANGED"
  | "EXECUTIVE_ASSIGNED"
  | "EXECUTIVE_UNASSIGNED"
  | "DISTRIBUTED";

export type QuoteActivityActorRealm = "admin" | "executive" | "system";

export interface QuoteActivityRecord {
  id: string;
  quoteId: string;
  activityType: QuoteActivityType;
  previousValue: string | null;
  newValue: string | null;
  actorRealm: QuoteActivityActorRealm | null;
  actorId: string | null;
  actorName: string | null;
  description: string | null;
  createdAt: string;
}

export interface QuoteActivityActor {
  realm: QuoteActivityActorRealm;
  id?: string;
  name?: string;
}
