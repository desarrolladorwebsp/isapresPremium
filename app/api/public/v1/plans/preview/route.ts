import { readLimitedPlanSummaries } from "@/lib/api/plan-search";
import { publicApiErrorResponse, publicApiJsonResponse } from "@/lib/public-api/json-response";
import { publicApiOptionsResponse } from "@/lib/public-api/cors";
import {
  PUBLIC_API_PLANS_PREVIEW_LIMIT,
  PUBLIC_API_VERSION,
} from "@/lib/public-api/constants";
import { requirePublicApiSecret } from "@/lib/public-api/require-api-secret";

export async function OPTIONS(request: Request) {
  return publicApiOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    requirePublicApiSecret(request);
    const result = await readLimitedPlanSummaries(PUBLIC_API_PLANS_PREVIEW_LIMIT);

    return publicApiJsonResponse(request, {
      data: result.plans,
      meta: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        version: PUBLIC_API_VERSION,
      },
    });
  } catch (error) {
    console.error("GET /api/public/v1/plans/preview", error);
    return publicApiErrorResponse(request, error);
  }
}
