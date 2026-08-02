export interface ClientPlanSnapshot {
  planCode: string;
  planName: string;
  isapre: string;
  finalPriceUf?: number | null;
  finalPriceClp?: number | null;
  quotedAt?: string | null;
}

export interface UpdateClientAdvisedPlanInput {
  planCode: string | null;
  notes?: string | null;
}
