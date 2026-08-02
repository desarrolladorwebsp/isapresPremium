/**
 * Elimina clientes y cotizaciones de prueba, conservando un correo específico.
 *
 * Uso:
 *   npx tsx scripts/purge-test-clients-quotes.ts
 *   npx tsx scripts/purge-test-clients-quotes.ts --email=otro@correo.cl
 */
import path from "path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();

function readKeepEmail(): string {
  const fromArg = process.argv
    .find((arg) => arg.startsWith("--email="))
    ?.split("=")
    .slice(1)
    .join("=")
    .trim();
  const value = (fromArg || process.env.KEEP_CLIENT_EMAIL || "soyalfredo.dev@gmail.com")
    .trim()
    .toLowerCase();
  if (!value.includes("@")) {
    throw new Error("Correo inválido para conservar.");
  }
  return value;
}

async function main() {
  const keepEmail = readKeepEmail();
  const keepUser = await prisma.user.findFirst({
    where: { email: keepEmail, role: "CLIENT" },
    select: { id: true, email: true },
  });

  const keepQuoteFilter = {
    OR: [
      { email: keepEmail },
      ...(keepUser ? [{ userId: keepUser.id }] : []),
    ],
  };

  const before = {
    quotes: await prisma.quote.count(),
    quoteActivities: await prisma.quoteActivity.count(),
    clients: await prisma.user.count({ where: { role: "CLIENT" } }),
    clientActivities: await prisma.clientActivity.count(),
    quotesToKeep: await prisma.quote.count({ where: keepQuoteFilter }),
    clientsToKeep: keepUser ? 1 : 0,
  };

  console.log(`Conservando datos de: ${keepEmail}`);
  console.log("Antes:", before);

  if (
    before.quotes === before.quotesToKeep &&
    before.clients === before.clientsToKeep
  ) {
    console.log("No hay registros de prueba que eliminar.");
    return;
  }

  const deletedQuoteActivities = await prisma.quoteActivity.deleteMany({
    where: { quote: { NOT: keepQuoteFilter } },
  });

  const deletedQuotes = await prisma.quote.deleteMany({
    where: { NOT: keepQuoteFilter },
  });

  const deletedClientActivities = await prisma.clientActivity.deleteMany({
    where: {
      user: {
        role: "CLIENT",
        email: { not: keepEmail },
      },
    },
  });

  const deletedClients = await prisma.user.deleteMany({
    where: {
      role: "CLIENT",
      email: { not: keepEmail },
    },
  });

  const after = {
    quotes: await prisma.quote.count(),
    quoteActivities: await prisma.quoteActivity.count(),
    clients: await prisma.user.count({ where: { role: "CLIENT" } }),
    clientActivities: await prisma.clientActivity.count(),
  };

  console.log("Eliminados:", {
    quoteActivities: deletedQuoteActivities.count,
    quotes: deletedQuotes.count,
    clientActivities: deletedClientActivities.count,
    clients: deletedClients.count,
  });
  console.log("Después:", after);
}

main()
  .catch((error) => {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
