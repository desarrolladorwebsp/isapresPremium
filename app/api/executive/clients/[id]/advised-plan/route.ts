import { NextResponse } from "next/server";
import { updateClientAdvisedPlan } from "@/lib/api/client-plan-store";
import { apiErrorResponse, parseJsonBody } from "@/lib/api/api-error";
import { requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";
import type { UpdateClientAdvisedPlanInput } from "@/types/client-plan";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseAdvisedPlanPayload(payload: unknown): UpdateClientAdvisedPlanInput {
  if (!payload || typeof payload !== "object") {
    throw new Error("Datos inválidos.");
  }

  const data = payload as Record<string, unknown>;

  return {
    planCode:
      data.planCode === null
        ? null
        : typeof data.planCode === "string"
          ? data.planCode
          : null,
    notes: typeof data.notes === "string" ? data.notes : null,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    const { id } = await context.params;
    const payload = await parseJsonBody(request);
    const input = parseAdvisedPlanPayload(payload);

    const updated = await updateClientAdvisedPlan(id, input, {
      executiveAccountId: user.id,
      isAdmin: realm === AUTH_REALM.admin,
      actor: {
        realm: realm === AUTH_REALM.admin ? "admin" : "executive",
        id: user.id,
        name: user.fullName,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/executive/clients/[id]/advised-plan", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
