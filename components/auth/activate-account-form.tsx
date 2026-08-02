"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { StaffRealm } from "@/types/staff-account";

interface InviteInfo {
  email: string;
  realm: StaffRealm;
  rut: string | null;
}

interface ActivateAccountFormProps {
  realm: StaffRealm;
  title: string;
}

function ActivateAccountForm({ realm, title }: ActivateAccountFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!token) {
      setError("El enlace de invitación no es válido.");
      setLoadingInvite(false);
      return;
    }

    void fetch(`/api/auth/staff-invite?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "Invitación inválida.");
        }
        return response.json() as Promise<InviteInfo>;
      })
      .then((data) => {
        if (data.realm !== realm) {
          throw new Error("Este enlace no corresponde a este tipo de cuenta.");
        }
        setInvite(data);
        if (data.rut) setRut(data.rut);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Invitación inválida.");
      })
      .finally(() => setLoadingInvite(false));
  }, [token, realm]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/auth/staff-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          firstName,
          lastName,
          rut,
          password,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo activar la cuenta.");
      }

      router.replace(data.redirectTo ?? "/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al activar la cuenta.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-layout text-sm text-muted">
        Validando invitación…
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-layout px-4">
        <div className="max-w-md rounded-2xl border border-border bg-background p-8 text-center shadow-card">
          <p className="text-sm text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-layout px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 shadow-card">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted">
          {realm === "executive"
            ? "Valida tu RUT y crea tu contraseña personalizada para acceder al panel."
            : "Completa tus datos para crear tu contraseña. Solo quien recibió el correo"}{" "}
          {realm !== "executive" ? (
            <>
              <strong>{invite?.email}</strong> puede usar este enlace.
            </>
          ) : null}
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Correo</span>
            <Input value={invite?.email ?? ""} readOnly disabled />
          </label>

          {realm === "admin" ? (
            <>
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
            </>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-medium">RUT</span>
            <Input
              required
              value={rut}
              onChange={(event) => setRut(event.target.value)}
              placeholder="12.345.678-9"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Contraseña</span>
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Confirmar contraseña</span>
            <Input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving
              ? "Creando cuenta…"
              : realm === "executive"
                ? "Crear contraseña e ingresar"
                : "Crear cuenta e ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function ActivateAccountPage(props: ActivateAccountFormProps) {
  return (
    <Suspense
      fallback={
        <div className={joinClasses("flex min-h-screen items-center justify-center", ui.mutedText)}>
          Cargando…
        </div>
      }
    >
      <ActivateAccountForm {...props} />
    </Suspense>
  );
}
