/**
 * Única fuente de verdad para DATABASE_URL / DIRECT_URL.
 *
 * Producción Neon solo si el entorno es explícitamente production
 * (VERCEL_ENV=production o APP_ENV=production). NODE_ENV=production
 * no basta: `next build` local no debe apuntar a PROD.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEV_POOLED = "DATABASE_URL_DEV";
const DEV_DIRECT = "DIRECT_URL_DEV";
const PROD_POOLED = "DATABASE_URL_PROD";
const PROD_DIRECT = "DIRECT_URL_PROD";

function trimEnv(name) {
  return process.env[name]?.trim() || "";
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

/** Carga `.env` y `.env.local` sin pisar variables ya definidas en el proceso. */
export function loadLocalEnvFiles() {
  const root = process.cwd();
  loadEnvFile(resolve(root, ".env"));
  loadEnvFile(resolve(root, ".env.local"));
}

export function isExplicitProductionEnvironment() {
  const appEnv = trimEnv("APP_ENV").toLowerCase();
  if (appEnv === "production") return true;
  if (process.env.VERCEL_ENV === "production") return true;
  return false;
}

export function hostnameOfDatabaseUrl(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function isSameDatabase(urlA, urlB) {
  const hostA = hostnameOfDatabaseUrl(urlA);
  const hostB = hostnameOfDatabaseUrl(urlB);
  return Boolean(hostA && hostB && hostA === hostB);
}

function readTargets(useProd) {
  if (useProd) {
    const pooled = trimEnv(PROD_POOLED) || trimEnv("DATABASE_URL");
    const direct = trimEnv(PROD_DIRECT) || trimEnv("DIRECT_URL") || pooled;
    return { pooled, direct };
  }

  const prodPooled = trimEnv(PROD_POOLED);
  const prodDirect = trimEnv(PROD_DIRECT);
  const fallbackPooled = trimEnv("DATABASE_URL");
  const fallbackDirect = trimEnv("DIRECT_URL");
  const safeFallbackPooled =
    isSameDatabase(fallbackPooled, prodPooled) ||
    isSameDatabase(fallbackPooled, prodDirect)
      ? ""
      : fallbackPooled;
  const safeFallbackDirect =
    isSameDatabase(fallbackDirect, prodPooled) ||
    isSameDatabase(fallbackDirect, prodDirect)
      ? ""
      : fallbackDirect;

  const pooled = trimEnv(DEV_POOLED) || safeFallbackPooled;
  const direct = trimEnv(DEV_DIRECT) || safeFallbackDirect || pooled;
  return { pooled, direct };
}

export function resolveDatabaseTargets() {
  const useProd = isExplicitProductionEnvironment();
  const { pooled, direct } = readTargets(useProd);
  return { useProd, pooled, direct };
}

function assertResolvedIsNotAccidentalProd(pooled) {
  const prodPooled = trimEnv(PROD_POOLED);
  const prodDirect = trimEnv(PROD_DIRECT);
  if (
    isSameDatabase(pooled, prodPooled) ||
    isSameDatabase(pooled, prodDirect)
  ) {
    throw new Error(
      "[db] Rechazado: el destino resuelto coincide con la BD de producción fuera de un entorno production explícito.",
    );
  }
}

/**
 * @param {{ purpose?: "runtime" | "migrate" }} [options]
 */
export function applyResolvedDatabaseEnv(options = {}) {
  const purpose = options.purpose === "migrate" ? "migrate" : "runtime";
  const { useProd, pooled, direct } = resolveDatabaseTargets();

  if (!pooled) {
    return {
      applied: false,
      useProd,
      purpose,
      hostname: "",
      pooled: "",
      direct: "",
    };
  }

  if (!useProd) {
    assertResolvedIsNotAccidentalProd(pooled);
    assertResolvedIsNotAccidentalProd(direct);
  }

  process.env.DATABASE_URL = purpose === "migrate" ? direct : pooled;
  process.env.DIRECT_URL = direct || pooled;

  return {
    applied: true,
    useProd,
    purpose,
    hostname: hostnameOfDatabaseUrl(process.env.DATABASE_URL),
    pooled,
    direct,
  };
}

/**
 * Seed, db push, migrate dev, studio e imports: DEV por defecto.
 * Producción exige APP_ENV/VERCEL_ENV=production y CONFIRM_PRODUCTION_DB=1.
 */
export function assertSafeForDestructiveCommand() {
  const { useProd, pooled, direct } = resolveDatabaseTargets();

  if (useProd && trimEnv("CONFIRM_PRODUCTION_DB") !== "1") {
    throw new Error(
      "[db] Comando de escritura/experimental bloqueado contra producción. " +
        "Usa la BD DEV, o confirma con APP_ENV=production CONFIRM_PRODUCTION_DB=1.",
    );
  }

  if (!useProd) {
    assertResolvedIsNotAccidentalProd(pooled);
    assertResolvedIsNotAccidentalProd(direct);
  }
}

/** migrate deploy local exige confirmación; en Vercel production el deploy ya es explícito. */
export function assertSafeForProductionMigration() {
  const { useProd, pooled, direct } = resolveDatabaseTargets();

  if (!useProd) {
    assertResolvedIsNotAccidentalProd(pooled);
    assertResolvedIsNotAccidentalProd(direct);
    return;
  }

  if (
    process.env.VERCEL_ENV !== "production" &&
    trimEnv("CONFIRM_PRODUCTION_DB") !== "1"
  ) {
    throw new Error(
      "[db] migrate deploy contra producción requiere VERCEL_ENV=production " +
        "o APP_ENV=production CONFIRM_PRODUCTION_DB=1.",
    );
  }
}

export function describeResolvedDatabase(result) {
  const envLabel = result.useProd ? "production" : "development";
  const host = result.hostname || "(sin host)";
  return `[db] entorno=${envLabel} purpose=${result.purpose} host=${host}`;
}
