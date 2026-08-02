"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { LandingLogo } from "@/components/platform/landing/landing-logo";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RESET_REQUEST_PATH,
  STAFF_LOGIN_PATH,
} from "@/lib/auth/constants";
import { landing } from "@/components/platform/landing/landing-tokens";
import { touchTarget } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

const fieldClass =
  "h-11 w-full rounded-xl border border-border/80 bg-white px-3.5 text-sm text-foreground shadow-sm transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/25";

function ResetPasswordFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [email, setEmail] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenError("El enlace no es válido o expiró. Solicita uno nuevo.");
      setLoadingToken(false);
      return;
    }

    void fetch(`/api/auth/password-reset?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = (await response.json()) as {
          error?: string;
          email?: string;
        };
        if (!response.ok) {
          throw new Error(
            data.error ?? "El enlace no es válido o expiró. Solicita uno nuevo.",
          );
        }
        return data;
      })
      .then((data) => {
        setEmail(data.email ?? null);
      })
      .catch((err: unknown) => {
        setTokenError(
          err instanceof Error
            ? err.message
            : "El enlace no es válido o expiró. Solicita uno nuevo.",
        );
      })
      .finally(() => setLoadingToken(false));
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setError(
        `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
      );
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo restablecer la contraseña.");
      }

      router.replace(
        `${STAFF_LOGIN_PATH}?passwordReset=1`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo restablecer la contraseña.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingToken) {
    return (
      <div className="landing-glass-panel-strong w-full max-w-md rounded-3xl border border-border/70 p-6 text-center text-sm text-muted shadow-card sm:p-8">
        Validando enlace…
      </div>
    );
  }

  if (tokenError || !email) {
    return (
      <div className="landing-glass-panel-strong w-full max-w-md rounded-3xl border border-border/70 p-6 shadow-card sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <LandingLogo size="lg" transparent />
          </div>
          <h1 className="landing-text-gradient text-2xl font-bold tracking-tight">
            Enlace no válido
          </h1>
        </div>
        <p
          className="rounded-xl border border-accent-danger/20 bg-danger-muted px-3 py-2.5 text-sm text-accent-danger"
          role="alert"
        >
          {tokenError ?? "El enlace no es válido o expiró. Solicita uno nuevo."}
        </p>
        <Link
          href={PASSWORD_RESET_REQUEST_PATH}
          className={joinClasses(
            touchTarget,
            landing.ctaPrimary,
            "mt-5 flex w-full items-center justify-center rounded-2xl py-3.5",
          )}
        >
          Solicitar un enlace nuevo
        </Link>
        <p className="mt-4 text-center text-xs text-muted">
          <Link
            href={STAFF_LOGIN_PATH}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Volver al acceso
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="landing-glass-panel-strong w-full max-w-md rounded-3xl border border-border/70 p-6 shadow-card sm:p-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex justify-center">
          <LandingLogo size="lg" transparent />
        </div>
        <h1 className="landing-text-gradient text-2xl font-bold tracking-tight sm:text-[1.65rem]">
          Restablecer contraseña
        </h1>
        <p className="mt-2 text-sm leading-relaxed premium-text-secondary">
          Define una nueva contraseña para{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Nueva contraseña
          </span>
          <input
            type="password"
            name="newPassword"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Confirmar contraseña
          </span>
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={fieldClass}
          />
        </label>

        {error ? (
          <p
            className="rounded-xl border border-accent-danger/20 bg-danger-muted px-3 py-2.5 text-sm text-accent-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className={joinClasses(
            touchTarget,
            landing.ctaPrimary,
            "w-full rounded-2xl py-3.5 disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {saving ? "Guardando..." : "Aceptar"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs leading-relaxed text-muted">
        Mínimo {PASSWORD_MIN_LENGTH} caracteres. Tras guardar deberás iniciar
        sesión con la nueva contraseña.
      </p>
    </div>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <div className="landing-glass-panel-strong w-full max-w-md rounded-3xl border border-border/70 p-6 text-center text-sm text-muted shadow-card sm:p-8">
          Cargando…
        </div>
      }
    >
      <ResetPasswordFormInner />
    </Suspense>
  );
}
