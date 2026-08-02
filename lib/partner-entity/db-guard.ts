import { Prisma } from "@prisma/client";

/** Evita consultas repetidas cuando la tabla aún no existe (migración pendiente). */
let partnerEntityDbUnavailable = false;
/** Evita reintentos inmediatos tras fallos de conexión o cuota agotada. */
let partnerEntityDbCooldownUntil = 0;

const DB_COOLDOWN_MS = 60_000;

export function isPartnerEntityDbUnavailable(): boolean {
  if (partnerEntityDbUnavailable) return true;
  if (partnerEntityDbCooldownUntil > Date.now()) return true;
  return false;
}

export function markPartnerEntityDbUnavailable(): void {
  partnerEntityDbUnavailable = true;
}

export function markPartnerEntityDbCooldown(): void {
  partnerEntityDbCooldownUntil = Date.now() + DB_COOLDOWN_MS;
}

export function isPartnerEntitySchemaError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2021" || error.code === "P2022";
  }

  if (!error || typeof error !== "object") return false;

  const code = (error as { code?: string }).code;
  return code === "P2021" || code === "P2022";
}

export function isDatabaseConnectivityError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return (
    message.includes("Can't reach database server") ||
    message.includes("data transfer quota") ||
    message.includes("Error querying the database") ||
    message.includes("Connection terminated") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT")
  );
}

export function logPartnerEntitySchemaWarning(): void {
  if (process.env.NODE_ENV === "test") return;

  console.warn(
    "[partner_entities] Tabla no encontrada en la base de datos. " +
      "Usando entidades embebidas. Ejecuta: npm run db:migrate && npm run db:seed",
  );
}
