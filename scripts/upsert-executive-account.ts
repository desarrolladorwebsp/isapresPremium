import path from "path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { hashPassword, normalizeEmail } from "../lib/auth/password";

config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function upsertExecutiveAccount(
  email: string,
  password: string,
  fullName: string,
) {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(password);

  const trialExpiresAt = new Date();
  trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);

  await prisma.staffAccount.upsert({
    where: { email: normalizedEmail },
    create: {
      email: normalizedEmail,
      fullName,
      role: "EXECUTIVE",
      executiveKind: "ISAPRES_PREMIUM",
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
      executiveKind: "ISAPRES_PREMIUM",
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
  console.log("Login: /cotizador/acceso");
}

async function main() {
  const emailArg = process.argv[2];
  const password = process.argv[3]?.trim();
  const fullName = process.argv[4]?.trim() || "Ejecutivo";

  if (!emailArg || !password) {
    console.error(
      "Uso: npx tsx scripts/upsert-executive-account.ts <email> <contraseña> [nombre]",
    );
    process.exit(1);
  }

  await upsertExecutiveAccount(emailArg, password, fullName);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
