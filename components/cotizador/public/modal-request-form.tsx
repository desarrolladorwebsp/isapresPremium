"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { privacyPolicyMeta } from "@/constants/privacy-policy";
import { safeWidth, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export function isValidRequestEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function normalizeRequestPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function requestFieldErrorClass(show: boolean): string {
  return show ? "border-accent-danger ring-1 ring-accent-danger/30" : "";
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
      <path
        d="M7 11V8a5 5 0 0110 0v3M6 11h12v9H6v-9z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface ModalRequestFormProps {
  name: string;
  onNameChange: (value: string) => void;
  rut: string;
  onRutChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  acceptPrivacy: boolean;
  onAcceptPrivacyChange: (value: boolean) => void;
  attemptedSubmit: boolean;
  validationErrors: string[];
  submitError: string | null;
  submitting: boolean;
  onSubmit: (event: React.FormEvent) => void;
  variant?: "card" | "plain";
}

export function ModalRequestForm({
  name,
  onNameChange,
  rut,
  onRutChange,
  email,
  onEmailChange,
  phone,
  onPhoneChange,
  acceptPrivacy,
  onAcceptPrivacyChange,
  attemptedSubmit,
  validationErrors,
  submitError,
  submitting,
  onSubmit,
  variant = "plain",
}: ModalRequestFormProps) {
  const formContent = (
    <>
      <div>
        <h3
          className={joinClasses(
            "font-bold",
            variant === "card"
              ? "text-lg text-secondary"
              : "text-lg text-primary-dark",
          )}
        >
          Solicitar
        </h3>
        <p className="mt-1 text-sm text-muted">
          Contrata y/o recibe asesoría mediante un ejecutivo especializado.
        </p>
      </div>

      {validationErrors.length > 0 ? (
        <div
          className="rounded-xl border border-accent-warning/40 bg-warning-muted px-4 py-3"
          role="alert"
        >
          <p className="text-sm font-bold text-accent-warning-foreground">
            Revisa los siguientes datos antes de continuar:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-foreground">
            Nombre <span className="text-accent-danger">*</span>
          </span>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Ingresa tu nombre"
            className={joinClasses(
              "h-11 w-full max-w-full rounded-xl px-3 text-sm",
              ui.input,
              requestFieldErrorClass(attemptedSubmit && !name.trim()),
            )}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-foreground">
            RUT <span className="text-accent-danger">*</span>
          </span>
          <input
            value={rut}
            onChange={(e) => onRutChange(e.target.value)}
            placeholder="12.345.678-9"
            className={joinClasses(
              "h-11 w-full max-w-full rounded-xl px-3 text-sm",
              ui.input,
              requestFieldErrorClass(
                attemptedSubmit &&
                  (!rut.trim() || rut.replace(/\D/g, "").length < 7),
              ),
            )}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-foreground">
            Correo electrónico <span className="text-accent-danger">*</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="correo@ejemplo.cl"
            className={joinClasses(
              "h-11 w-full max-w-full rounded-xl px-3 text-sm",
              ui.input,
              requestFieldErrorClass(
                attemptedSubmit &&
                  (!email.trim() || !isValidRequestEmail(email)),
              ),
            )}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-foreground">
            Teléfono <span className="text-accent-danger">*</span>
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="+56 9 1234 5678"
            className={joinClasses(
              "h-11 w-full max-w-full rounded-xl px-3 text-sm",
              ui.input,
              requestFieldErrorClass(
                attemptedSubmit &&
                  (!phone.trim() ||
                    normalizeRequestPhoneDigits(phone).length < 8),
              ),
            )}
          />
        </label>

        <label
          className={joinClasses(
            "flex items-start gap-3 rounded-xl border px-3 py-3",
            attemptedSubmit && !acceptPrivacy
              ? "border-accent-danger/40 bg-danger-muted/40"
              : "border-border bg-white/60",
          )}
        >
          <input
            type="checkbox"
            checked={acceptPrivacy}
            onChange={(e) => onAcceptPrivacyChange(e.target.checked)}
            required
            aria-invalid={attemptedSubmit && !acceptPrivacy}
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
          <span className="text-xs leading-relaxed text-muted sm:text-sm">
            Autorizo el tratamiento de mis datos personales conforme a la
            legislación chilena vigente (Ley N° 21.719) y la{" "}
            <Link
              href={privacyPolicyMeta.path}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              política de privacidad
            </Link>
            .
          </span>
        </label>
      </div>

      {submitError ? (
        <p
          className="rounded-lg border border-accent-danger/30 bg-danger-muted px-4 py-3 text-sm font-medium text-accent-danger"
          role="alert"
        >
          {submitError}
        </p>
      ) : null}

      <div className="space-y-3 pt-1">
        <Button
          type="submit"
          disabled={submitting}
          className={joinClasses(
            "h-12 w-full text-base font-bold",
            submitting ? "opacity-60" : ui.cta,
          )}
        >
          {submitting ? "Enviando solicitud…" : "Solicitar con ejecutivo"}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary">
          <LockIcon />
          Sitio seguro
        </p>
      </div>
    </>
  );

  if (variant === "card") {
    return (
      <form
        onSubmit={onSubmit}
        noValidate
        className={joinClasses(
          safeWidth,
          "space-y-5 rounded-2xl border bg-white p-5 shadow-card sm:p-6",
          ui.border,
        )}
      >
        {formContent}
      </form>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={joinClasses(safeWidth, "space-y-5")}
    >
      {formContent}
    </form>
  );
}
