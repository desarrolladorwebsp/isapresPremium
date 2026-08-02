export interface PlanPdfUploadSuccess {
  ok: true;
  fileName: string;
  uniqueCode: string;
  planName: string;
  isapre: string;
  isapreId: string;
  replaced: boolean;
  detectedFromFileName: boolean;
  storagePath: string;
  url: string;
  backend: "local" | "blob" | "cpanel";
  bytes: number;
}

export interface PlanPdfUploadFailure {
  ok: false;
  fileName: string;
  error: string;
  uniqueCode?: string;
  candidates?: Array<{
    uniqueCode: string;
    planName: string;
    isapre: string;
    isapreId: string;
  }>;
}

export type PlanPdfUploadItemResult = PlanPdfUploadSuccess | PlanPdfUploadFailure;

export interface PlanPdfBatchUploadResponse {
  results: PlanPdfUploadItemResult[];
  uploaded: number;
  replaced: number;
  failed: number;
}
