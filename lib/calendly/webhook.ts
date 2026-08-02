import { createHmac, timingSafeEqual } from "node:crypto";
import {
  getCalendlyTeamConfig,
  isCalendlyTeamId,
  listCalendlyTeams,
  shouldSkipCalendlyWebhookVerify,
  type CalendlyTeamId,
} from "@/lib/calendly/config";
import { ApiError } from "@/lib/api/api-error";

const MAX_SKEW_SECONDS = 300;

export function extractUuidFromUri(uri: string | null | undefined): string | null {
  if (!uri?.trim()) return null;
  const parts = uri.trim().split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  return last || null;
}

/**
 * Verifica `Calendly-Webhook-Signature: t=...,v1=...`
 * HMAC-SHA256 hex de `${t}.${rawBody}` con la signing key del equipo.
 */
export function verifyCalendlyWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
  signingKey: string;
}): void {
  const header = input.signatureHeader?.trim();
  if (!header) {
    throw new ApiError("Falta firma Calendly.", 401, "MISSING_SIGNATURE");
  }

  const parts = Object.fromEntries(
    header.split(",").map((chunk) => {
      const [key, ...rest] = chunk.trim().split("=");
      return [key, rest.join("=")];
    }),
  );

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) {
    throw new ApiError("Firma Calendly malformada.", 401, "INVALID_SIGNATURE");
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    throw new ApiError("Timestamp de firma inválido.", 401, "INVALID_SIGNATURE");
  }

  const skew = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (skew > MAX_SKEW_SECONDS) {
    throw new ApiError("Firma Calendly expirada.", 401, "STALE_SIGNATURE");
  }

  const expected = createHmac("sha256", input.signingKey)
    .update(`${timestamp}.${input.rawBody}`, "utf8")
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ApiError("Firma Calendly inválida.", 401, "INVALID_SIGNATURE");
  }
}

export function resolveWebhookTeamId(
  requestUrl: string,
  payload: { created_by?: string | null; payload?: { event?: string } },
): CalendlyTeamId {
  const teamParam = new URL(requestUrl).searchParams.get("team")?.trim();
  if (teamParam) {
    if (!isCalendlyTeamId(teamParam)) {
      throw new ApiError(
        `Equipo Calendly inválido: ${teamParam}`,
        400,
        "INVALID_TEAM",
      );
    }
    return teamParam;
  }

  const createdBy = payload.created_by?.trim();
  if (createdBy) {
    const match = listCalendlyTeams().find(
      (team) => team.userUri && team.userUri === createdBy,
    );
    if (match) return match.teamId;
  }

  throw new ApiError(
    "Indica ?team=EQUIPO_1|EQUIPO_2|EQUIPO_3 en la URL del webhook.",
    400,
    "MISSING_TEAM",
  );
}

/**
 * Exige firma válida salvo bypass explícito de desarrollo.
 * En producción el bypass nunca aplica aunque exista el flag.
 */
export function assertCalendlyWebhookAuthenticated(input: {
  teamId: CalendlyTeamId;
  rawBody: string;
  signatureHeader: string | null;
}): void {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd && shouldSkipCalendlyWebhookVerify()) {
    return;
  }

  const config = getCalendlyTeamConfig(input.teamId);
  const signingKey = config.webhookSigningKey;
  if (!signingKey) {
    throw new ApiError(
      `Falta signing key para ${input.teamId} (CALENDLY_${input.teamId}_WEBHOOK_SIGNING_KEY o CALENDLY_WEBHOOK_SIGNING_KEY).`,
      503,
      "MISSING_SIGNING_KEY",
    );
  }

  verifyCalendlyWebhookSignature({
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
    signingKey,
  });
}
