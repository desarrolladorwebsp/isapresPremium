import { NextResponse } from "next/server";
import { apiErrorResponse, parseJsonBody } from "@/lib/api/api-error";
import { updateOwnStaffProfile } from "@/lib/auth/account-store";
import { requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";

export async function PATCH(request: Request) {
  try {
    const { user } = await requireExecutiveOrAdminSession(request);

    const payload = (await parseJsonBody(request)) as Record<string, unknown>;
    const firstName = typeof payload.firstName === "string" ? payload.firstName : "";
    const lastName = typeof payload.lastName === "string" ? payload.lastName : "";
    const phone = typeof payload.phone === "string" ? payload.phone : "";
    const rut = typeof payload.rut === "string" ? payload.rut : "";

    const updated = await updateOwnStaffProfile(user.id, {
      firstName,
      lastName,
      phone,
      rut,
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    console.error("PATCH /api/executive/profile", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
