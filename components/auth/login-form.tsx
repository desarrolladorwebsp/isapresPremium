"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LandingLogo } from "@/components/platform/landing/landing-logo";
import {
  AUTH_REALM,
  PASSWORD_RESET_REQUEST_PATH,
  STAFF_DEFAULT_HOME,
  getChangePasswordPath,
  type AuthRealm,
} from "@/lib/auth/constants";
import { landing } from "@/components/platform/landing/landing-tokens";
import { touchTarget } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export interface LoginFormProps {
  title?: string;
  subtitle?: string;
  redirectTo?: string;
}

function resolveRedirect(
  realm: AuthRealm,
  mustChangePassword: boolean,
  next: string | null,
): string {
  if (mustChangePassword) {
    return getChangePasswordPath(realm);
  }

  if (next && next.startsWith("/cotizador")) {
    return next;
  }

  return STAFF_DEFAULT_HOME;
}

const fieldClass =
  "h-11 w-full rounded-xl border border-border/80 bg-white px-3.5 text-sm text-foreground shadow-sm transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/25";

export function LoginForm({
  title = "Acceso al cotizador",
  subtitle = "Ingresa con tu cuenta de administrador o ejecutivo comercial.",
  redirectTo,
}: LoginFormProps) {
  const searchParams = useSearchParams();
  const passwordResetSuccess = searchParams.get("passwordReset") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as {
        error?: string;
        realm?: AuthRealm;
        user?: { mustChangePassword?: boolean };
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo iniciar sesión.");
      }

      const realm = data.realm ?? AUTH_REALM.executive;
      const mustChangePassword = Boolean(data.user?.mustChangePassword);
      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;

      const destination =
        redirectTo ?? resolveRedirect(realm, mustChangePassword, next);

      window.location.assign(destination);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo iniciar sesión.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="landing-glass-panel-strong w-full max-w-md rounded-3xl border border-border/70 p-6 shadow-card sm:p-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex justify-center">
          <LandingLogo size="lg" transparent />
        </div>
        <h1 className="landing-text-gradient text-2xl font-bold tracking-tight sm:text-[1.65rem]">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed premium-text-secondary">
          {subtitle}
        </p>
      </div>

      {passwordResetSuccess ? (
        <p
          className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground"
          role="status"
        >
          Contraseña actualizada, inicia sesión.
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Correo
          </span>
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="block space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Contraseña
            </span>
            <Link
              href={PASSWORD_RESET_REQUEST_PATH}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
          disabled={loading}
          className={joinClasses(
            touchTarget,
            landing.ctaPrimary,
            "w-full rounded-2xl py-3.5 disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs leading-relaxed text-muted">
        Una sola cuenta para administradores y ejecutivos. Tu rol se detecta
        automáticamente al ingresar.
      </p>
    </div>
  );
}
