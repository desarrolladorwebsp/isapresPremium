import { NextResponse } from "next/server";
import {
  apiErrorResponse,
  parseJsonBody,
} from "@/lib/api/api-error";
import {
  createPlanRecord,
  readPlans,
} from "@/lib/api/data-store";
import {
  getPlanValidationError,
  isValidPlan,
  normalizePlan,
} from "@/lib/api/plan-validation";
import { requireAdminSession, requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";
import { staffCanAccessSection } from "@/lib/auth/staff-role";
import { ApiError } from "@/lib/api/api-error";
import type { ExecutiveSessionUser } from "@/lib/auth/types";
import type { StaffSection } from "@/lib/staff/staff-sections";

const PLANS_READ_SECTIONS: StaffSection[] = [
  "clinicas",
  "reportes-pdf",
  "cotizador",
];

export async function GET(request: Request) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    const access = {
      realm,
      executiveKind:
        realm === AUTH_REALM.executive
          ? (user as ExecutiveSessionUser).executiveKind
          : null,
    };

    const allowed = PLANS_READ_SECTIONS.some((section) =>
      staffCanAccessSection(access, section),
    );

    if (!allowed) {
      throw new ApiError(
        "No tienes permiso para acceder a este recurso.",
        403,
        "SECTION_FORBIDDEN",
      );
    }

    const plans = await readPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error("GET /api/plans", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession(request);
    const payload = await parseJsonBody(request);

    const validationError = getPlanValidationError(payload);
    if (!isValidPlan(payload)) {
      return NextResponse.json(
        { error: validationError ?? "Datos del plan inválidos." },
        { status: 400 },
      );
    }

    const plan = normalizePlan(payload);
    const created = await createPlanRecord(plan);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/plans", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
