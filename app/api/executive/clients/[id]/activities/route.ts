import { NextResponse } from "next/server";
import { readClientActivities } from "@/lib/api/client-activity-store";
import { apiErrorResponse } from "@/lib/api/api-error";
import { readClientOrThrow } from "@/lib/api/user-store";
import { requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";
import { AUTH_REALM } from "@/lib/auth/constants";
import { ApiError } from "@/lib/api/api-error";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { realm, user } = await requireExecutiveOrAdminSession(request);
    const { id } = await context.params;
    const client = await readClientOrThrow(id);

    if (
      realm !== AUTH_REALM.admin &&
      client.assignedExecutiveId !== user.id
    ) {
      throw new ApiError(
        "No tienes permiso para ver este cliente.",
        403,
        "FORBIDDEN",
      );
    }

    const activities = await readClientActivities(id);
    return NextResponse.json(activities);
  } catch (error) {
    console.error("GET /api/executive/clients/[id]/activities", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
