import path from "path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: path.join(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

async function main() {
  const masvida = await prisma.plan.count({ where: { isapreId: "nueva-masvida" } });
  const total = await prisma.plan.count();
  console.log(`Masvida plans: ${masvida} / Total: ${total}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
