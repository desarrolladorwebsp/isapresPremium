import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();

  try {
    const [planCount, clinicCount, isapreCount] = await Promise.all([
      prisma.plan.count(),
      prisma.clinic.count(),
      prisma.isapre.count(),
    ]);

    const sample = await prisma.plan.findFirst({
      include: { coverages: true, isapreRef: true },
    });

    console.log("Conexión OK");
    console.log(`Planes: ${planCount}, Clínicas: ${clinicCount}, Isapres: ${isapreCount}`);
    if (sample) {
      console.log(
        `Ejemplo: ${sample.planName} (${sample.isapreRef.name}) — ${sample.coverages.length} coberturas`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Error de conexión:", error);
  process.exit(1);
});
