import { DEFAULT_UF_VALUE_CLP } from "@/lib/economic-indicators";
import type { CoverageEntry } from "@/types/plan";

export function formatPlanUf(value: number): string {
  return `${value.toLocaleString("es-CL", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} UF`;
}

export function formatQuotedUf(value: number): string {
  return `UF ${value.toLocaleString("es-CL", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}`;
}

export function formatPlanClp(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function planPriceClp(
  basePriceUf: number,
  ufToClp = DEFAULT_UF_VALUE_CLP,
): number {
  return Math.round(basePriceUf * ufToClp);
}

export function splitCoverageByType(coverage: CoverageEntry[]) {
  return {
    hospitalaria: coverage.filter((entry) => entry.type === "hospitalaria"),
    ambulatoria: coverage.filter((entry) => entry.type === "ambulatoria"),
  };
}

export function coverageGlobalPercentage(entries: CoverageEntry[]): number {
  if (entries.length === 0) return 0;
  const total = entries.reduce((sum, entry) => sum + entry.percentage, 0);
  return Math.round(total / entries.length);
}

export function uniqueCoveragePercentages(entries: CoverageEntry[]): number[] {
  return [...new Set(entries.map((entry) => entry.percentage))].sort(
    (a, b) => a - b,
  );
}

/** Lista todos los % distintos del plan, ej. "50% 70%". */
export function formatCoveragePercentagesList(entries: CoverageEntry[]): string {
  const values = uniqueCoveragePercentages(entries);
  if (values.length === 0) return "—";
  return values.map((value) => `${value}%`).join(" ");
}
