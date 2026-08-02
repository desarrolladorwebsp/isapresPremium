import { buildPublicApiAgentGuide } from "@/lib/public-api/openapi";
import { publicApiErrorResponse, publicApiJsonResponse } from "@/lib/public-api/json-response";
import { publicApiOptionsResponse } from "@/lib/public-api/cors";
import { requirePublicApiSecret } from "@/lib/public-api/require-api-secret";

export async function OPTIONS(request: Request) {
  return publicApiOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    requirePublicApiSecret(request);
    const guide = buildPublicApiAgentGuide(request);
    return publicApiJsonResponse(request, guide);
  } catch (error) {
    console.error("GET /api/public/v1/docs", error);
    return publicApiErrorResponse(request, error);
  }
}
