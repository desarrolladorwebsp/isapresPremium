import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import {
  PUBLIC_API_KEY_HEADER,
} from "@/lib/public-api/constants";
import { withPublicApiCors } from "@/lib/public-api/cors";
import { checkRateLimit, readClientIp } from "@/lib/security/rate-limit";

const MAX_WRITE_BODY_BYTES = 16_000;
const RATE_WINDOW_MS = 15 * 60 * 1000;

const WRITE_PROFILES = {
  clients: {
    perIp: 30,
    perKey: 120,
    label: "registros de clientes",
  },
} as const;

export type PublicApiWriteProfile = keyof typeof WRITE_PROFILES;

function readContentLength(request: Request): number | null {
  const raw = request.headers.get("content-length")?.trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractApiKeyFingerprint(request: Request): string {
  const authorization = request.headers.get("authorization")?.trim();
  let secret = "";

  if (authorization?.toLowerCase().startsWith("bearer ")) {
    secret = authorization.slice(7).trim();
  } else {
    secret = request.headers.get(PUBLIC_API_KEY_HEADER)?.trim() ?? "";
  }

  if (!secret) return "missing";

  return createHash("sha256").update(secret).digest("hex").slice(0, 16);
}

function assertJsonContentType(request: Request): void {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      "Content-Type debe ser application/json.",
      415,
      "UNSUPPORTED_MEDIA_TYPE",
    );
  }
}

/**
 * Protecciones para POST de la API pública autenticada:
 * tamaño, Content-Type y rate limit por IP + huella de API key.
 * No altera GET existentes.
 */
export function enforcePublicApiWriteGuard(
  request: Request,
  profile: PublicApiWriteProfile,
): Response | null {
  const contentLength = readContentLength(request);
  if (contentLength !== null && contentLength > MAX_WRITE_BODY_BYTES) {
    const response = NextResponse.json(
      {
        error: "La solicitud supera el tamaño permitido.",
        code: "PAYLOAD_TOO_LARGE",
      },
      { status: 413 },
    );
    return withPublicApiCors(response, request);
  }

  try {
    assertJsonContentType(request);
  } catch (error) {
    if (error instanceof ApiError) {
      const response = NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
      return withPublicApiCors(response, request);
    }
    throw error;
  }

  const { perIp, perKey, label } = WRITE_PROFILES[profile];
  const ip = readClientIp(request);
  const keyFp = extractApiKeyFingerprint(request);

  const ipLimit = checkRateLimit(`public-api:${profile}:ip:${ip}`, {
    limit: perIp,
    windowMs: RATE_WINDOW_MS,
  });
  if (!ipLimit.allowed) {
    const response = NextResponse.json(
      {
        error: `Demasiadas ${label}. Intenta nuevamente en unos minutos.`,
        code: "RATE_LIMITED",
        retryAfterSeconds: ipLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: ipLimit.retryAfterSeconds
          ? { "Retry-After": String(ipLimit.retryAfterSeconds) }
          : undefined,
      },
    );
    return withPublicApiCors(response, request);
  }

  const keyLimit = checkRateLimit(`public-api:${profile}:key:${keyFp}`, {
    limit: perKey,
    windowMs: RATE_WINDOW_MS,
  });
  if (!keyLimit.allowed) {
    const response = NextResponse.json(
      {
        error: `Demasiadas ${label} con esta clave de API.`,
        code: "RATE_LIMITED",
        retryAfterSeconds: keyLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: keyLimit.retryAfterSeconds
          ? { "Retry-After": String(keyLimit.retryAfterSeconds) }
          : undefined,
      },
    );
    return withPublicApiCors(response, request);
  }

  return null;
}

/** Rate limit por email para evitar spam de upserts sobre un mismo lead. */
export function enforceLeadEmailRateLimit(email: string): void {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  const result = checkRateLimit(`lead-register:email:${normalized}`, {
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });

  if (!result.allowed) {
    throw new ApiError(
      "Demasiados intentos con este correo. Intenta más tarde.",
      429,
      "EMAIL_RATE_LIMITED",
    );
  }
}
