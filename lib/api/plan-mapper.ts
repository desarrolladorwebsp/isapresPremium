import { dedupeCoverageEntries } from "@/lib/api/plan-validation";
import { resolveIsapreNameFromId } from "@/lib/isapre-catalog";
import {
  DEFAULT_GES_PREMIUM_UF,
  ISAPRE_GES_DEFAULTS,
  resolveGesPremiumUf,
} from "@/lib/isapre-ges-defaults";
import {
  resolveHasTopFromPlanType,
  resolvePrimaryPlanType,
} from "@/lib/plan-metadata";
import type { CoverageEntry, HealthPlan, PlanTypeId } from "@/types/plan";
import type {
  CoverageEntry as DbCoverage,
  Isapre as DbIsapre,
  Plan as DbPlan,
  PlanType as DbPlanType,
} from "@prisma/client";

export type PlanWithCoverages = DbPlan & {
  coverages: DbCoverage[];
  isapreRef: DbIsapre;
};

export type PlanWithCoveragesOnly = DbPlan & {
  coverages: DbCoverage[];
};

function resolveGesPremiumForIsapreId(isapreId: string): number {
  const defaults = ISAPRE_GES_DEFAULTS[isapreId];
  return resolveGesPremiumUf(
    defaults?.gesPremiumUf,
    DEFAULT_GES_PREMIUM_UF,
  );
}

function resolvePlanTypeFromDb(
  plan: Pick<DbPlan, "planName" | "hasTop" | "additionalNotes"> & {
    planType?: DbPlanType | null;
  },
): PlanTypeId {
  if (
    plan.planType === "preferred" ||
    plan.planType === "free_choice" ||
    plan.planType === "closed"
  ) {
    return plan.planType;
  }

  return resolvePrimaryPlanType({
    plan_name: plan.planName,
    has_top: plan.hasTop,
    additional_notes: plan.additionalNotes,
  });
}

export function mapDbPlanToHealthPlan(plan: PlanWithCoverages): HealthPlan {
  const planType = resolvePlanTypeFromDb(plan);
  return {
    isapre: plan.isapreRef.name,
    plan_name: plan.planName,
    unique_code: plan.uniqueCode,
    base_price_uf: plan.basePriceUf,
    ges_premium_uf: resolveGesPremiumUf(plan.isapreRef.gesPremiumUf),
    plan_type: planType,
    has_top: plan.hasTop,
    additional_notes: plan.additionalNotes,
    pdf_url: plan.pdfUrl,
    pdf_public_id: plan.pdfPublicId,
    zones: plan.zones ?? [],
    coverage: dedupeCoverageEntries(
      plan.coverages.map(mapDbCoverageToEntry),
    ),
  };
}

/** Fallback cuando la BD aún no tiene columnas GES en `isapres`. */
export function mapDbPlanToHealthPlanLegacy(
  plan: PlanWithCoveragesOnly,
): HealthPlan {
  const planType = resolvePlanTypeFromDb(plan);
  return {
    isapre: resolveIsapreNameFromId(plan.isapreId),
    plan_name: plan.planName,
    unique_code: plan.uniqueCode,
    base_price_uf: plan.basePriceUf,
    ges_premium_uf: resolveGesPremiumForIsapreId(plan.isapreId),
    plan_type: planType,
    has_top: plan.hasTop,
    additional_notes: plan.additionalNotes,
    pdf_url: plan.pdfUrl,
    pdf_public_id: plan.pdfPublicId,
    zones: plan.zones ?? [],
    coverage: dedupeCoverageEntries(
      plan.coverages.map(mapDbCoverageToEntry),
    ),
  };
}

function mapDbCoverageToEntry(entry: DbCoverage): CoverageEntry {
  return {
    clinic_id: entry.clinicId,
    clinic_name: entry.clinicName,
    percentage: entry.percentage,
    type: entry.type as CoverageEntry["type"],
  };
}

export function mapHealthPlanToDbFields(plan: HealthPlan, isapreId: string) {
  const planType = plan.plan_type;
  return {
    uniqueCode: plan.unique_code,
    isapreId,
    planName: plan.plan_name,
    basePriceUf: plan.base_price_uf,
    planType,
    hasTop: resolveHasTopFromPlanType(planType),
    additionalNotes: plan.additional_notes,
    pdfUrl: plan.pdf_url,
    pdfPublicId: plan.pdf_public_id,
    zones: plan.zones ?? [],
  };
}

export function mapHealthPlanToDbCreate(plan: HealthPlan, isapreId: string) {
  return {
    ...mapHealthPlanToDbFields(plan, isapreId),
    coverages: {
      create: plan.coverage.map((entry) => ({
        clinicId: entry.clinic_id,
        clinicName: entry.clinic_name,
        percentage: entry.percentage,
        type: entry.type,
      })),
    },
  };
}

export function mapHealthPlanToDbUpdate(plan: HealthPlan, isapreId: string) {
  return mapHealthPlanToDbFields(plan, isapreId);
}
