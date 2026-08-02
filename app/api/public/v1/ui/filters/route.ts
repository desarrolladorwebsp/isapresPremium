import { buildFiltersUiGuide } from "@/lib/zone-filter-guide";
import { publicApiErrorResponse, publicApiJsonResponse } from "@/lib/public-api/json-response";
import { publicApiOptionsResponse } from "@/lib/public-api/cors";

export async function OPTIONS(request: Request) {
  return publicApiOptionsResponse(request);
}

/**
 * Guía de filtros del cotizador — acceso público (sin API key).
 * Incluye zonas, tipos de plan, clínicas (hospitalaria/ambulatoria) e integradores.
 */
export async function GET(request: Request) {
  try {
    const guide = buildFiltersUiGuide(request);
    return publicApiJsonResponse(request, guide);
  } catch (error) {
    console.error("GET /api/public/v1/ui/filters", error);
    return publicApiErrorResponse(request, error);
  }
}
