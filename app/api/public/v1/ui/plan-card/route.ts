import {
  buildPlanCardUiGuide,
  parsePlanCardUiBrand,
} from "@/lib/public-api/plan-card-ui-guide";
import { publicApiErrorResponse, publicApiJsonResponse } from "@/lib/public-api/json-response";
import { publicApiOptionsResponse } from "@/lib/public-api/cors";

export async function OPTIONS(request: Request) {
  return publicApiOptionsResponse(request);
}

/**
 * Guía de estilos para cards de planes — acceso público (sin API key).
 * Pensada para que otras vistas (Cotízalo Antes, embeds, agentes IA) mantengan UI consistente.
 */
export async function GET(request: Request) {
  try {
    const brandParam = new URL(request.url).searchParams.get("brand");
    const brand = parsePlanCardUiBrand(brandParam) ?? "cotizalo-antes";

    if (brandParam && !parsePlanCardUiBrand(brandParam)) {
      return publicApiJsonResponse(
        request,
        {
          error:
            'Parámetro brand inválido. Usa "default" o "cotizalo-antes".',
          code: "INVALID_BRAND",
        },
        400,
      );
    }

    const guide = buildPlanCardUiGuide(request, brand);
    return publicApiJsonResponse(request, guide);
  } catch (error) {
    console.error("GET /api/public/v1/ui/plan-card", error);
    return publicApiErrorResponse(request, error);
  }
}
