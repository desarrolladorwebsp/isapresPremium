export interface ClientPlanSnapshot {
  planCode: string;
  planName: string;
  isapre: string;
  /** Precio base del plan en UF (catálogo). */
  basePriceUf?: number | null;
  finalPriceUf?: number | null;
  finalPriceClp?: number | null;
  quotedAt?: string | null;
  /** true si es el plan elegido (User.advisedPlanCode). */
  isChosen?: boolean;
  /** Id de fila en client_assigned_plans (si aplica). */
  assignmentId?: string | null;
  assignedAt?: string | null;
}

/** Marca / limpia el plan elegido (debe existir en assignedPlans o se asigna). */
export interface UpdateClientAdvisedPlanInput {
  planCode: string | null;
  notes?: string | null;
}

/** Agrega un plan a la lista de propuestas del cliente. */
export interface AssignClientPlanInput {
  planCode: string;
  notes?: string | null;
  /** Si true (default), también lo deja como plan elegido. */
  setAsChosen?: boolean;
}
