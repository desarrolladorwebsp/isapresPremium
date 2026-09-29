import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, parseJsonBody } from "@/lib/api/api-error";
import { requireClientQuotationAccess } from "@/lib/api/client-quotation-access";
import { updateClientQuotationStatus } from "@/lib/api/client-quotation-store";
import { CLIENT_QUOTATION_STATUS_OPTIONS, type ClientQuotationStatus } from "@/types/client-quotation";

interface RouteContext { params: Promise<{ id: string; quotationId: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id, quotationId } = await context.params;
    const session = await requireClientQuotationAccess(request, id, true);
    const payload = await parseJsonBody(request) as Record<string, unknown>;
    if (typeof payload.status !== "string" || !CLIENT_QUOTATION_STATUS_OPTIONS.includes(payload.status as ClientQuotationStatus)) {
      throw new ApiError("Estado de cotización inválido.", 400);
    }
    return NextResponse.json(await updateClientQuotationStatus({
      clientId: id, quotationId, status: payload.status as ClientQuotationStatus,
      reason: typeof payload.reason === "string" ? payload.reason : null,
      actorId: session.user.id, actorName: session.user.fullName,
    }));
  } catch (error) {
    console.error("PATCH client quotation", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
