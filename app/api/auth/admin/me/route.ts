import { NextResponse } from "next/server";
import { AUTH_REALM } from "@/lib/auth/constants";
import { apiErrorResponse } from "@/lib/api/api-error";
import { buildStaffMeResponse } from "@/lib/auth/require-auth";

/** @deprecated Usar GET /api/auth/me */
export async function GET() {
  try {
    const me = await buildStaffMeResponse();

    if (!me || me.realm !== AUTH_REALM.admin) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    return NextResponse.json({ user: me.user });
  } catch (error) {
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
