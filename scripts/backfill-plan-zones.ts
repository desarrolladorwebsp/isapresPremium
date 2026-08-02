import path from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { resolveClinicZoneIds } from "../lib/clinic-zones";
import { resolvePlanZoneIds } from "../lib/plan-zones";

config({ path: path.join(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

async function backfillClinicZones() {
  const clinics = await prisma.clinic.findMany({ select: { id: true, name: true } });
  let updated = 0;

  for (const clinic of clinics) {
    const zones = resolveClinicZoneIds(clinic.id, clinic.name);
    await prisma.clinic.update({
      where: { id: clinic.id },
      data: { zones },
    });
    updated += 1;
  }

  return updated;
}

async function backfillPlanZones() {
  const plans = await prisma.plan.findMany({
    include: { coverages: true },
  });

  let updated = 0;

  for (const plan of plans) {
    const zones = resolvePlanZoneIds({
      zones: plan.zones,
      coverage: plan.coverages.map((entry) => ({
        clinic_id: entry.clinicId,
        clinic_name: entry.clinicName,
        percentage: entry.percentage,
        type: entry.type as "hospitalaria" | "ambulatoria",
      })),
    });

    await prisma.plan.update({
      where: { uniqueCode: plan.uniqueCode },
      data: { zones },
    });
    updated += 1;
  }

  return updated;
}

async function main() {
  const clinics = await backfillClinicZones();
  const plans = await backfillPlanZones();

  const withoutZones = await prisma.plan.count({
    where: { zones: { equals: [] } },
  });

  console.log(`Clínicas actualizadas: ${clinics}`);
  console.log(`Planes actualizados: ${plans}`);
  console.log(`Planes sin zona resuelta: ${withoutZones}`);
}

main()
  .catch((error) => {
    console.error("Error en backfill de zonas:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
