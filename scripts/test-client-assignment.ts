/**
 * Verifica asignación automática round-robin 1×1 de clientes a ejecutivos.
 * Uso: npx tsx scripts/test-client-assignment.ts
 */
import path from "path";
import { config } from "dotenv";
import { prisma } from "../lib/prisma";
import {
  autoAssignClientExecutive,
  distributeUnassignedClients,
  pickExecutiveRoundRobin,
} from "../lib/api/lead-assignment";
import { assignUserToExecutive } from "../lib/api/user-store";
import { createQuote } from "../lib/api/quote-store";

config({ path: path.join(process.cwd(), ".env.local") });

const TEST_PREFIX = "test-assign-";

async function ensureExecutives() {
  const passwordHash = "$2a$12$testhashplaceholder";
  const executives = [
    { email: `${TEST_PREFIX}exec1@test.cl`, fullName: "Test Ejecutivo 1" },
    { email: `${TEST_PREFIX}exec2@test.cl`, fullName: "Test Ejecutivo 2" },
  ];

  for (const exec of executives) {
    await prisma.staffAccount.upsert({
      where: { email: exec.email },
      create: {
        email: exec.email,
        fullName: exec.fullName,
        role: "EXECUTIVE",
        passwordHash,
        active: true,
        onboardingCompleted: true,
        subscriptionStatus: "ACTIVE",
      },
      update: {
        active: true,
        onboardingCompleted: true,
        assignmentsSuspended: false,
        subscriptionStatus: "ACTIVE",
      },
    });
  }
}

async function cleanup() {
  await prisma.quote.deleteMany({
    where: { email: { startsWith: TEST_PREFIX } },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: TEST_PREFIX } },
  });
  await prisma.staffAccount.deleteMany({
    where: { email: { startsWith: TEST_PREFIX } },
  });
}

async function main() {
  await cleanup();
  await ensureExecutives();

  const execs = await prisma.staffAccount.findMany({
    where: { email: { startsWith: TEST_PREFIX } },
    orderBy: { email: "asc" },
  });

  if (execs.length < 2) {
    throw new Error("Se requieren al menos 2 ejecutivos de prueba.");
  }

  console.log("Ejecutivos de prueba:", execs.map((e) => e.fullName).join(", "));

  const clientA = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}client-a@test.cl`,
      fullName: "Cliente A",
      role: "CLIENT",
      active: true,
    },
  });

  const clientB = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}client-b@test.cl`,
      fullName: "Cliente B",
      role: "CLIENT",
      active: true,
    },
  });

  const clientC = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}client-c@test.cl`,
      fullName: "Cliente C",
      role: "CLIENT",
      active: true,
    },
  });

  const assignA = await autoAssignClientExecutive(clientA.id);
  const assignB = await autoAssignClientExecutive(clientB.id);
  const assignC = await autoAssignClientExecutive(clientC.id);

  if (!assignA || !assignB || !assignC) {
    throw new Error("La asignación automática devolvió null.");
  }

  if (assignA === assignB) {
    throw new Error("Round-robin falló: A y B recibieron el mismo ejecutivo.");
  }

  const counts = await prisma.user.groupBy({
    by: ["assignedExecutiveId"],
    where: {
      email: { startsWith: TEST_PREFIX },
      assignedExecutiveId: { not: null },
    },
    _count: { id: true },
  });

  console.log("Distribución 1×1:", counts);

  const picked = await pickExecutiveRoundRobin();
  if (!picked) throw new Error("pickExecutiveRoundRobin devolvió null con ejecutivos activos.");
  console.log("Siguiente ejecutivo (menor carga):", picked);

  const quote = await createQuote({
    email: `${TEST_PREFIX}widget@test.cl`,
    fullName: "Cliente Widget",
    phone: "+56912345678",
    planCode: null,
    dependentsCount: 0,
  });

  if (quote.executiveAccountId) {
    throw new Error("createQuote no debe asignar ejecutivo automáticamente.");
  }

  const widgetClient = await prisma.user.findUnique({
    where: { email: `${TEST_PREFIX}widget@test.cl` },
  });

  if (widgetClient?.assignedExecutiveId) {
    throw new Error("createQuote no debe asignar ejecutivo al cliente automáticamente.");
  }

  console.log("createQuote sin asignación automática: OK");

  const unassigned = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}manual@test.cl`,
      fullName: "Cliente Manual",
      role: "CLIENT",
      active: true,
    },
  });

  const manual = await assignUserToExecutive(unassigned.id, execs[0].id);
  if (manual.assignedExecutiveId !== execs[0].id) {
    throw new Error("Asignación manual falló.");
  }
  console.log("Asignación manual OK:", manual.assignedExecutiveName);

  const batch = await distributeUnassignedClients();
  console.log("Distribución en lote:", batch);

  await cleanup();
  console.log("\n✓ Todas las pruebas de asignación pasaron.");
}

main()
  .catch((error) => {
    console.error("\n✗ Prueba fallida:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
