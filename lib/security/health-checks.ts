import { list } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import {
  getBlobClientConfig,
  resolvePlanPdfStorageBackend,
  useVercelBlobStorage,
} from "@/lib/plan-pdf-storage/provider";

export type HealthCheckResult = {
  ok: boolean;
  optional?: boolean;
  detail?: string;
};

export type HealthReport = {
  ok: boolean;
  service: string;
  checks: {
    database: HealthCheckResult;
    auth: HealthCheckResult;
    email: HealthCheckResult;
    pdfStorage: HealthCheckResult & {
      backend: string;
      blobConfigured: boolean;
      blobReachable: boolean;
      blobObjectsSample: number;
    };
  };
  timestamp: string;
};

function readAuthHealth(): HealthCheckResult {
  const secret = process.env.AUTH_SECRET?.trim() ?? "";

  if (secret.length >= 32) {
    return { ok: true };
  }

  if (process.env.NODE_ENV !== "production") {
    return {
      ok: true,
      optional: true,
      detail: "AUTH_SECRET de desarrollo en uso.",
    };
  }

  return {
    ok: false,
    detail: "AUTH_SECRET ausente o demasiado corto.",
  };
}

function readEmailHealth(): HealthCheckResult {
  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasNotifyTarget = Boolean(
    process.env.COTIZACION_NOTIFY_EMAIL?.trim() ||
      process.env.EQUIPO_NOTIFY_EMAIL?.trim(),
  );

  if (hasResend && hasNotifyTarget) {
    return { ok: true };
  }

  if (process.env.NODE_ENV !== "production") {
    return {
      ok: true,
      optional: true,
      detail: "Correos no configurados (aceptable en desarrollo).",
    };
  }

  return {
    ok: false,
    optional: true,
    detail: "Resend o buzón de alertas no configurado.",
  };
}

async function readDatabaseHealth(): Promise<HealthCheckResult> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      detail:
        error instanceof Error ? error.message : "No se pudo consultar la BD.",
    };
  }
}

async function readPdfStorageHealth(): Promise<
  HealthReport["checks"]["pdfStorage"]
> {
  const backend = resolvePlanPdfStorageBackend();
  const blobConfigured = Boolean(getBlobClientConfig());

  let blobSampleCount = 0;
  if (useVercelBlobStorage()) {
    try {
      const result = await list({
        limit: 1,
        prefix: "consalud/",
        ...getBlobClientConfig(),
      });
      blobSampleCount = result.blobs.length;
    } catch {
      blobSampleCount = -1;
    }
  }

  const blobReachable = !useVercelBlobStorage() || blobSampleCount >= 0;
  const ok =
    backend === "local" ? true : blobConfigured && blobReachable;

  return {
    ok,
    optional: backend === "local",
    backend,
    blobConfigured,
    blobReachable,
    blobObjectsSample: blobSampleCount,
    detail:
      backend === "local"
        ? "PDFs en disco local."
        : blobReachable
          ? undefined
          : "Blob no accesible.",
  };
}

export async function buildHealthReport(): Promise<HealthReport> {
  const [database, pdfStorage] = await Promise.all([
    readDatabaseHealth(),
    readPdfStorageHealth(),
  ]);

  const auth = readAuthHealth();
  const email = readEmailHealth();

  const criticalOk = database.ok && auth.ok;
  const optionalChecksOk = email.ok && pdfStorage.ok;

  return {
    ok: criticalOk && optionalChecksOk,
    service: "cotizador-premium",
    checks: {
      database,
      auth,
      email,
      pdfStorage,
    },
    timestamp: new Date().toISOString(),
  };
}

export function resolveHealthStatus(report: HealthReport): number {
  if (!report.checks.database.ok || !report.checks.auth.ok) {
    return 503;
  }

  if (!report.ok) {
    return 200;
  }

  return 200;
}
