export interface ClientPlanSnapshot {
  planCode: string;
  planName: string;
  isapre: string;
  /** Precio base del plan en UF (catálogo). */
  basePriceUf?: number | null;
  finalPriceUf?: number | null;
  finalPriceClp?: number | null;
  quotedAt?: string | null;
}

export interface UpdateClientAdvisedPlanInput {
  planCode: string | null;
  notes?: string | null;
}
