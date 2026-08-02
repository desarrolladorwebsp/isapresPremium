import { redirect } from "next/navigation";
import {
  EXECUTIVE_HOME_PATH,
  EXECUTIVE_ONBOARDING_PATH,
  STAFF_LOGIN_PATH,
  staffCanAccessExecutiveRoutes,
} from "@/lib/auth/constants";
import { buildStaffMeResponse } from "@/lib/auth/require-auth";
import { readStaffSessionFromCookies } from "@/lib/auth/session";
import { AUTH_REALM } from "@/lib/auth/constants";
import type { ExecutiveSessionUser } from "@/lib/auth/types";

function buildStaffLoginRedirect(nextPath: string): string {
  return `${STAFF_LOGIN_PATH}?next=${encodeURIComponent(nextPath)}`;
}

/**
 * Redirige al login si no hay cookie de sesión staff válida.
 * Solo valida el JWT en cookie (sin consultar la base de datos).
 */
export async function requireStaffSessionCookie(
  nextPath: string = EXECUTIVE_HOME_PATH,
): Promise<void> {
  const session = await readStaffSessionFromCookies();

  if (!session || !staffCanAccessExecutiveRoutes(session.realm)) {
    redirect(buildStaffLoginRedirect(nextPath));
  }
}

/** Redirige al login si no hay sesión staff válida para el panel ejecutivo. */
export async function requireExecutivePanelPage(
  nextPath: string = EXECUTIVE_HOME_PATH,
) {
  const me = await buildStaffMeResponse();

  if (!me?.capabilities.executivePanel) {
    redirect(buildStaffLoginRedirect(nextPath));
  }

  const executive =
    me.realm === AUTH_REALM.executive ? (me.user as ExecutiveSessionUser) : null;

  if (executive && !executive.onboardingCompleted) {
    redirect(EXECUTIVE_ONBOARDING_PATH);
  }

  return me;
}
