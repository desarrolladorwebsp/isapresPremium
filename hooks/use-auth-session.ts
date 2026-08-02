"use client";

import { useEffect, useState } from "react";
import type {
  AdminSessionUser,
  ExecutiveSessionUser,
  StaffMeResponse,
} from "@/lib/auth/types";
import type { StaffSection } from "@/lib/staff/staff-sections";

export function useStaffSession() {
  const [data, setData] = useState<StaffMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });

        if (!response.ok) {
          if (!cancelled) {
            setData(null);
            setError(null);
          }
          return;
        }

        const payload = (await response.json()) as StaffMeResponse;

        if (!cancelled) {
          setData(payload);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setError("No se pudo validar la sesión.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isAdmin = data?.capabilities.adminPanel ?? false;

  return {
    session: data,
    user: data?.user ?? null,
    realm: data?.realm ?? null,
    executiveKind: data?.executiveKind ?? null,
    isAdmin,
    /** Puede acceder al panel ejecutivo (admin o ejecutivo). */
    isExecutive: data?.capabilities.executivePanel ?? false,
    /** Vacío hasta que /api/auth/me responda (evita flash de menú incorrecto). */
    allowedSections: data?.capabilities.sections ?? ([] as StaffSection[]),
    /** Solo cuentas ejecutivas con perfil pendiente deben completar onboarding. */
    needsExecutiveOnboarding:
      data?.realm === "executive" &&
      data.user != null &&
      !(data.user as ExecutiveSessionUser).onboardingCompleted,
    loading,
    error,
  };
}

type AuthRealm = "admin" | "executive";

type SessionUserMap = {
  admin: AdminSessionUser | null;
  executive: ExecutiveSessionUser | null;
};

/**
 * Compatibilidad con componentes existentes.
 * Usa la sesión unificada y filtra según el realm solicitado.
 */
export function useAuthSession<T extends AuthRealm>(realm: T) {
  const staff = useStaffSession();

  if (staff.loading || !staff.session) {
    return {
      user: null as SessionUserMap[T] | null,
      loading: staff.loading,
      error: staff.error,
    };
  }

  if (realm === "admin") {
    return {
      user:
        staff.realm === "admin"
          ? (staff.user as SessionUserMap[T])
          : null,
      loading: false,
      error: null,
    };
  }

  return {
    user: staff.user as SessionUserMap[T] | null,
    loading: false,
    error: null,
  };
}
