import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  parseJsonBody,
} from "@/lib/api/api-error";
import {
  deletePlanRecord,
  readPlanByCode,
  updatePlanRecord,
} from "@/lib/api/data-store";
import {
  getPlanValidationError,
  isValidPlan,
  normalizePlan,
} from "@/lib/api/plan-validation";
import { collectPlanPdfCleanupKeys } from "@/lib/plan-pdf-storage/paths";
import { deletePlanPdfVariants } from "@/lib/plan-pdf-storage/delete";
import { requireAdminSession } from "@/lib/auth/require-auth";

interface RouteContext {
  params: Promise<{ uniqueCode: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { uniqueCode } = await context.params;
    const plan = await readPlanByCode(decodeURIComponent(uniqueCode));

    if (!plan) {
      return NextResponse.json(
        { error: "Plan no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(plan, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("GET /api/plans/[uniqueCode]", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireAdminSession(request);
    const { uniqueCode } = await context.params;
    const decodedCode = decodeURIComponent(uniqueCode);
    const payload = await parseJsonBody(request);

    const validationError = getPlanValidationError(payload);
    if (!isValidPlan(payload)) {
      return NextResponse.json(
        { error: validationError ?? "Datos del plan inválidos." },
        { status: 400 },
      );
    }

    const plan = normalizePlan(payload);

    if (plan.unique_code !== decodedCode) {
      return NextResponse.json(
        { error: "El código único de la URL no coincide con el del cuerpo." },
        { status: 400 },
      );
    }

    const updated = await updatePlanRecord(plan);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/plans/[uniqueCode]", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAdminSession(request);
    const { uniqueCode } = await context.params;
    const decodedCode = decodeURIComponent(uniqueCode);
    const deletedPlan = await deletePlanRecord(decodedCode);

    if (!deletedPlan) {
      return NextResponse.json(
        { error: "Plan no encontrado." },
        { status: 404 },
      );
    }

    await deletePlanPdfVariants(
      collectPlanPdfCleanupKeys(
        deletedPlan.isapre,
        deletedPlan.unique_code,
        deletedPlan.pdf_public_id,
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/plans/[uniqueCode]", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
