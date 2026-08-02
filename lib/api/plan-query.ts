import { Prisma } from "@prisma/client";
import {
  attachCoverageToHealthPlan,
  buildHealthPlanCatalogItem,
} from "@/lib/api/plan-catalog-builder";
import {
  getCachedCoverageMap,
  loadCoveragesForPlanCode,
} from "@/lib/api/plan-coverage-cache";
import { dedupeCoverageEntries } from "@/lib/api/plan-validation";
import { resolveIsapreIdFromName, resolveIsapreNameFromId } from "@/lib/isapre-catalog";
import {
  DEFAULT_GES_PREMIUM_UF,
  ISAPRE_GES_DEFAULTS,
  resolveGesPremiumUf,
} from "@/lib/isapre-ges-defaults";
import { enrichHealthPlanCatalog } from "@/lib/plan-zones";
import { isPlanTypeId, resolvePrimaryPlanType } from "@/lib/plan-metadata";
import { prisma } from "@/lib/prisma";
import type { CoverageEntry, HealthPlan, HealthPlanCatalogItem, PlanTypeId } from "@/types/plan";

type PlanQueryStrategy =
  | "prisma_full"
  | "prisma_coverages"
  | "raw_modern"
  | "raw_legacy";

let activeStrategy: PlanQueryStrategy | null = null;

function resolvePlanTypeFromFields(input: {
  plan_name: string;
  has_top: boolean;
  additional_notes: string | null;
  plan_type?: string | null;
}): PlanTypeId {
  if (isPlanTypeId(input.plan_type)) return input.plan_type;
  return resolvePrimaryPlanType({
    plan_name: input.plan_name,
    has_top: input.has_top,
    additional_notes: input.additional_notes,
  });
}


function resolveGesPremiumForIsapreId(isapreId: string): number {
  const defaults = ISAPRE_GES_DEFAULTS[isapreId];
  return resolveGesPremiumUf(
    defaults?.gesPremiumUf,
    DEFAULT_GES_PREMIUM_UF,
  );
}

function isSchemaMismatchError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2022" || error.code === "P2021";
  }

  return error instanceof Prisma.PrismaClientValidationError;
}


function mapCoverageMap(
  uniqueCode: string,
  coverages: Map<string, CoverageEntry[]>,
): CoverageEntry[] {
  return dedupeCoverageEntries(coverages.get(uniqueCode) ?? []);
}

type RawModernPlanRow = {
  unique_code: string;
  isapre_id: string;
  plan_name: string;
  base_price_uf: number;
  plan_type: string | null;
  has_top: boolean;
  additional_notes: string | null;
  pdf_url: string | null;
  pdf_public_id: string | null;
  zones: string[];
  isapre_name: string;
};

async function findManyHealthPlansRawModern(): Promise<HealthPlan[]> {
  const [planRows, coverages] = await Promise.all([
    prisma.$queryRaw<RawModernPlanRow[]>`
      SELECT
        p.unique_code,
        p.isapre_id,
        p.plan_name,
        p.base_price_uf,
        p.plan_type,
        p.has_top,
        p.additional_notes,
        p.pdf_url,
        p.pdf_public_id,
        p.zones,
        i.name AS isapre_name
      FROM plans p
      INNER JOIN isapres i ON i.id = p.isapre_id
      ORDER BY p.plan_name ASC
    `,
    getCachedCoverageMap(),
  ]);

  return planRows.map((plan) => ({
    isapre: plan.isapre_name,
    plan_name: plan.plan_name,
    unique_code: plan.unique_code,
    base_price_uf: plan.base_price_uf,
    ges_premium_uf: resolveGesPremiumForIsapreId(plan.isapre_id),
    plan_type: resolvePlanTypeFromFields({
      plan_name: plan.plan_name,
      has_top: plan.has_top,
      additional_notes: plan.additional_notes,
      plan_type: plan.plan_type,
    }),
    has_top: plan.has_top,
    additional_notes: plan.additional_notes,
    pdf_url: plan.pdf_url,
    pdf_public_id: plan.pdf_public_id,
    zones: plan.zones ?? [],
    coverage: mapCoverageMap(plan.unique_code, coverages),
  }));
}

