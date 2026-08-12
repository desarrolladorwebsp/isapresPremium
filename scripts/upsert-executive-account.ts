import path from "path";
import { config } from "dotenv";
import { PrismaClient, type ExecutiveKind } from "@prisma/client";
import { hashPassword, normalizeEmail } from "../lib/auth/password";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();

const VALID_KINDS: ExecutiveKind[] = [
  "ISAPRES",
  "ISAPRES_PREMIUM",
  "ZOOM",
  "MEMBRESIA_ISAPRES_PREMIUM",
];

function parseExecutiveKind(raw: string | undefined): ExecutiveKind {
  const value = (raw ?? "ISAPRES").trim().toUpperCase() as ExecutiveKind;
  if (!VALID_KINDS.includes(value)) {
    throw new Error(
      `executiveKind inválido: ${raw}. Usa: ${VALID_KINDS.join(" | ")}`,
    );
  }
  return value;
}

async function upsertExecutiveAccount(
  email: string,
  password: string,
  fullName: string,
  executiveKind: ExecutiveKind,
) {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(password);

  await prisma.staffAccount.upsert({
    where: { email: normalizedEmail },
    create: {
      email: normalizedEmail,
      fullName,
      role: "EXECUTIVE",
      executiveKind,
      passwordHash,
      active: true,
      mustChangePassword: false,
      onboardingCompleted: true,
      subscriptionStatus: "ACTIVE",
      subscriptionExpiresAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      passwordChangedAt: new Date(),
    },
    update: {
      fullName,
      role: "EXECUTIVE",
      executiveKind,
      passwordHash,
      active: true,
      mustChangePassword: false,
      onboardingCompleted: true,
      subscriptionStatus: "ACTIVE",
      subscriptionExpiresAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      passwordChangedAt: new Date(),
    },
  });

  console.log(`Ejecutivo listo: ${normalizedEmail}`);
  console.log(`Kind: ${executiveKind}`);
  console.log("Login: /cotizador/acceso");
}

async function main() {
  const emailArg = process.argv[2];
  const password = process.argv[3]?.trim();
  const fullName = process.argv[4]?.trim() || "Ejecutivo Isapres Prueba";
  const executiveKind = parseExecutiveKind(process.argv[5]);

  if (!emailArg || !password) {
    console.error(
      "Uso: npx tsx scripts/upsert-executive-account.ts <email> <contraseña> [nombre] [ISAPRES|ISAPRES_PREMIUM|ZOOM]",
    );
    process.exit(1);
  }

  await upsertExecutiveAccount(emailArg, password, fullName, executiveKind);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
