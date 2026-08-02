"use client";

import { useEffect, type ReactNode } from "react";
import {
  EXECUTIVE_HOME_PATH,
  EXECUTIVE_ONBOARDING_PATH,
  STAFF_LOGIN_PATH,
} from "@/lib/auth/constants";
import { StaffAuthRedirectFallback } from "@/components/auth/staff-auth-redirect-fallback";
import { useStaffSession } from "@/hooks/use-auth-session";

interface ExecutiveAuthGateProps {
  children: ReactNode;
  /** Ruta protegida; se usa como `next` al redirigir al login. */
  returnPath?: string;
}

function buildLoginUrl(returnPath: string): string {
  return `${STAFF_LOGIN_PATH}?next=${encodeURIComponent(returnPath)}`;
}

export function ExecutiveAuthGate({
  children,
  returnPath = EXECUTIVE_HOME_PATH,
}: ExecutiveAuthGateProps) {
  const { user, loading, isExecutive, needsExecutiveOnboarding } = useStaffSession();
  const loginUrl = buildLoginUrl(returnPath);

  useEffect(() => {
    if (loading) return;

    if (!user || !isExecutive) {
      window.location.replace(loginUrl);
      return;
    }

    if (needsExecutiveOnboarding) {
      window.location.replace(EXECUTIVE_ONBOARDING_PATH);
    }
  }, [loading, user, isExecutive, needsExecutiveOnboarding, loginUrl]);

  if (loading) {
    return (
      <StaffAuthRedirectFallback
        title="Validando sesión…"
        message="Estamos comprobando tu acceso al panel."
        href={loginUrl}
      />
    );
  }

  if (!user || !isExecutive) {
    return (
      <StaffAuthRedirectFallback
        title="Redirigiendo al acceso…"
        message="Necesitas iniciar sesión para entrar al panel de ejecutivos."
        href={loginUrl}
      />
    );
  }

  if (needsExecutiveOnboarding) {
    return (
      <StaffAuthRedirectFallback
        title="Completando perfil…"
        message="Te estamos llevando a completar tu perfil de ejecutivo."
        href={EXECUTIVE_ONBOARDING_PATH}
        linkLabel="Completar perfil"
      />
    );
  }

  return <>{children}</>;
}
