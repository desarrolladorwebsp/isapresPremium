import { resolveCanonicalClinicId } from "@/lib/clinic-canonical-ids";
import {
  isPlanTypeId,
  resolveHasTopFromPlanType,
  resolvePrimaryPlanType,
} from "@/lib/plan-metadata";
import type { CoverageEntry, HealthPlan } from "@/types/plan";

function isOptionalPdfField(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim().length > 0)
  );
}

function isValidCoverageEntry(entry: unknown): entry is CoverageEntry {
  if (!entry || typeof entry !== "object") return false;
  const coverage = entry as CoverageEntry;

  return (
    typeof coverage.clinic_id === "string" &&
    coverage.clinic_id.trim().length > 0 &&
    typeof coverage.clinic_name === "string" &&
    coverage.clinic_name.trim().length > 0 &&
    typeof coverage.percentage === "number" &&
    Number.isFinite(coverage.percentage) &&
    (coverage.type === "hospitalaria" || coverage.type === "ambulatoria")
  );
}

export function isValidPlan(payload: unknown): payload is HealthPlan {
  if (!payload || typeof payload !== "object") return false;
  const plan = payload as HealthPlan;

  return (
    typeof plan.isapre === "string" &&
    plan.isapre.trim().length > 0 &&
    typeof plan.plan_name === "string" &&
    plan.plan_name.trim().length > 0 &&
    typeof plan.unique_code === "string" &&
    plan.unique_code.trim().length > 0 &&
    typeof plan.base_price_uf === "number" &&
    Number.isFinite(plan.base_price_uf) &&
    plan.base_price_uf >= 0 &&
    isPlanTypeId(plan.plan_type) &&
    typeof plan.has_top === "boolean" &&
    (plan.additional_notes === null ||
      typeof plan.additional_notes === "string") &&
    isOptionalPdfField(plan.pdf_url) &&
    isOptionalPdfField(plan.pdf_public_id) &&
    Array.isArray(plan.coverage) &&
    plan.coverage.every(isValidCoverageEntry)
  );
}

export function getPlanValidationError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return "El plan enviado no es válido.";
  }

  const plan = payload as HealthPlan;

  if (typeof plan.isapre !== "string" || plan.isapre.trim().length === 0) {
    return "Debes seleccionar una Isapre.";
  }

  if (typeof plan.plan_name !== "string" || plan.plan_name.trim().length === 0) {
    return "El nombre del plan es obligatorio.";
  }

  if (
    typeof plan.unique_code !== "string" ||
    plan.unique_code.trim().length === 0
  ) {
    return "El código único del plan es obligatorio.";
  }

  if (
    typeof plan.base_price_uf !== "number" ||
    !Number.isFinite(plan.base_price_uf) ||
    plan.base_price_uf < 0
  ) {
    return "El precio base en UF debe ser un número válido mayor o igual a 0.";
  }

  if (!isPlanTypeId(plan.plan_type)) {
    return "Debes seleccionar el tipo de plan (preferente, libre elección o cerrado).";
  }

  if (typeof plan.has_top !== "boolean") {
    return "El indicador de plan Top no es válido.";
  }

  if (!Array.isArray(plan.coverage)) {
    return "Las coberturas del plan deben ser una lista.";
  }

  for (const entry of plan.coverage) {
    if (!isValidCoverageEntry(entry)) {
      return "Una o más coberturas tienen datos incompletos o inválidos.";
    }
  }

  return null;
}

/** Elimina coberturas duplicadas (misma clínica + mismo tipo). */
export function dedupeCoverageEntries(
  coverage: CoverageEntry[],
): CoverageEntry[] {
  const seen = new Set<string>();

  return coverage.filter((entry) => {
    const key = `${entry.clinic_id}:${entry.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizePlan(payload: HealthPlan): HealthPlan {
  const planType = isPlanTypeId(payload.plan_type)
    ? payload.plan_type
    : resolvePrimaryPlanType(payload);

  return {
    ...payload,
    isapre: payload.isapre.trim(),
    plan_name: payload.plan_name.trim(),
    unique_code: payload.unique_code.trim(),
    plan_type: planType,
    has_top: resolveHasTopFromPlanType(planType),
    additional_notes: payload.additional_notes?.trim() || null,
    pdf_url: payload.pdf_url?.trim() || null,
    pdf_public_id: payload.pdf_public_id?.trim() || null,
    coverage: dedupeCoverageEntries(
      payload.coverage.map((entry) => ({
        clinic_id: resolveCanonicalClinicId(entry.clinic_id.trim()),
        clinic_name: entry.clinic_name.trim(),
        percentage: entry.percentage,
        type: entry.type,
      })),
    ),
  };
}
