/**
 * Script para eliminar planes específicos de Consalud de la base de datos.
 * Uso: npx tsx scripts/delete-consalud-plans.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLAN_CODES_TO_DELETE = [
  '13-SF1001-26',
  '13-SF2001-26',
  '13-SF3001-26',
  '13-SF4001-26',
  '13-SF5001-26',
];

async function main() {
  console.log('🔍 Verificando planes antes de eliminar...\n');

  // Primero verificar que los planes existen
  const existingPlans = await prisma.plan.findMany({
    where: { uniqueCode: { in: PLAN_CODES_TO_DELETE } },
    select: { uniqueCode: true, planName: true, basePriceUf: true, isapreId: true },
  });

  if (existingPlans.length === 0) {
    console.log('⚠️  No se encontró ninguno de los planes especificados en la BD.');
    return;
  }

  console.log(`✔ Planes encontrados (${existingPlans.length}/${PLAN_CODES_TO_DELETE.length}):`);
  existingPlans.forEach(p => {
    console.log(`   • [${p.isapreId}] ${p.uniqueCode} — ${p.planName} (${p.basePriceUf} UF)`);
  });

  const notFound = PLAN_CODES_TO_DELETE.filter(
    code => !existingPlans.find(p => p.uniqueCode === code)
  );
  if (notFound.length > 0) {
    console.log(`\n⚠️  Planes NO encontrados en BD: ${notFound.join(', ')}`);
  }

  console.log('\n🗑️  Eliminando planes...');

  const result = await prisma.plan.deleteMany({
    where: { uniqueCode: { in: PLAN_CODES_TO_DELETE } },
  });

  console.log(`\n✅ Eliminados ${result.count} planes correctamente.`);
}

main()
  .catch(e => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
