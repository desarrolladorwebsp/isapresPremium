import { NextResponse } from "next/server";
import {
  collectTrustedPublicOrigins,
  normalizePublicOrigin,
} from "@/lib/security/trusted-public-origins";
import { checkRateLimit, readClientIp } from "@/lib/security/rate-limit";

const MAX_PUBLIC_POST_BYTES = 48_000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const PUBLIC_POST_PROFILES = {
  quote: { limit: 15, label: "cotizaciones" },
  "cotizacion-notify": { limit: 20, label: "notificaciones" },
  "company-agreement": { limit: 10, label: "consultas de convenio" },
} as const;

export type PublicPostProfile = keyof typeof PUBLIC_POST_PROFILES;

function readRequestOrigin(request: Request): string | null {
  const origin = request.headers.get("origin")?.trim();
  if (origin) return normalizePublicOrigin(origin);

  const referer = request.headers.get("referer")?.trim();
  if (!referer) return null;

  return normalizePublicOrigin(referer);
}

function isAllowedOrigin(request: Request): boolean {
  const origin = readRequestOrigin(request);
  if (!origin) return true;
  return collectTrustedPublicOrigins().has(origin);
}

function readContentLength(request: Request): number | null {
  const raw = request.headers.get("content-length")?.trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function enforcePublicPostGuard(
  request: Request,
  profile: PublicPostProfile,
): Response | null {
  const contentLength = readContentLength(request);
  if (contentLength !== null && contentLength > MAX_PUBLIC_POST_BYTES) {
    return NextResponse.json(
      { error: "La solicitud supera el tamaño permitido." },
      { status: 413 },
    );
  }

  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { error: "Origen no autorizado para esta operación." },
      { status: 403 },
    );
  }

  const ip = readClientIp(request);
  const { limit, label } = PUBLIC_POST_PROFILES[profile];
  const rate = checkRateLimit(`${profile}:${ip}`, {
    limit,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Demasiadas ${label}. Intenta nuevamente en unos minutos.`,
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      {
        status: 429,
        headers: rate.retryAfterSeconds
          ? { "Retry-After": String(rate.retryAfterSeconds) }
          : undefined,
      },
    );
  }

  return null;
}
