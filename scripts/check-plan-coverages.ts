import { config } from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";

config({ path: path.join(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

async function main() {
  const [total, withCoverage, withoutCoverage] = await Promise.all([
    prisma.plan.count(),
    prisma.plan.count({ where: { coverages: { some: {} } } }),
    prisma.plan.count({ where: { coverages: { none: {} } } }),
  ]);

  const samples = await prisma.plan.findMany({
    where: {
      uniqueCode: { in: ["13-SFN10-26", "13-SFC10-26", "13-SFC60-26"] },
    },
    include: {
      coverages: { take: 3 },
      _count: { select: { coverages: true } },
    },
  });

  console.log(JSON.stringify({ total, withCoverage, withoutCoverage, samples }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
