import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api/api-error";
import { listSentQuotationsForKpi } from "@/lib/api/client-quotation-store";
import { AUTH_REALM } from "@/lib/auth/constants";
import { assertSessionStaffSection, requireExecutiveOrAdminSession } from "@/lib/auth/require-auth";

export async function GET(request: Request) {
  try {
    const session = await requireExecutiveOrAdminSession(request);
    assertSessionStaffSection(session.realm, session.user, "inicio");
    const executiveId =
      session.realm === AUTH_REALM.admin ? null : session.user.id;
    return NextResponse.json(await listSentQuotationsForKpi(executiveId));
  } catch (error) {
    console.error("GET sent quotations kpi", error);
    const { body, status } = apiErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
