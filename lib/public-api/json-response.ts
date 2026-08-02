import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { withPublicApiCors } from "@/lib/public-api/cors";

export function publicApiJsonResponse(
  request: Request,
  body: unknown,
  status = 200,
): Response {
  const response = NextResponse.json(body, { status });
  return withPublicApiCors(response, request);
}

export function publicApiErrorResponse(request: Request, error: unknown): Response {
  const { body, status } = apiErrorResponse(error);
  return publicApiJsonResponse(request, body, status);
}
