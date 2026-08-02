import { NextResponse } from "next/server";
import { refreshSessionToken } from "@/lib/auth/jwt";
import { buildStaffMeResponse } from "@/lib/auth/require-auth";
import {
  applyStaffSessionCookieToResponse,
  readStaffSessionFromRequest,
} from "@/lib/auth/session";

export async function GET(request: Request) {
  const me = await buildStaffMeResponse(request);

  if (!me) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { sessionUpgraded, ...payload } = me;
  const response = NextResponse.json(payload);

  const session = await readStaffSessionFromRequest(request);
  if (session) {
    const needsUpgrade =
      sessionUpgraded ||
      me.realm !== session.realm ||
      me.user.id !== session.sub;

    const token = await refreshSessionToken(
      session,
      needsUpgrade
        ? {
            realm: me.realm,
            sub: me.user.id,
            mustChangePassword: me.user.mustChangePassword,
          }
        : undefined,
    );
    applyStaffSessionCookieToResponse(response, token);
  }

  return response;
}
