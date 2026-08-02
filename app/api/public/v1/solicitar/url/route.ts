import { ApiError, parseJsonBody } from "@/lib/api/api-error";
import { publicApiErrorResponse, publicApiJsonResponse } from "@/lib/public-api/json-response";
import { publicApiOptionsResponse } from "@/lib/public-api/cors";
import { PUBLIC_API_BASE_PATH } from "@/lib/public-api/constants";
import {
  buildSolicitarUrlFromRequest,
  buildSolicitarUrlRequestSchema,
} from "@/lib/public-api/solicitar-url";
import { requirePublicApiSecret } from "@/lib/public-api/require-api-secret";

function resolveCotizadorBaseUrl(request: Request): string {
  const configured = process.env.PUBLIC_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/api\/public\/v1\/?$/, "").replace(/\/$/, "");
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  if (!host) {
    return "https://cotizador.cotizaloantes.cl";
  }

  return `${protocol}://${host}`;
}

export async function OPTIONS(request: Request) {
  return publicApiOptionsResponse(request);
}

export async function POST(request: Request) {
  try {
    requirePublicApiSecret(request);
    const body = await parseJsonBody(request);
    const parsed = buildSolicitarUrlRequestSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => issue.message)
        .join(" ");
      throw new ApiError(message || "Parámetros inválidos.", 400, "INVALID_BODY");
    }

    const result = buildSolicitarUrlFromRequest(
      parsed.data,
      resolveCotizadorBaseUrl(request),
    );

    return publicApiJsonResponse(request, {
      data: result,
      meta: {
        endpoint: `${PUBLIC_API_BASE_PATH}/solicitar/url`,
        version: "v1",
      },
    });
  } catch (error) {
    console.error("POST /api/public/v1/solicitar/url", error);
    return publicApiErrorResponse(request, error);
  }
}