async function findHealthPlanByCodeRawModern(
  uniqueCode: string,
): Promise<HealthPlan | null> {
  const [planRows, coverage] = await Promise.all([
    prisma.$queryRaw<RawModernPlanRow[]>`
      SELECT
        p.unique_code,
        p.isapre_id,
        p.plan_name,
        p.base_price_uf,
        p.plan_type,
        p.has_top,
        p.additional_notes,
        p.pdf_url,
        p.pdf_public_id,
        p.zones,
        i.name AS isapre_name
      FROM plans p
      INNER JOIN isapres i ON i.id = p.isapre_id
      WHERE p.unique_code = ${uniqueCode}
      LIMIT 1
    `,
    loadCoveragesForPlanCode(uniqueCode),
  ]);

  const plan = planRows[0];
  if (!plan) return null;

  return {
    isapre: plan.isapre_name,
    plan_name: plan.plan_name,
    unique_code: plan.unique_code,
    base_price_uf: plan.base_price_uf,
    ges_premium_uf: resolveGesPremiumForIsapreId(plan.isapre_id),
    plan_type: resolvePlanTypeFromFields({
      plan_name: plan.plan_name,
      has_top: plan.has_top,
      additional_notes: plan.additional_notes,
      plan_type: plan.plan_type,
    }),
    has_top: plan.has_top,
    additional_notes: plan.additional_notes,
    pdf_url: plan.pdf_url,
    pdf_public_id: plan.pdf_public_id,
    zones: plan.zones ?? [],
    coverage,
  };
}

type RawLegacyPlanRow = {
  unique_code: string;
  isapre: string;
  plan_name: string;
  base_price_uf: number;
  plan_type?: string | null;
  has_top: boolean;
  additional_notes: string | null;
  pdf_url: string | null;
  pdf_public_id: string | null;
  zones: string[];
};

async function findManyHealthPlansRawLegacy(): Promise<HealthPlan[]> {
  const [planRows, coverages] = await Promise.all([
    prisma.$queryRaw<RawLegacyPlanRow[]>`
      SELECT
        unique_code,
        isapre,
        plan_name,
        base_price_uf,
        has_top,
        additional_notes,
        pdf_url,
        pdf_public_id,
        zones
      FROM plans
      ORDER BY plan_name ASC
    `,
    getCachedCoverageMap(),
  ]);

  return planRows.map((plan) => {
    const isapreId = resolveIsapreIdFromName(plan.isapre);

    return {
      isapre: plan.isapre,
      plan_name: plan.plan_name,
      unique_code: plan.unique_code,
      base_price_uf: plan.base_price_uf,
      ges_premium_uf: resolveGesPremiumForIsapreId(isapreId),
      plan_type: resolvePlanTypeFromFields({
        plan_name: plan.plan_name,
        has_top: plan.has_top,
        additional_notes: plan.additional_notes,
        plan_type: plan.plan_type,
      }),
      has_top: plan.has_top,
      additional_notes: plan.additional_notes,
      pdf_url: plan.pdf_url,
      pdf_public_id: plan.pdf_public_id,
      zones: plan.zones ?? [],
      coverage: mapCoverageMap(plan.unique_code, coverages),
    };
  });
}

async function findHealthPlanByCodeRawLegacy(
  uniqueCode: string,
): Promise<HealthPlan | null> {
  const [planRows, coverage] = await Promise.all([
    prisma.$queryRaw<RawLegacyPlanRow[]>`
      SELECT
        unique_code,
        isapre,
        plan_name,
        base_price_uf,
        has_top,
        additional_notes,
        pdf_url,
        pdf_public_id,
        zones
      FROM plans
      WHERE unique_code = ${uniqueCode}
      LIMIT 1
    `,
    loadCoveragesForPlanCode(uniqueCode),
  ]);

  const plan = planRows[0];
  if (!plan) return null;

  const isapreId = resolveIsapreIdFromName(plan.isapre);

  return {
    isapre: plan.isapre,
    plan_name: plan.plan_name,
    unique_code: plan.unique_code,
    base_price_uf: plan.base_price_uf,
    ges_premium_uf: resolveGesPremiumForIsapreId(isapreId),
    plan_type: resolvePlanTypeFromFields({
      plan_name: plan.plan_name,
      has_top: plan.has_top,
      additional_notes: plan.additional_notes,
      plan_type: plan.plan_type,
    }),
    has_top: plan.has_top,
    additional_notes: plan.additional_notes,
    pdf_url: plan.pdf_url,
    pdf_public_id: plan.pdf_public_id,
    zones: plan.zones ?? [],
    coverage,
  };
}

