"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { LandingLogo } from "@/components/platform/landing/landing-logo";
import { STAFF_LOGIN_PATH } from "@/lib/auth/constants";
import { landing } from "@/components/platform/landing/landing-tokens";
import { touchTarget } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

const fieldClass =
  "h-11 w-full rounded-xl border border-border/80 bg-white px-3.5 text-sm text-foreground shadow-sm transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/25";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo enviar la solicitud.");
      }

      setSuccessMessage(
        data.message ??
          "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo enviar la solicitud.",
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
          Recuperar contraseña
        </h1>
        <p className="mt-2 text-sm leading-relaxed premium-text-secondary">
          Indica el correo de tu cuenta staff. Si existe, te enviaremos un
          enlace para crear una nueva contraseña.
        </p>
      </div>

      {successMessage ? (
        <div className="space-y-5">
          <p
            className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground"
            role="status"
          >
            {successMessage}
          </p>
          <Link
            href={STAFF_LOGIN_PATH}
            className={joinClasses(
              touchTarget,
              landing.ctaPrimary,
              "flex w-full items-center justify-center rounded-2xl py-3.5",
            )}
          >
            Volver al inicio de sesión
          </Link>
        </div>
      ) : (
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
            {loading ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-xs leading-relaxed text-muted">
        <Link
          href={STAFF_LOGIN_PATH}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Volver al acceso
        </Link>
        {" · "}
        El enlace expira en minutos por seguridad.
      </p>
    </div>
  );
}
