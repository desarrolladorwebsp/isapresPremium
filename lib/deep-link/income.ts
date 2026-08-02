/** Extrae solo dígitos del ingreso (acepta "1500000", "1.500.000", "$1.500.000"). */
export function normalizeIncomeDigits(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

/** Formato chileno para mostrar en el campo de ingreso del buscador. */
export function formatMonthlyIncomeForDisplay(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";

  const digits = normalizeIncomeDigits(raw);
  if (!digits) return "";

  const value = Number(digits);
  if (!Number.isFinite(value) || value <= 0) return "";

  return value.toLocaleString("es-CL");
}
