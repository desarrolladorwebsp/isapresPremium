import { normalizeRut } from "@/lib/auth/rut";

export function normalizeCompanyAgreementName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeCompanyAgreementRut(value: string): string {
  const normalized = normalizeRut(value);
  if (normalized.length <= 1) return normalized;

  const body = normalized.slice(0, -1).replace(/^0+/, "") || "0";
  const digit = normalized.slice(-1);
  return `${body}${digit}`;
}

export function parseAgreementDiscountPercent(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return normalizeDiscountNumber(value);
  }

  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return null;
  return normalizeDiscountNumber(parsed);
}

function normalizeDiscountNumber(value: number): number | null {
  const percent = value > 0 && value <= 1 ? value * 100 : value;
  if (percent <= 0) return null;
  return Math.round(percent * 100) / 100;
}
