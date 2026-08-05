export type ClientDocumentKind = "RUT" | "LIQUIDACION" | "PLAN" | "OTROS";

export const CLIENT_DOCUMENT_KIND_OPTIONS: Array<{
  value: ClientDocumentKind;
  label: string;
}> = [
  { value: "RUT", label: "RUT" },
  { value: "LIQUIDACION", label: "Liquidación" },
  { value: "PLAN", label: "Plan" },
  { value: "OTROS", label: "Otros" },
];

export const CLIENT_DOCUMENT_KIND_LABELS: Record<ClientDocumentKind, string> = {
  RUT: "RUT",
  LIQUIDACION: "Liquidación",
  PLAN: "Plan",
  OTROS: "Otros",
};

export function isClientDocumentKind(value: string): value is ClientDocumentKind {
  return CLIENT_DOCUMENT_KIND_OPTIONS.some((option) => option.value === value);
}

export interface ClientDocumentRecord {
  id: string;
  userId: string;
  kind: ClientDocumentKind;
  customLabel: string | null;
  /** Etiqueta para UI: customLabel si OTROS, o label del kind. */
  displayLabel: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  uploadedById: string | null;
  uploadedByName: string | null;
  createdAt: string;
  isImage: boolean;
  isPdf: boolean;
}