async function findManyWithPrismaFull(): Promise<HealthPlan[]> {
  const [plans, coverages] = await Promise.all([
    prisma.plan.findMany({
      include: { isapreRef: true },
      orderBy: { planName: "asc" },
    }),
    getCachedCoverageMap(),
  ]);

  return plans.map((plan) =>
    attachCoverageToHealthPlan(
      {
        isapre: plan.isapreRef.name,
        plan_name: plan.planName,
        unique_code: plan.uniqueCode,
        base_price_uf: plan.basePriceUf,
        ges_premium_uf: resolveGesPremiumUf(plan.isapreRef.gesPremiumUf),
        plan_type: resolvePlanTypeFromFields({
          plan_name: plan.planName,
          has_top: plan.hasTop,
          additional_notes: plan.additionalNotes,
          plan_type: plan.planType,
        }),
        has_top: plan.hasTop,
        additional_notes: plan.additionalNotes,
        pdf_url: plan.pdfUrl,
        pdf_public_id: plan.pdfPublicId,
        zones: plan.zones ?? [],
      },
      coverages.get(plan.uniqueCode) ?? [],
    ),
  );
}

async function findManyWithPrismaCoverages(): Promise<HealthPlan[]> {
  const [plans, coverages] = await Promise.all([
    prisma.plan.findMany({
      orderBy: { planName: "asc" },
    }),
    getCachedCoverageMap(),
  ]);

  return plans.map((plan) =>
    attachCoverageToHealthPlan(
      {
        isapre: resolveIsapreNameFromId(plan.isapreId),
        plan_name: plan.planName,
        unique_code: plan.uniqueCode,
        base_price_uf: plan.basePriceUf,
        ges_premium_uf: resolveGesPremiumForIsapreId(plan.isapreId),
        plan_type: resolvePlanTypeFromFields({
          plan_name: plan.planName,
          has_top: plan.hasTop,
          additional_notes: plan.additionalNotes,
          plan_type: plan.planType,
        }),
        has_top: plan.hasTop,
        additional_notes: plan.additionalNotes,
        pdf_url: plan.pdfUrl,
        pdf_public_id: plan.pdfPublicId,
        zones: plan.zones ?? [],
      },
      coverages.get(plan.uniqueCode) ?? [],
    ),
  );
}

async function findHealthPlanWithPrismaFull(
  uniqueCode: string,
): Promise<HealthPlan | null> {
  const [plan, coverage] = await Promise.all([
    prisma.plan.findUnique({
      where: { uniqueCode },
      include: { isapreRef: true },
    }),
    loadCoveragesForPlanCode(uniqueCode),
  ]);

  if (!plan) return null;

  return attachCoverageToHealthPlan(
    {
      isapre: plan.isapreRef.name,
      plan_name: plan.planName,
      unique_code: plan.uniqueCode,
      base_price_uf: plan.basePriceUf,
      ges_premium_uf: resolveGesPremiumUf(plan.isapreRef.gesPremiumUf),
      plan_type: resolvePlanTypeFromFields({
        plan_name: plan.planName,
        has_top: plan.hasTop,
        additional_notes: plan.additionalNotes,
        plan_type: plan.planType,
      }),
      has_top: plan.hasTop,
      additional_notes: plan.additionalNotes,
      pdf_url: plan.pdfUrl,
      pdf_public_id: plan.pdfPublicId,
      zones: plan.zones ?? [],
    },
    coverage,
  );
}

