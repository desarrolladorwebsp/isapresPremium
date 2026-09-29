import "server-only";

import { ApiError } from "@/lib/api/api-error";
import { readClientOrThrow } from "@/lib/api/user-store";
import { AUTH_REALM } from "@/lib/auth/constants";
import { requireExecutiveOrAdminSession, assertSessionStaffSection } from "@/lib/auth/require-auth";
import { canEditClientDataAsExecutive, canViewClientAsExecutive } from "@/lib/client-pipeline/tracking";
import type { ExecutiveSessionUser } from "@/lib/auth/types";

export async function requireClientQuotationAccess(request: Request, clientId: string, edit = false) {
  const session = await requireExecutiveOrAdminSession(request);
  assertSessionStaffSection(session.realm, session.user, "clientes");
  const client = await readClientOrThrow(clientId);
  const isAdmin = session.realm === AUTH_REALM.admin;
  const kind = isAdmin ? null : (session.user as ExecutiveSessionUser).executiveKind;
  const allowed = edit
    ? canEditClientDataAsExecutive(client, session.user.id, isAdmin, kind)
    : canViewClientAsExecutive(client, session.user.id, isAdmin, kind);
  if (!allowed) throw new ApiError("No tienes permiso para gestionar cotizaciones de este cliente.", 403, "FORBIDDEN");
  return { ...session, client };
}
