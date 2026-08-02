export interface IsaprePdfSummaryRow {
  isapreId: string;
  isapre: string;
  totalPlanes: number;
  conPdf: number;
  sinPdf: number;
  pctPdf: number;
  conCobertura: number;
  sinCobertura: number;
  codigosSinPdf: string[];
}

export interface MissingPlanPdfRow {
  isapreId: string;
  isapre: string;
  uniqueCode: string;
  planName: string;
  basePriceUf: number;
  coverageCount: number;
  zones: string;
  hasTop: boolean;
}

export interface PlanPdfReportTotals {
  isapres: number;
  planes: number;
  conPdf: number;
  sinPdf: number;
  pctPdf: number;
}

export interface PlanPdfReport {
  generatedAt: string;
  totals: PlanPdfReportTotals;
  summary: IsaprePdfSummaryRow[];
  missingPlans: MissingPlanPdfRow[];
}