async function findHealthPlanWithPrismaCoverages(
  uniqueCode: string,
): Promise<HealthPlan | null> {
  const [plan, coverage] = await Promise.all([
    prisma.plan.findUnique({
      where: { uniqueCode },
    }),
    loadCoveragesForPlanCode(uniqueCode),
  ]);

  if (!plan) return null;

  return attachCoverageToHealthPlan(
    {
      isapre: resolveIsapreNameFromId(plan.isapreId),
      plan_name: plan.planName,
      unique_code: plan.uniqueCode,
      base_price_uf: plan.basePriceUf,
      ges_premium_uf: resolveGesPremiumForIsapreId(plan.isapreId),
      plan_type: resolvePlanTypeFromFields({
        plan_name: plan.planName,
        has_top: plan.hasTop,
        additional_notes: plan.additionalNotes,
        plan_type: plan.planType,
      }),
      has_top: plan.hasTop,
      additional_notes: plan.additionalNotes,
      pdf_url: plan.pdfUrl,
      pdf_public_id: plan.pdfPublicId,
      zones: plan.zones ?? [],
    },
    coverage,
  );
}

async function runPlanQueryStrategies<T>(
  loaders: Array<{ strategy: PlanQueryStrategy; load: () => Promise<T> }>,
): Promise<T> {
  const ordered =
    activeStrategy === null
      ? loaders
      : [
          ...loaders.filter((item) => item.strategy === activeStrategy),
          ...loaders.filter((item) => item.strategy !== activeStrategy),
        ];

  let lastError: unknown;

  for (const { strategy, load } of ordered) {
    try {
      const result = await load();
      activeStrategy = strategy;
      return result;
    } catch (error) {
      lastError = error;

      if (!isSchemaMismatchError(error)) {
        throw error;
      }

      console.warn(
        `[plan-query] Estrategia ${strategy} falló por esquema; probando alternativa.`,
        error,
      );
    }
  }

  throw lastError ?? new Error("No se pudo cargar el catálogo de planes.");
}

export async function findManyHealthPlans(): Promise<HealthPlan[]> {
  const plans = await runPlanQueryStrategies([
    { strategy: "prisma_full", load: findManyWithPrismaFull },
    { strategy: "prisma_coverages", load: findManyWithPrismaCoverages },
    { strategy: "raw_modern", load: findManyHealthPlansRawModern },
    { strategy: "raw_legacy", load: findManyHealthPlansRawLegacy },
  ]);

  return enrichHealthPlanCatalog(plans);
}

/** Catálogo ligero para cotizador público (sin arrays coverage completos). */
export async function findManyHealthPlanCatalogItems(): Promise<
  HealthPlanCatalogItem[]
> {
  const [plans, coverages] = await Promise.all([
    prisma.plan.findMany({
      include: { isapreRef: true },
      orderBy: { planName: "asc" },
    }),
    getCachedCoverageMap(),
  ]);

  return plans.map((plan) =>
    buildHealthPlanCatalogItem(
      {
        isapre: plan.isapreRef.name,
        plan_name: plan.planName,
        unique_code: plan.uniqueCode,
        base_price_uf: plan.basePriceUf,
        ges_premium_uf: resolveGesPremiumUf(plan.isapreRef.gesPremiumUf),
        plan_type: resolvePlanTypeFromFields({
          plan_name: plan.planName,
          has_top: plan.hasTop,
          additional_notes: plan.additionalNotes,
          plan_type: plan.planType,
        }),
        has_top: plan.hasTop,
        additional_notes: plan.additionalNotes,
        pdf_url: plan.pdfUrl,
        pdf_public_id: plan.pdfPublicId,
        zones: plan.zones ?? [],
      },
      coverages.get(plan.uniqueCode) ?? [],
    ),
  );
}

export async function findHealthPlanByCode(
  uniqueCode: string,
): Promise<HealthPlan | null> {
  return runPlanQueryStrategies([
    {
      strategy: "prisma_full",
      load: () => findHealthPlanWithPrismaFull(uniqueCode),
    },
    {
      strategy: "prisma_coverages",
      load: () => findHealthPlanWithPrismaCoverages(uniqueCode),
    },
    {
      strategy: "raw_modern",
      load: () => findHealthPlanByCodeRawModern(uniqueCode),
    },
    {
      strategy: "raw_legacy",
      load: () => findHealthPlanByCodeRawLegacy(uniqueCode),
    },
  ]);
}
