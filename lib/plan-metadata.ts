import type { PlanTypeFilterId } from "@/types/filters";
import type { HealthPlan, HealthPlanSummary, PlanTypeId } from "@/types/plan";

type PlanMetadataInput = Pick<
  HealthPlan,
  "plan_name" | "has_top" | "additional_notes"
> & {
  plan_type?: PlanTypeId | null;
};

export const PLAN_TYPE_LABELS: Record<PlanTypeFilterId, string> = {
  closed: "Cerrado",
  free_choice: "Libre Elección",
  preferred: "Preferente",
};

export const PLAN_TYPE_IDS: PlanTypeId[] = [
  "preferred",
  "free_choice",
  "closed",
];

export function isPlanTypeId(value: unknown): value is PlanTypeId {
  return (
    value === "preferred" || value === "free_choice" || value === "closed"
  );
}

/** Preferente implica Top; las otras modalidades no. */
export function resolveHasTopFromPlanType(planType: PlanTypeId): boolean {
  return planType === "preferred";
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Inferencia legacy cuando aún no hay `plan_type` persistido. */
function inferPlanTypesFromHeuristics(
  plan: PlanMetadataInput,
): PlanTypeFilterId[] {
  const name = normalizeText(plan.plan_name);
  const notes = normalizeText(plan.additional_notes ?? "");
  const types: PlanTypeFilterId[] = [];

  if (plan.has_top || name.includes("preferente") || notes.includes("preferente")) {
    types.push("preferred");
  }
  if (
    name.includes("libre") ||
    notes.includes("libre eleccion") ||
    name.includes("le ")
  ) {
    types.push("free_choice");
  }
  if (
    name.includes("cerrado") ||
    name.includes("-sf") ||
    notes.includes("cerrado")
  ) {
    types.push("closed");
  }
  if (types.length === 0) types.push("free_choice");
  return types;
}

export function inferPlanTypes(plan: PlanMetadataInput): PlanTypeFilterId[] {
  if (isPlanTypeId(plan.plan_type)) {
    return [plan.plan_type];
  }
  return inferPlanTypesFromHeuristics(plan);
}

export function resolvePrimaryPlanType(plan: PlanMetadataInput): PlanTypeFilterId {
  if (isPlanTypeId(plan.plan_type)) {
    return plan.plan_type;
  }

  const types = inferPlanTypesFromHeuristics(plan);
  if (types.includes("preferred")) return "preferred";
  if (types.includes("closed")) return "closed";
  return "free_choice";
}

export function resolveCommercialPlanName(
  plan: Pick<HealthPlan, "isapre" | "plan_name"> | HealthPlanSummary,
): string {
  const prefix = `${plan.isapre} `.trim();
  const normalizedPrefix = `${prefix} `;
  if (plan.plan_name.toLowerCase().startsWith(normalizedPrefix.toLowerCase())) {
    const stripped = plan.plan_name.slice(normalizedPrefix.length).trim();
    return stripped.length > 0 ? stripped : plan.plan_name;
  }
  return plan.plan_name;
}

export function formatBasePriceBadgeLabel(basePriceUf: number): string {
  return `BASE ${basePriceUf.toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
