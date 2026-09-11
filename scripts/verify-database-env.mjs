import { PrismaClient } from "@prisma/client";
import {
  applyResolvedDatabaseEnv,
  assertSafeForDestructiveCommand,
  hostnameOfDatabaseUrl,
  isSameDatabase,
  resolveDatabaseTargets,
} from "../lib/db/resolve-database-env.mjs";
import { loadLocalEnvFiles } from "./load-local-env.mjs";

loadLocalEnvFiles();

const original = {
  APP_ENV: process.env.APP_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  NODE_ENV: process.env.NODE_ENV,
  CONFIRM_PRODUCTION_DB: process.env.CONFIRM_PRODUCTION_DB,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function setEnv(key, value) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function ping(url, label) {
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: ["error"],
  });

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`[ok] ${label} responde (host=${hostnameOfDatabaseUrl(url)})`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const devPooled = process.env.DATABASE_URL_DEV?.trim();
  const prodPooled = process.env.DATABASE_URL_PROD?.trim();

  assert(devPooled, "Falta DATABASE_URL_DEV en .env.local");
  assert(prodPooled, "Falta DATABASE_URL_PROD en .env.local");
  assert(
    !isSameDatabase(devPooled, prodPooled),
    "DEV y PROD no pueden compartir el mismo host de Neon.",
  );

  setEnv("APP_ENV", undefined);
  setEnv("VERCEL_ENV", undefined);
  setEnv("CONFIRM_PRODUCTION_DB", undefined);
  setEnv("NODE_ENV", "production");
  setEnv("DATABASE_URL", prodPooled);

  const localTargets = resolveDatabaseTargets();
  assert(!localTargets.useProd, "NODE_ENV=production no debe activar PROD");
  assert(
    isSameDatabase(localTargets.pooled, devPooled),
    "Desarrollo debe resolver a DATABASE_URL_DEV aunque DATABASE_URL apunte a PROD.",
  );

  const localResolved = applyResolvedDatabaseEnv({ purpose: "runtime" });
  assert(
    isSameDatabase(process.env.DATABASE_URL, devPooled),
    "applyResolvedDatabaseEnv en local no dejó DATABASE_URL en DEV.",
  );
  await ping(localResolved.pooled, "Neon DEV (runtime local)");

  assertSafeForDestructiveCommand();
  console.log("[ok] comando destructivo local permitido solo contra DEV");

  restoreEnv();
  setEnv("APP_ENV", "production");
  setEnv("VERCEL_ENV", undefined);
  setEnv("CONFIRM_PRODUCTION_DB", undefined);
  setEnv("DATABASE_URL", devPooled);

  let blocked = false;
  try {
    assertSafeForDestructiveCommand();
  } catch {
    blocked = true;
  }
  assert(
    blocked,
    "Un seed/push/migrate dev no debe poder ejecutarse contra PROD sin CONFIRM_PRODUCTION_DB=1.",
  );
  console.log("[ok] escritura experimental bloqueada contra PROD");

  restoreEnv();
  setEnv("APP_ENV", undefined);
  setEnv("VERCEL_ENV", "production");
  setEnv("CONFIRM_PRODUCTION_DB", undefined);

  const prodTargets = resolveDatabaseTargets();
  assert(prodTargets.useProd, "VERCEL_ENV=production debe activar PROD");
  assert(
    isSameDatabase(prodTargets.pooled, prodPooled),
    "Producción debe resolver a DATABASE_URL_PROD.",
  );

  const prodResolved = applyResolvedDatabaseEnv({ purpose: "runtime" });
  assert(
    isSameDatabase(process.env.DATABASE_URL, prodPooled),
    "applyResolvedDatabaseEnv en production no dejó DATABASE_URL en PROD.",
  );
  await ping(prodResolved.pooled, "Neon PROD (solo lectura)");

  restoreEnv();
  applyResolvedDatabaseEnv({ purpose: "runtime" });
  console.log("[ok] separación DEV/PROD verificada");
}

main().catch((error) => {
  restoreEnv();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
