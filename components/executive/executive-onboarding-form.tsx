"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStaffSession } from "@/hooks/use-auth-session";
import {
  EXECUTIVE_HOME_PATH,
  STAFF_LOGIN_PATH,
} from "@/lib/auth/constants";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { ExecutiveSessionUser } from "@/lib/auth/types";

export function ExecutiveOnboardingForm() {
  const router = useRouter();
  const { user, loading, realm, isAdmin, needsExecutiveOnboarding } =
    useStaffSession();
  const executive =
    realm === "executive" ? (user as ExecutiveSessionUser | null) : null;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rut, setRut] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`${STAFF_LOGIN_PATH}?next=/cotizador/ejecutivos/completar-perfil`);
      return;
    }

    if (isAdmin || realm === "admin") {
      router.replace(EXECUTIVE_HOME_PATH);
      return;
    }

    if (!needsExecutiveOnboarding && executive?.onboardingCompleted) {
      router.replace(EXECUTIVE_HOME_PATH);
      return;
    }

    if (realm !== "executive" || !executive) {
      router.replace(STAFF_LOGIN_PATH);
      return;
    }

    if (executive.rut) setRut(executive.rut);

    const parts = executive.fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      setFirstName(parts.slice(0, -1).join(" "));
      setLastName(parts.at(-1) ?? "");
    }
  }, [loading, user, realm, isAdmin, needsExecutiveOnboarding, executive, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const response = await fetch("/api/executive/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone, rut }),
      });

      const data = (await response.json()) as {
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo completar el perfil.");
      }

      router.replace(data.redirectTo ?? "/cotizador/ejecutivos");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !executive || realm !== "executive") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
        Cargando…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className={joinClasses("rounded-2xl border bg-white p-6 shadow-sm sm:p-8", ui.border)}>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Bienvenido
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">
          Completa tu perfil
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Antes de acceder al panel necesitamos confirmar tu identidad y registrar
          tu número de contacto para atender clientes.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Correo</span>
            <Input value={executive.email} readOnly disabled />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Nombre</span>
              <Input
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Apellido</span>
              <Input
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium">RUT</span>
            <Input
              required
              value={rut}
              onChange={(event) => setRut(event.target.value)}
              placeholder="12.345.678-9"
            />
            <p className="text-xs text-muted">
              Debe coincidir con el RUT registrado en tu invitación.
            </p>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Teléfono de contacto</span>
            <Input
              required
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+56 9 1234 5678"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Guardando…" : "Completar perfil e ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
