export interface PlanBulkImportIssue {
  sheet?: "Planes" | "Coberturas";
  row?: number;
  code?: string;
  message: string;
}

export interface PlanBulkImportResult {
  ok: true;
  sourceFile: string;
  processed: number;
  created: number;
  updated: number;
  deleted: number;
  warnings: string[];
}
