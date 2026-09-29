import { NextResponse } from "next/server";
import { apiErrorResponse, ApiError, parseJsonBody } from "@/lib/api/api-error";
import { requireClientQuotationAccess } from "@/lib/api/client-quotation-access";
import { createClientQuotation, listClientQuotations } from "@/lib/api/client-quotation-store";

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireClientQuotationAccess(request, id);
    return NextResponse.json(await listClientQuotations(id));
  } catch (error) {
    console.error("GET client quotations", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await requireClientQuotationAccess(request, id, true);
    const payload = await parseJsonBody(request) as Record<string, unknown>;
    if (!Array.isArray(payload.planCodes) || payload.planCodes.some((value) => typeof value !== "string")) {
      throw new ApiError("Debes seleccionar planes válidos.", 400);
    }
    const quotation = await createClientQuotation({
      clientId: id, executiveId: session.user.id,
      executiveName: session.user.fullName, executiveEmail: session.user.email,
      executivePhone: session.user.phone, planCodes: payload.planCodes as string[],
    });
    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    console.error("POST client quotation", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
