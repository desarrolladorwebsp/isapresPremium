import { NextResponse } from "next/server";
import {
  AUTH_REALM,
  staffCanAccessAdminRoutes,
  staffCanAccessExecutiveRoutes,
  type AuthRealm,
} from "@/lib/auth/constants";
import {
  readAdminByEmail,
  readAdminById,
  readExecutiveById,
} from "@/lib/auth/account-store";
import {
  readStaffSessionFromCookies,
  readStaffSessionFromRequest,
} from "@/lib/auth/session";
import { getStaffSectionsForAccount } from "@/lib/auth/staff-role";
import type {
  AdminSessionUser,
  ExecutiveSessionUser,
  SessionPayload,
  StaffMeResponse,
} from "@/lib/auth/types";
import { ApiError } from "@/lib/api/api-error";

export interface StaffSessionOptions {
  /** Permite sesión de ejecutivo con perfil pendiente (onboarding o cambio de clave). */
  allowIncompleteOnboarding?: boolean;
}

function assertExecutiveOnboardingComplete(
  user: ExecutiveSessionUser,
  options?: StaffSessionOptions,
): void {
  if (options?.allowIncompleteOnboarding) return;

  if (!user.onboardingCompleted) {
    throw new ApiError(
      "Debes completar tu perfil antes de continuar.",
      403,
      "ONBOARDING_REQUIRED",
    );
  }
}

interface ResolvedStaffSession {
  session: SessionPayload;
  user: AdminSessionUser | ExecutiveSessionUser;
  realm: AuthRealm;
  sessionUpgraded: boolean;
}

async function resolveStaffSession(
  request?: Request,
): Promise<SessionPayload | null> {
  return request
    ? readStaffSessionFromRequest(request)
    : readStaffSessionFromCookies();
}

async function loadStaffUser(
  session: SessionPayload,
): Promise<AdminSessionUser | ExecutiveSessionUser | null> {
  if (session.realm === AUTH_REALM.admin) {
    return readAdminById(session.sub);
  }

  return readExecutiveById(session.sub);
}

/**
 * Resuelve la identidad efectiva del staff.
 * Si la sesión es de ejecutivo inactivo pero existe cuenta admin con el mismo
 * correo, promueve automáticamente a administrador (login unificado).
 */
async function resolveEffectiveStaffSession(
  request?: Request,
): Promise<ResolvedStaffSession | null> {
  const session = await resolveStaffSession(request);
  if (!session) return null;

  let user = await loadStaffUser(session);
  let realm = session.realm;
  let sessionUpgraded = false;

  if (!user) {
    const admin = await readAdminByEmail(session.email);
    if (admin) {
      user = admin;
      realm = AUTH_REALM.admin;
      sessionUpgraded = true;
    }
  }

  if (!user) {
    return null;
  }

  if (realm === AUTH_REALM.executive) {
    const executive = user as ExecutiveSessionUser;
    if (!executive.subscriptionActive) {
      const admin = await readAdminByEmail(session.email);
      if (admin) {
        user = admin;
        realm = AUTH_REALM.admin;
        sessionUpgraded = true;
      } else {
        return null;
      }
    }
  }

  // Login unificado: si existe cuenta admin con el mismo correo, prevalece sobre ejecutivo.
  const adminForEmail = await readAdminByEmail(session.email);
  if (adminForEmail && realm === AUTH_REALM.executive) {
    user = adminForEmail;
    realm = AUTH_REALM.admin;
    sessionUpgraded = true;
  }

  return { session, user, realm, sessionUpgraded };
}

export async function requireStaffSession(
  request?: Request,
): Promise<{
  session: SessionPayload;
  user: AdminSessionUser | ExecutiveSessionUser;
  realm: AuthRealm;
}> {
  const resolved = await resolveEffectiveStaffSession(request);

  if (!resolved) {
    throw new ApiError("Sesión requerida.", 401, "UNAUTHORIZED");
  }

  return {
    session: resolved.session,
    user: resolved.user,
    realm: resolved.realm,
  };
}

export async function requireAdminSession(
  request?: Request,
): Promise<{ session: SessionPayload; user: AdminSessionUser }> {
  const staff = await requireStaffSession(request);

  if (!staffCanAccessAdminRoutes(staff.realm)) {
    throw new ApiError("Sesión de administrador requerida.", 401, "UNAUTHORIZED");
  }

  return {
    session: staff.session,
    user: staff.user as AdminSessionUser,
  };
}

export async function requireExecutiveSession(
  request?: Request,
  options?: StaffSessionOptions,
): Promise<{ session: SessionPayload; user: ExecutiveSessionUser }> {
  const staff = await requireStaffSession(request);

  if (!staffCanAccessExecutiveRoutes(staff.realm)) {
    throw new ApiError("Sesión de ejecutivo requerida.", 401, "UNAUTHORIZED");
  }

  if (staff.realm === AUTH_REALM.admin) {
    throw new ApiError(
      "Esta acción requiere una cuenta de ejecutivo.",
      403,
      "EXECUTIVE_REQUIRED",
    );
  }

  const executive = staff.user as ExecutiveSessionUser;
  assertExecutiveOnboardingComplete(executive, options);

  return {
    session: staff.session,
    user: executive,
  };
}

export async function requireExecutiveOrAdminSession(
  request?: Request,
  options?: StaffSessionOptions,
): Promise<{
  session: SessionPayload;
  user: AdminSessionUser | ExecutiveSessionUser;
  realm: AuthRealm;
}> {
  const staff = await requireStaffSession(request);

  if (!staffCanAccessExecutiveRoutes(staff.realm)) {
    throw new ApiError("No autorizado.", 401, "UNAUTHORIZED");
  }

  if (staff.realm === AUTH_REALM.executive) {
    assertExecutiveOnboardingComplete(
      staff.user as ExecutiveSessionUser,
      options,
    );
  }

  return staff;
}

export async function buildStaffMeResponse(
  request?: Request,
): Promise<(StaffMeResponse & { sessionUpgraded?: boolean }) | null> {
  try {
    const resolved = await resolveEffectiveStaffSession(request);
    if (!resolved) return null;

    const executiveKind =
      resolved.realm === AUTH_REALM.executive
        ? (resolved.user as ExecutiveSessionUser).executiveKind
        : null;

    return {
      realm: resolved.realm,
      executiveKind,
      user: resolved.user,
      capabilities: {
        adminPanel: staffCanAccessAdminRoutes(resolved.realm),
        executivePanel: staffCanAccessExecutiveRoutes(resolved.realm),
        sections: getStaffSectionsForAccount({
          realm: resolved.realm,
          executiveKind,
        }),
      },
      sessionUpgraded: resolved.sessionUpgraded,
    };
  } catch (error) {
    console.error("[buildStaffMeResponse] Failed to resolve staff session:", error);
    return null;
  }
}

export function unauthorizedResponse(_realm?: AuthRealm): NextResponse {
  return NextResponse.json(
    { error: "No autorizado.", code: "UNAUTHORIZED" },
    { status: 401 },
  );
}
