export type ClientActivityType = "PLAN_CHANGED" | "ADVISED_PLAN_CLEARED";

export type ClientActivityActorRealm = "admin" | "executive" | "system";

export interface ClientActivityRecord {
  id: string;
  userId: string;
  activityType: ClientActivityType;
  previousValue: string | null;
  newValue: string | null;
  actorRealm: ClientActivityActorRealm | null;
  actorId: string | null;
  actorName: string | null;
  description: string | null;
  createdAt: string;
}

export interface ClientActivityActor {
  realm: ClientActivityActorRealm;
  id?: string;
  name?: string;
}
