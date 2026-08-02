import { ApiError, toApiError } from "@/lib/api/api-error";
import { invalidatePlanCatalogCache } from "@/lib/api/plan-catalog-cache";
import { ensureIsapreExists } from "@/lib/api/isapre-store";
import {
  mapDbPlanToHealthPlan,
  mapHealthPlanToDbCreate,
  mapHealthPlanToDbUpdate,
} from "@/lib/api/plan-mapper";
import {
  findHealthPlanByCode,
} from "@/lib/api/plan-query";
import { prisma } from "@/lib/prisma";
import { resolveCanonicalClinicId } from "@/lib/clinic-canonical-ids";
import { resolveClinicZoneIds } from "@/lib/clinic-zones";
import type { Clinic } from "@/types/clinic";
import type { HealthPlan } from "@/types/plan";
import type { Prisma } from "@prisma/client";

const planInclude = { coverages: true, isapreRef: true } as const;

async function upsertClinicsForCoverage(
  tx: Prisma.TransactionClient,
  coverage: HealthPlan["coverage"],
): Promise<void> {
  const uniqueClinics = new Map<string, string>();

  for (const entry of coverage) {
    const clinicId = resolveCanonicalClinicId(entry.clinic_id);
    uniqueClinics.set(clinicId, entry.clinic_name);
  }

  for (const [id, name] of uniqueClinics) {
    const zones = resolveClinicZoneIds(id, name);
    await tx.clinic.upsert({
      where: { id },
      create: { id, name, zones },
      update: { name, zones },
    });
  }
}

function mapCoverageCreateInput(coverage: HealthPlan["coverage"]) {
  return coverage.map((entry) => ({
    clinicId: resolveCanonicalClinicId(entry.clinic_id),
    clinicName: entry.clinic_name,
    percentage: entry.percentage,
    type: entry.type,
  }));
}

export async function readPlans(): Promise<HealthPlan[]> {
  const { getCachedHealthPlans } = await import("@/lib/api/plan-catalog-cache");
  return getCachedHealthPlans();
}

export async function readPlanByCode(
  uniqueCode: string,
): Promise<HealthPlan | null> {
  return findHealthPlanByCode(uniqueCode);
}

export async function createPlanRecord(plan: HealthPlan): Promise<HealthPlan> {
  try {
    const isapreId = await ensureIsapreExists(plan.isapre);

    const created = await prisma.$transaction(async (tx) => {
      const existing = await tx.plan.findUnique({
        where: { uniqueCode: plan.unique_code },
        select: { uniqueCode: true },
      });

      if (existing) {
        throw new ApiError("Ya existe un plan con ese código único.", 409);
      }

      await upsertClinicsForCoverage(tx, plan.coverage);

      return tx.plan.create({
        data: mapHealthPlanToDbCreate(plan, isapreId),
        include: planInclude,
      });
    });

    invalidatePlanCatalogCache();
    return mapDbPlanToHealthPlan(created);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function updatePlanRecord(plan: HealthPlan): Promise<HealthPlan> {
  try {
    const isapreId = await ensureIsapreExists(plan.isapre);

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.plan.findUnique({
        where: { uniqueCode: plan.unique_code },
        select: { uniqueCode: true },
      });

      if (!existing) {
        throw new ApiError("Plan no encontrado.", 404);
      }

      await upsertClinicsForCoverage(tx, plan.coverage);

      await tx.coverageEntry.deleteMany({
        where: { planCode: plan.unique_code },
      });

      return tx.plan.update({
        where: { uniqueCode: plan.unique_code },
        data: {
          ...mapHealthPlanToDbUpdate(plan, isapreId),
          coverages: {
            create: mapCoverageCreateInput(plan.coverage),
          },
        },
        include: planInclude,
      });
    });

    invalidatePlanCatalogCache();
    return mapDbPlanToHealthPlan(updated);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function deletePlanRecord(
  uniqueCode: string,
): Promise<HealthPlan | null> {
  try {
    const existing = await prisma.plan.findUnique({
      where: { uniqueCode },
      include: planInclude,
    });

    if (!existing) return null;

    await prisma.plan.delete({
      where: { uniqueCode },
    });

    invalidatePlanCatalogCache();
    return mapDbPlanToHealthPlan(existing);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function writePlans(plans: HealthPlan[]): Promise<void> {
  try {
    const incomingCodes = plans.map((plan) => plan.unique_code);

    await prisma.$transaction(async (tx) => {
      if (incomingCodes.length === 0) {
        await tx.coverageEntry.deleteMany();
        await tx.plan.deleteMany();
        return;
      }

      await tx.plan.deleteMany({
        where: { uniqueCode: { notIn: incomingCodes } },
      });

      for (const plan of plans) {
        const isapreId = await ensureIsapreExists(plan.isapre);
        await upsertClinicsForCoverage(tx, plan.coverage);

        await tx.plan.upsert({
          where: { uniqueCode: plan.unique_code },
          create: mapHealthPlanToDbCreate(plan, isapreId),
          update: {
            ...mapHealthPlanToDbUpdate(plan, isapreId),
            coverages: {
              deleteMany: {},
              create: mapCoverageCreateInput(plan.coverage),
            },
          },
        });
      }
    });
    invalidatePlanCatalogCache();
  } catch (error) {
    throw toApiError(error);
  }
}

export async function readClinics(): Promise<Clinic[]> {
  const clinics = await prisma.clinic.findMany({
    orderBy: { name: "asc" },
  });

  return clinics.map((clinic) => ({
    id: clinic.id,
    name: clinic.name,
    zones: clinic.zones ?? [],
    location:
      clinic.address != null && clinic.lat != null && clinic.lng != null
        ? {
            address: clinic.address,
            lat: clinic.lat,
            lng: clinic.lng,
            source: clinic.locationSource ?? "manual",
          }
        : null,
  }));
}

export async function writeClinics(clinics: Clinic[]): Promise<void> {
  await prisma.$transaction(
    clinics.map((clinic) =>
      prisma.clinic.upsert({
        where: { id: clinic.id },
        create: {
          id: clinic.id,
          name: clinic.name,
          zones: clinic.zones ?? resolveClinicZoneIds(clinic.id),
        },
        update: {
          name: clinic.name,
          zones: clinic.zones ?? resolveClinicZoneIds(clinic.id),
        },
      }),
    ),
  );
}

export async function updateClinicLocation(
  clinicId: string,
  location: { address: string; lat: number; lng: number; source?: string },
): Promise<void> {
  await prisma.clinic.update({
    where: { id: clinicId },
    data: {
      address: location.address,
      lat: location.lat,
      lng: location.lng,
      locationSource: location.source ?? "manual",
      locationUpdatedAt: new Date(),
    },
  });
}

export async function clearClinicLocation(clinicId: string): Promise<void> {
  await prisma.clinic.update({
    where: { id: clinicId },
    data: {
      address: null,
      lat: null,
      lng: null,
      locationSource: null,
      locationUpdatedAt: null,
    },
  });
}

export async function syncClinicNameInPlans(
  clinicId: string,
  clinicName: string,
): Promise<void> {
  await prisma.coverageEntry.updateMany({
    where: { clinicId },
    data: { clinicName },
  });
}

export function countClinicUsage(
  plans: HealthPlan[],
  clinicId: string,
): number {
  return plans.reduce(
    (count, plan) =>
      count +
      plan.coverage.filter((entry) => entry.clinic_id === clinicId).length,
    0,
  );
}
