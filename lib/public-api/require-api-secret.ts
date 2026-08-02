import { timingSafeEqual } from "node:crypto";
import { ApiError } from "@/lib/api/api-error";
import {
  PUBLIC_API_KEY_HEADER,
  PUBLIC_API_SECRET_ENV,
} from "@/lib/public-api/constants";

function readConfiguredSecret(): string {
  const secret = process.env[PUBLIC_API_SECRET_ENV]?.trim();

  if (!secret) {
    throw new ApiError(
      "La API pública no está configurada (falta PUBLIC_API_SECRET).",
      503,
      "PUBLIC_API_NOT_CONFIGURED",
    );
  }

  return secret;
}

function extractProvidedSecret(request: Request): string | null {
  const authorization = request.headers.get("authorization")?.trim();

  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    if (token.length > 0) return token;
  }

  const apiKey = request.headers.get(PUBLIC_API_KEY_HEADER)?.trim();
  if (apiKey) return apiKey;

  return null;
}

function secretsMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function requirePublicApiSecret(request: Request): void {
  const expected = readConfiguredSecret();
  const provided = extractProvidedSecret(request);

  if (!provided) {
    throw new ApiError(
      "Se requiere autenticación. Envía Authorization: Bearer <PUBLIC_API_SECRET> o X-API-Key.",
      401,
      "MISSING_API_SECRET",
    );
  }

  if (!secretsMatch(provided, expected)) {
    throw new ApiError("Clave de API inválida.", 401, "INVALID_API_SECRET");
  }
}
