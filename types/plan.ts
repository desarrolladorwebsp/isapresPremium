export type CoverageType = "hospitalaria" | "ambulatoria";

/** Modalidad comercial del plan Isapre. */
export type PlanTypeId = "preferred" | "free_choice" | "closed";

export interface CoverageEntry {
  clinic_id: string;
  clinic_name: string;
  percentage: number;
  type: CoverageType;
}

export interface HealthPlan {
  isapre: string;
  plan_name: string;
  unique_code: string;
  base_price_uf: number;
  /** Prima GES mensual en UF por beneficiario (según isapre). */
  ges_premium_uf: number;
  /** Modalidad: preferente, libre elección o cerrado. */
  plan_type: PlanTypeId;
  has_top: boolean;
  additional_notes: string | null;
  /** URL de descarga del PDF vía API local. */
  pdf_url: string | null;
  /** Ruta relativa en storage/planes-pdf (ej. consalud/13-sf1001-26.pdf). */
  pdf_public_id: string | null;
  /** Zonas explícitas (importación) además de las inferidas por clínicas. */
  zones: string[];
  coverage: CoverageEntry[];
}

/** Resumen de coberturas para listados (sin detalle por clínica). */
export interface PlanCoverageSummary {
  clinic_count: number;
  hospital_percentages: number[];
  ambulatory_percentages: number[];
  hospital_avg: number;
  ambulatory_avg: number;
}

/** Índice compacto clinic_id → [hospitalaria %, ambulatoria %] para filtros. */
export type ClinicCoverageIndex = Record<string, [number, number]>;

/** Plan ligero para resultados de búsqueda (sin array de coberturas completo). */
export interface HealthPlanSummary {
  isapre: string;
  plan_name: string;
  unique_code: string;
  base_price_uf: number;
  ges_premium_uf: number;
  plan_type: PlanTypeId;
  has_top: boolean;
  additional_notes: string | null;
  pdf_url: string | null;
  pdf_public_id: string | null;
  coverage_summary: PlanCoverageSummary;
}

/** Catálogo público: resumen + metadatos mínimos para filtrar sin payload completo. */
export interface HealthPlanCatalogItem extends HealthPlanSummary {
  zones: string[];
  clinic_index: ClinicCoverageIndex;
}

export interface PlanSearchResult {
  plans: HealthPlanSummary[];
  total: number;
  limit: number;
  offset: number;
}
