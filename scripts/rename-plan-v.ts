import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const oldCode = 'V';
  const newCode = 'BCNF260544';

  const plan = await prisma.plan.findUnique({
    where: { uniqueCode: oldCode },
    include: { coverages: true }
  });

  if (!plan) {
    console.log('Plan no encontrado');
    return;
  }

  console.log(`Plan encontrado. Cambiando ${oldCode} a ${newCode}...`);

  // Ejecutar en una transacción
  await prisma.$transaction(async (tx) => {
    // 1. Crear el nuevo plan con los mismos datos
    const newPlan = await tx.plan.create({
      data: {
        uniqueCode: newCode,
        isapreId: plan.isapreId,
        planName: 'Banmédica BCNF260544',
        basePriceUf: plan.basePriceUf,
        hasTop: plan.hasTop,
        additionalNotes: plan.additionalNotes,
        pdfUrl: plan.pdfUrl,
        pdfPublicId: plan.pdfPublicId,
        zones: plan.zones,
      }
    });
    console.log('Nuevo plan creado.');

    // 2. Mover las coberturas
    if (plan.coverages.length > 0) {
      await tx.coverageEntry.updateMany({
        where: { planCode: oldCode },
        data: { planCode: newCode }
      });
      console.log(`Movidas ${plan.coverages.length} coberturas.`);
    }

    // 3. Mover cotizaciones (quotes)
    await tx.quote.updateMany({
      where: { planCode: oldCode },
      data: { planCode: newCode }
    });
    console.log('Cotizaciones movidas.');

    // 4. Mover usuarios (advisedPlans)
    await tx.user.updateMany({
      where: { advisedPlanCode: oldCode },
      data: { advisedPlanCode: newCode }
    });
    console.log('Usuarios movidos.');

    // 5. Mover reviews
    await tx.planReview.updateMany({
      where: { planCode: oldCode },
      data: { planCode: newCode }
    });
    console.log('Reviews movidas.');

    // 6. Eliminar plan antiguo
    await tx.plan.delete({
      where: { uniqueCode: oldCode }
    });
    console.log('Plan antiguo eliminado.');
  });

  console.log('¡Actualización completada exitosamente!');
}

main()
  .catch(e => { console.error('Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
