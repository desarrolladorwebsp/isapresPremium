import { readPlans } from "@/lib/api/data-store";
import { publicApiErrorResponse, publicApiJsonResponse } from "@/lib/public-api/json-response";
import { publicApiOptionsResponse } from "@/lib/public-api/cors";
import { PUBLIC_API_VERSION } from "@/lib/public-api/constants";
import { requirePublicApiSecret } from "@/lib/public-api/require-api-secret";

export async function OPTIONS(request: Request) {
  return publicApiOptionsResponse(request);
}

export async function GET(request: Request) {
  try {
    requirePublicApiSecret(request);
    const plans = await readPlans();

    return publicApiJsonResponse(request, {
      data: plans,
      meta: {
        total: plans.length,
        version: PUBLIC_API_VERSION,
      },
    });
  } catch (error) {
    console.error("GET /api/public/v1/plans", error);
    return publicApiErrorResponse(request, error);
  }
}
