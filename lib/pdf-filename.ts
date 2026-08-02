const PDF_EXTENSION = ".pdf";

export function ensurePdfExtension(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) return `plan${PDF_EXTENSION}`;
  return trimmed.toLowerCase().endsWith(PDF_EXTENSION)
    ? trimmed
    : `${trimmed}${PDF_EXTENSION}`;
}

export function buildPlanPdfFileName(uniqueCode: string): string {
  return ensurePdfExtension(uniqueCode.trim() || "plan");
}
