import path from "path";
import { execSync } from "node:child_process";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { hashPassword, normalizeEmail } from "../lib/auth/password";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();

function ensureMigrationsApplied() {
  try {
    execSync("npx prisma migrate deploy", {
      cwd: process.cwd(),
      env: process.env,
      stdio: "pipe",
    });
  } catch {
    console.warn(
      "No se aplicaron migraciones automáticamente. Si falla el upsert, ejecuta: npm run db:migrate:deploy",
    );
  }
}

async function upsertAdminAccount(
  email: string,
  password: string,
  fullName: string,
) {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(password);

  await prisma.staffAccount.upsert({
    where: { email: normalizedEmail },
    create: {
      email: normalizedEmail,
      fullName,
      role: "ADMIN",
      passwordHash,
      active: true,
      mustChangePassword: false,
      onboardingCompleted: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      passwordChangedAt: new Date(),
    },
    update: {
      fullName,
      role: "ADMIN",
      passwordHash,
      active: true,
      mustChangePassword: false,
      onboardingCompleted: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      passwordChangedAt: new Date(),
    },
  });

  console.log(`Administrador listo: ${normalizedEmail}`);
  console.log("Login: /cotizador/acceso");
}

async function main() {
  ensureMigrationsApplied();

  const emailArg = process.argv[2];
  const password =
    process.argv[3]?.trim() ||
    process.env.SEED_ACCOUNT_PASSWORD?.trim() ||
    "ChangeMe123!";
  const fullName = process.argv[4]?.trim() || "Administrador";

  if (!emailArg) {
    console.error(
      "Uso: npx tsx scripts/upsert-admin-account.ts <email> [contraseña] [nombre]",
    );
    process.exit(1);
  }

  await upsertAdminAccount(emailArg, password, fullName);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
