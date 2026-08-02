import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Buscar el código exacto BCNF260544
  const exact = await prisma.plan.findUnique({
    where: { uniqueCode: 'BCNF260544' },
    select: { uniqueCode: true, planName: true, isapreId: true, basePriceUf: true },
  });
  console.log('\n1. Búsqueda exacta "BCNF260544":', exact ?? 'NO ENCONTRADO');

  // Buscar planes cuyo uniqueCode sea solo "v" o contenga "v" minúscula
  const withLowV = await prisma.plan.findMany({
    where: { uniqueCode: { contains: 'v' } },
    select: { uniqueCode: true, planName: true, isapreId: true, basePriceUf: true },
    take: 20,
  });
  console.log(`\n2. Planes con "v" minúscula en código (${withLowV.length}):`, withLowV);

  // Buscar planes que empiecen con BCN
  const bcnPlans = await prisma.plan.findMany({
    where: { uniqueCode: { startsWith: 'BCN' } },
    select: { uniqueCode: true, planName: true, isapreId: true, basePriceUf: true },
    orderBy: { uniqueCode: 'asc' },
    take: 20,
  });
  console.log(`\n3. Planes con código BCN* (${bcnPlans.length}):`, bcnPlans);

  // Buscar por nombre de plan que contenga 260544
  const byName = await prisma.plan.findMany({
    where: { planName: { contains: '260544', mode: 'insensitive' } },
    select: { uniqueCode: true, planName: true, isapreId: true, basePriceUf: true },
    take: 10,
  });
  console.log(`\n4. Planes con "260544" en nombre (${byName.length}):`, byName);
}

main()
  .catch(e => { console.error('Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
