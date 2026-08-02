"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CompanyAgreementInfoModal } from "@/components/cotizador/company-agreement/company-agreement-info-modal";
import {
  hasCompanyAgreementInquiryData,
  validateCompanyAgreementFields,
} from "@/lib/email/company-agreement-schema";
import { COMPANY_AGREEMENT_DISCOUNT_DISCLAIMER } from "@/lib/company-agreements/constants";
import { isValidRut, sanitizeRutInput } from "@/lib/auth/rut";
import { safeWidth, touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type {
  CompanyAgreementLookupResult,
  CompanyAgreementRecord,
} from "@/types/company-agreement";
import { useOptionalCompanyAgreementContext } from "./company-agreement-context";

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={joinClasses("size-4", className)}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 10v5M12 8h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={joinClasses(
        "size-4 shrink-0 transition-transform duration-200",
        expanded && "rotate-180",
      )}
      aria-hidden
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
      <path
        d="M12 3l1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3zM5 17l.8 2.6L8.4 20l-2.6.8L5 23.4l-.8-2.6L1.6 20l2.6-.8L5 17zM19 14l.6 1.8L21.4 16l-1.8.6L19 18.4l-.6-1.8L16.6 16l1.8-.6L19 14z"
        fill="currentColor"
      />
    </svg>
  );
}

function formatDiscountPercent(value: number | null): string {
  if (value == null) return "un beneficio preferencial";
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("es-CL", { maximumFractionDigits: 2 });
  return `hasta un ${formatted}% de descuento`;
}

function formatAgreementRut(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return value.trim();
}

function formatIsapreBenefitLabel(
  isapreName: string | null | undefined,
): string | null {
  if (!isapreName?.trim()) return null;
  return `Beneficio aplicable a planes ${isapreName.trim()}.`;
}

function formatDiscountPercentValue(value: number | null): string {
  if (value == null) return "Beneficio preferencial";
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("es-CL", { maximumFractionDigits: 2 });
  return `${formatted}%`;
}

function AgreementMatchHoverDetails({
  agreement,
}: {
  agreement: CompanyAgreementRecord;
}) {
  const rut = formatAgreementRut(agreement.companyRutRaw) ?? agreement.companyRut;
  const isapre = agreement.isapreName?.trim() || "No especificada";

  return (
    <div
      className="pointer-events-none absolute left-0 top-full z-40 mt-1.5 w-[min(100%,20rem)] rounded-lg border border-emerald-200/90 bg-white px-3 py-2.5 text-[11px] text-emerald-950 opacity-0 shadow-lg ring-1 ring-emerald-900/5 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
      role="tooltip"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800/80">
        Detalle del convenio
      </p>
      <dl className="mt-1.5 space-y-1">
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted">Empresa</dt>
          <dd className="min-w-0 font-semibold text-foreground">
            {agreement.companyName}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted">RUT</dt>
          <dd className="min-w-0 font-medium tabular-nums text-foreground">
            {rut}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted">Descuento</dt>
          <dd className="min-w-0 font-semibold text-emerald-800">
            {formatDiscountPercentValue(agreement.discountPercent)}
            {agreement.discountPercent != null ? " sobre el plan" : ""}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted">Isapre</dt>
          <dd className="min-w-0 font-semibold text-foreground">{isapre}</dd>
        </div>
      </dl>
      {agreement.discountPercent != null ? (
        <p className="mt-2 border-t border-emerald-100 pt-1.5 text-[10px] leading-snug text-muted">
          {COMPANY_AGREEMENT_DISCOUNT_DISCLAIMER}
        </p>
      ) : null}
    </div>
  );
}

export type CompanyAgreementSource = "public" | "executive" | "embed";
export type CompanyAgreementVariant = "standalone" | "inline";
export type CompanyAgreementFields = "all" | "companyRutOnly";

export interface CompanyAgreementValidationSectionProps {
  compactEmbed?: boolean;
  source?: CompanyAgreementSource;
  partnerEntitySlug?: string;
  className?: string;
  /** Integrado en la tarjeta del buscador principal. */
  variant?: CompanyAgreementVariant;
  /** `companyRutOnly`: toolbar ejecutiva compacta (solo RUT empresa). */
  fields?: CompanyAgreementFields;
}

type FieldKey = "userRut" | "email" | "phone" | "companyRut";

const FIELD_LABELS: Record<FieldKey, string> = {
  userRut: "Tu RUT",
  email: "Correo",
  phone: "Teléfono",
  companyRut: "RUT empresa",
};

const FIELD_PLACEHOLDERS: Record<FieldKey, string> = {
  userRut: "12.345.678-9",
  email: "correo@ejemplo.cl",
  phone: "+56 9 1234 5678",
  companyRut: "76.543.210-K",
};

const INLINE_TITLE_BEFORE = "¿Tu empresa tiene ";
const INLINE_TITLE_WORD = "convenio";
const INLINE_TITLE_AFTER = "? Obtén";
const INLINE_DISCOUNT_PILL = "hasta 10% de descuento";
const INLINE_TITLE_TAIL = "en tu plan.";

const inlineFieldClass = joinClasses(
  "h-9 w-full min-w-0 rounded-lg border-0 bg-white px-2.5 text-sm shadow-sm ring-1 ring-border/80 placeholder:text-muted/70 focus:ring-2 focus:ring-primary/40",
);

export function CompanyAgreementValidationSection({
  compactEmbed = false,
  source = "public",
  partnerEntitySlug,
  className,
  variant = "standalone",
  fields = "all",
}: CompanyAgreementValidationSectionProps) {
  const isInline = variant === "inline";
  const companyRutOnly = fields === "companyRutOnly";
  const [expanded, setExpanded] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [userRut, setUserRut] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyRut, setCompanyRut] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldKey, string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [agreementMatch, setAgreementMatch] =
    useState<CompanyAgreementRecord | null>(null);
  const [agreementNotFound, setAgreementNotFound] = useState(false);

  const agreementContext = useOptionalCompanyAgreementContext();

  const resolvedSource: CompanyAgreementSource = compactEmbed ? "embed" : source;
  /** Público/widget: sin revelar match, sin correo de inquiry ni descuento en contexto. */
  const isPublicOrEmbed = resolvedSource !== "executive";

  useEffect(() => {
    if (!agreementContext || isPublicOrEmbed) return;

    if (agreementMatch) {
      agreementContext.setValidatedAgreement({
        companyRut: agreementMatch.companyRut,
        companyRutRaw: agreementMatch.companyRutRaw,
        companyName: agreementMatch.companyName,
        discountPercent: agreementMatch.discountPercent,
        isapreId: agreementMatch.isapreId,
        isapreName: agreementMatch.isapreName,
      });
      return;
    }

    agreementContext.setValidatedAgreement(null);
  }, [agreementMatch, agreementContext, isPublicOrEmbed]);

  useEffect(() => {
    if (!agreementContext) return;

    const hasAny =
      Boolean(userRut.trim()) ||
      Boolean(email.trim()) ||
      Boolean(phone.trim()) ||
      Boolean(companyRut.trim());

    if (!hasAny) {
      agreementContext.setInquiryDraft(null);
      return;
    }

    agreementContext.setInquiryDraft({
      userRut,
      email,
      phone,
      companyRut,
    });
  }, [agreementContext, userRut, email, phone, companyRut]);

  const handleRutChange = useCallback(
    (field: "userRut" | "companyRut", value: string) => {
      const next = sanitizeRutInput(value);
      if (field === "userRut") setUserRut(next);
      else setCompanyRut(next);
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
      setSubmitError(null);
      setSubmitted(false);
      if (field === "companyRut") {
        setAgreementMatch(null);
        setAgreementNotFound(false);
      }
    },
    [],
  );

  const handleFieldChange = useCallback((field: FieldKey, value: string) => {
    if (field === "userRut") setUserRut(value);
    if (field === "email") setEmail(value);
    if (field === "phone") setPhone(value);
    if (field === "companyRut") setCompanyRut(value);
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(null);
    setSubmitted(false);
    if (field === "companyRut") {
      setAgreementMatch(null);
      setAgreementNotFound(false);
    }
  }, []);

  async function findCompanyAgreement(): Promise<CompanyAgreementRecord | null> {
    if (!companyRut.trim()) return null;

    const params = new URLSearchParams({ rut: companyRut.trim() });
    const response = await fetch(`/api/company-agreements/lookup?${params}`);
    const payload = (await response.json().catch(() => null)) as
      | (CompanyAgreementLookupResult & { error?: string })
      | null;

    if (!response.ok) {
      throw new Error(
        "No pudimos validar el convenio en este momento. Intenta nuevamente.",
      );
    }

    return payload?.matches[0] ?? null;
  }

  function handleNewQuery() {
    setUserRut("");
    setEmail("");
    setPhone("");
    setCompanyRut("");
    setFieldErrors({});
    setSubmitError(null);
    setSubmitting(false);
    setSubmitted(false);
    setAgreementMatch(null);
    setAgreementNotFound(false);
    if (isInline) setExpanded(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setAgreementMatch(null);
    setAgreementNotFound(false);
    setSubmitted(false);

    const values = { userRut, email, phone, companyRut };

    if (!companyRut.trim()) {
      setSubmitError(
        "Ingresa el RUT de tu empresa para validar si cuenta con convenio.",
      );
      return;
    }

    if (isPublicOrEmbed) {
      if (!isValidRut(companyRut)) {
        setFieldErrors({ companyRut: "RUT no válido." });
        return;
      }

      const optionalErrors = validateCompanyAgreementFields(values);
      if (Object.keys(optionalErrors).length > 0) {
        setFieldErrors(optionalErrors);
        return;
      }

      // Público/embed: no lookup, no correo de inquiry, no revelar match.
      setSubmitting(true);
      try {
        setSubmitted(true);
        setFieldErrors({});
        if (isInline) setExpanded(true);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (companyRutOnly) {
      if (!isValidRut(companyRut)) {
        setFieldErrors({ companyRut: "RUT no válido." });
        return;
      }
    } else {
      if (!hasCompanyAgreementInquiryData(values)) {
        setSubmitError(
          "Ingresa el RUT de tu empresa para validar si cuenta con convenio.",
        );
        return;
      }

      const errors = validateCompanyAgreementFields(values);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
    }

    setSubmitting(true);

    try {
      const match = await findCompanyAgreement();
      if (match) {
        setAgreementMatch(match);
        setFieldErrors({});
        if (isInline) setExpanded(true);
        return;
      }

      setAgreementNotFound(true);

      const wantsFollowUp =
        !companyRutOnly &&
        Boolean(email.trim() || phone.trim() || userRut.trim());

      if (!wantsFollowUp) {
        if (isInline) setExpanded(true);
        return;
      }

      const response = await fetch("/api/company-agreement-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          source: resolvedSource,
          cotizadorUrl:
            typeof window !== "undefined" ? window.location.href : undefined,
          partnerEntitySlug,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "No pudimos registrar tu consulta. Intenta nuevamente.",
        );
      }

      setSubmitted(true);
      setFieldErrors({});
      if (isInline) setExpanded(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No pudimos validar el convenio. Intenta nuevamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function getFieldValue(field: FieldKey): string {
    if (field === "userRut") return userRut;
    if (field === "email") return email;
    if (field === "phone") return phone;
    return companyRut;
  }

  function renderFieldInput(
    field: FieldKey,
    options?: { inline?: boolean; toolbar?: boolean },
  ) {
    const inline = options?.inline ?? false;
    const toolbar = options?.toolbar ?? false;

    return (
      <label
        key={field}
        className={joinClasses(
          "block min-w-0",
          toolbar ? undefined : inline ? "space-y-1" : "space-y-1.5",
        )}
      >
        <span
          data-convenio-field-label
          className={joinClasses(
            toolbar
              ? "mb-1 block text-xs font-medium text-muted"
              : "text-xs font-semibold text-foreground/90",
            !toolbar && compactEmbed && "max-md:text-[11px]",
          )}
        >
          {FIELD_LABELS[field]}
        </span>
        <input
          type={field === "email" ? "email" : "text"}
          inputMode={
            field === "phone" ? "tel" : field.includes("Rut") ? "text" : undefined
          }
          autoComplete={
            field === "email"
              ? "email"
              : field === "phone"
                ? "tel"
                : field === "userRut"
                  ? "off"
                  : "organization"
          }
          value={getFieldValue(field)}
          onChange={(event) => {
            const value = event.target.value;
            if (field === "userRut" || field === "companyRut") {
              handleRutChange(field, value);
              return;
            }
            handleFieldChange(field, value);
          }}
          placeholder={FIELD_PLACEHOLDERS[field]}
          className={joinClasses(
            toolbar
              ? joinClasses("h-10 w-full rounded-lg px-3 text-sm", ui.input)
              : inline
                ? joinClasses(
                    inlineFieldClass,
                    compactEmbed && "max-md:h-8 max-md:text-xs",
                  )
                : joinClasses(
                    "h-10 w-full rounded-xl px-3 text-sm",
                    compactEmbed && "max-md:h-9 max-md:rounded-lg max-md:text-xs",
                    ui.input,
                  ),
            fieldErrors[field] && "ring-red-500/60 focus:ring-red-500/40",
          )}
          aria-label={FIELD_LABELS[field]}
          aria-invalid={Boolean(fieldErrors[field])}
          aria-describedby={
            fieldErrors[field] ? `company-agreement-${field}-error` : undefined
          }
        />
        {fieldErrors[field] ? (
          <span
            id={`company-agreement-${field}-error`}
            className="text-[10px] text-red-700"
          >
            {fieldErrors[field]}
          </span>
        ) : null}
      </label>
    );
  }

  function renderNewQueryButton(className?: string) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={handleNewQuery}
        className={joinClasses(
          "shrink-0 border border-current/15 bg-white/70 text-xs font-semibold hover:bg-white",
          className,
        )}
      >
        {companyRutOnly ? "Otra consulta" : "Hacer otra consulta"}
      </Button>
    );
  }

  const statusMessage =
    isPublicOrEmbed && submitted ? (
      <div
        className={joinClasses(
          "rounded-xl border border-emerald-400/80 bg-emerald-100 px-3 py-3 text-sm text-emerald-950 shadow-sm",
          isInline && "mb-2",
          compactEmbed && "max-md:text-xs",
        )}
        role="status"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-emerald-800">
              Revisaremos tu consulta de convenio
            </p>
            <p className="mt-1 text-xs leading-relaxed text-emerald-950/90">
              Para entregarte la información de tu convenio, solicita cualquier
              plan desde el cotizador. Un ejecutivo se contactará contigo y te
              orientará con el beneficio que corresponda.
            </p>
          </div>
          {renderNewQueryButton(
            "border-emerald-400/70 text-emerald-900 hover:bg-white hover:text-emerald-950",
          )}
        </div>
      </div>
    ) : submitted ? (
      <div
        className={joinClasses(
          "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-950",
          isInline && "mb-2",
          compactEmbed && "max-md:text-xs",
        )}
        role="status"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold">Consulta registrada</p>
            <p className="mt-1 text-xs leading-relaxed text-emerald-900/90">
              No encontramos un convenio activo para el RUT ingresado, pero
              recibimos tus datos. Te contactaremos si corresponde un beneficio.
            </p>
          </div>
          {renderNewQueryButton("text-emerald-900 hover:text-emerald-950")}
        </div>
      </div>
    ) : agreementMatch ? (
      <div
        className={joinClasses(
          companyRutOnly
            ? "group relative cursor-help rounded-md bg-emerald-50/90 px-2 py-1.5 text-[11px] text-emerald-950 ring-1 ring-emerald-200/70"
            : "rounded-xl border border-emerald-300/80 bg-emerald-50 px-3 py-3 text-sm text-emerald-950 shadow-sm",
          isInline && !companyRutOnly && "mb-2",
          compactEmbed && "max-md:text-xs",
        )}
        role="status"
        tabIndex={companyRutOnly ? 0 : undefined}
        aria-describedby={
          companyRutOnly ? "executive-agreement-hover-details" : undefined
        }
      >
        <div
          className={joinClasses(
            "flex gap-2",
            companyRutOnly
              ? "items-center justify-between"
              : "flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-3",
          )}
        >
          <div className="min-w-0">
            <p
              className={joinClasses(
                "font-semibold text-emerald-800",
                companyRutOnly && "text-[11px] leading-tight",
              )}
            >
              {companyRutOnly
                ? "Convenio confirmado"
                : "Convenio vigente confirmado"}
            </p>
            <p
              className={joinClasses(
                "leading-relaxed text-emerald-950/90",
                companyRutOnly ? "mt-0.5 truncate text-[11px]" : "mt-1 text-xs",
              )}
            >
              <span className="font-semibold text-emerald-950">
                {agreementMatch.companyName}
              </span>
              {formatAgreementRut(agreementMatch.companyRutRaw) ? (
                <> · RUT {formatAgreementRut(agreementMatch.companyRutRaw)}</>
              ) : null}
              {" · "}
              {formatDiscountPercent(agreementMatch.discountPercent)}
              {formatIsapreBenefitLabel(agreementMatch.isapreName)
                ? ` ${formatIsapreBenefitLabel(agreementMatch.isapreName)}`
                : ""}
              {!companyRutOnly
                ? " Puedes continuar cotizando con este beneficio aplicable."
                : null}
            </p>
            {agreementMatch.discountPercent != null && !companyRutOnly ? (
              <p className="mt-2 text-[11px] leading-relaxed text-emerald-900/75">
                {COMPANY_AGREEMENT_DISCOUNT_DISCLAIMER}
              </p>
            ) : null}
          </div>
          {renderNewQueryButton(
            companyRutOnly
              ? "h-7 border-emerald-300/60 px-2 text-[10px] text-emerald-900 hover:bg-white hover:text-emerald-950"
              : "border-emerald-300/70 text-emerald-900 hover:bg-white hover:text-emerald-950",
          )}
        </div>
        {companyRutOnly ? (
          <div id="executive-agreement-hover-details">
            <AgreementMatchHoverDetails agreement={agreementMatch} />
          </div>
        ) : null}
      </div>
    ) : agreementNotFound ? (
      <div
        className={joinClasses(
          companyRutOnly
            ? "rounded-md bg-amber-50/90 px-2 py-1.5 text-[11px] text-amber-950 ring-1 ring-amber-200/70"
            : "rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950",
          isInline && !companyRutOnly && "mb-2",
          compactEmbed && "max-md:text-xs",
        )}
        role="status"
      >
        <div
          className={joinClasses(
            "flex gap-2",
            companyRutOnly
              ? "items-center justify-between"
              : "flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
          )}
        >
          <div className="min-w-0">
            <p
              className={joinClasses(
                "font-semibold",
                companyRutOnly && "text-[11px] leading-tight",
              )}
            >
              Convenio no encontrado
            </p>
            <p
              className={joinClasses(
                "leading-relaxed text-amber-900/90",
                companyRutOnly ? "mt-0.5 text-[11px]" : "mt-1 text-xs",
              )}
            >
              {companyRutOnly
                ? "Sin convenio activo para este RUT. Prueba otro o sigue cotizando."
                : "No identificamos un convenio activo para el RUT de empresa ingresado. Puedes continuar cotizando con normalidad o dejarnos tus datos de contacto para una revisión manual."}
            </p>
          </div>
          {renderNewQueryButton(
            companyRutOnly
              ? "h-7 border-amber-300/60 px-2 text-[10px] text-amber-950 hover:text-amber-900"
              : "text-amber-950 hover:text-amber-900",
          )}
        </div>
      </div>
    ) : null;

  if (companyRutOnly) {
    const showCompactForm = !agreementMatch && !agreementNotFound;
    return (
      <div className={joinClasses("min-w-0", className)}>
        {showCompactForm ? (
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2"
            noValidate
          >
            <div className="min-w-0 flex-1 sm:w-36 sm:flex-none">
              {renderFieldInput("companyRut", { toolbar: true })}
            </div>
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              data-convenio-cta
              disabled={submitting}
              className="h-10 shrink-0 rounded-lg border-0 px-3.5 text-xs font-semibold text-white shadow-sm"
            >
              {submitting ? "Validando…" : "Validar"}
            </Button>
          </form>
        ) : null}
        {statusMessage ? (
          <div className={showCompactForm ? "mt-1.5" : undefined}>
            {statusMessage}
          </div>
        ) : null}
        {submitError ? (
          <p
            className="mt-1 text-[11px] text-red-700"
            role="status"
          >
            {submitError}
          </p>
        ) : null}
      </div>
    );
  }

  const formContent = (
    <>
      {statusMessage}
      {!agreementMatch && !submitted ? (
        <form onSubmit={handleSubmit} className="space-y-2" noValidate>
          <div
            className={joinClasses(
              isInline
                ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end lg:gap-2"
                : "grid gap-3 sm:grid-cols-2",
              compactEmbed && "max-md:gap-2",
            )}
          >
            {(Object.keys(FIELD_LABELS) as FieldKey[]).map((field) =>
              renderFieldInput(field, { inline: isInline }),
            )}
            <div
              className={joinClasses(
                isInline
                  ? "sm:col-span-2 lg:col-span-1 lg:flex lg:justify-end"
                  : "sm:col-span-2 flex justify-end",
              )}
            >
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                data-convenio-cta
                disabled={submitting}
                className={joinClasses(
                  "w-full shrink-0 border-0 text-white shadow-sm lg:w-auto lg:min-w-[7.5rem]",
                  isInline && "h-9 rounded-lg px-4 text-xs",
                  compactEmbed && "max-md:h-8 max-md:px-3 max-md:text-[11px]",
                )}
              >
                {submitting ? "Validando…" : "Validar convenio"}
              </Button>
            </div>
          </div>

          {!isInline ? (
            <p
              className={joinClasses(
                "text-[11px] leading-relaxed text-muted",
                compactEmbed && "max-md:text-[10px]",
              )}
            >
              El RUT empresa es necesario para validar el convenio. Los demás
              campos son opcionales.
            </p>
          ) : null}

          {submitError ? (
            <p
              className={joinClasses(
                "rounded-lg bg-red-50 px-2.5 py-2 text-[11px] text-red-900 ring-1 ring-red-200/80",
                compactEmbed && "max-md:text-[10px]",
              )}
              role="status"
            >
              {submitError}
            </p>
          ) : null}
        </form>
      ) : null}
    </>
  );

  if (isInline) {
    return (
      <>
        <div
          data-embed-measure
          data-convenio-inline
          className={joinClasses(
            safeWidth,
            "border-t border-[var(--convenio-accent)]/25",
            compactEmbed ? "mt-2.5 pt-2.5" : "mt-3 pt-3",
            className,
          )}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              aria-controls="company-agreement-panel"
              className={joinClasses(
                "flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-left transition hover:bg-white/40",
                touchTarget,
                "min-h-10 lg:min-h-9",
              )}
            >
              <span
                data-convenio-title
                className={joinClasses(
                  "min-w-0 flex-1 font-semibold leading-snug text-[var(--convenio-accent)]",
                  compactEmbed
                    ? "text-xs max-md:text-[11px]"
                    : "text-sm sm:text-[15px]",
                )}
              >
                {INLINE_TITLE_BEFORE}
                <span data-convenio-word>{INLINE_TITLE_WORD}</span>
                {INLINE_TITLE_AFTER}{" "}
                <span data-convenio-discount>{INLINE_DISCOUNT_PILL}</span>{" "}
                {INLINE_TITLE_TAIL}
              </span>
              <span
                data-convenio-toggle
                className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[var(--convenio-accent)]"
              >
                {expanded ? "Ocultar" : "Consultar"}
                <ChevronIcon expanded={expanded} />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              aria-label="Más información sobre convenios empresa"
              data-convenio-info
              className={joinClasses(
                "inline-flex shrink-0 items-center justify-center rounded-full border border-[var(--convenio-accent)]/30 text-[var(--convenio-accent)] transition hover:bg-[var(--convenio-accent-muted)]",
                "size-8",
                touchTarget,
              )}
            >
              <InfoIcon className="size-3.5" />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {expanded ? (
              <motion.div
                id="company-agreement-panel"
                key="company-agreement-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className={joinClasses("pt-2", compactEmbed && "pt-1.5")}>
                  {formContent}
                  <p className="mt-1.5 text-[10px] text-muted/90" data-convenio-hint>
                    El RUT empresa es necesario para validar. Los demás campos
                    son opcionales.
                  </p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {(submitted || agreementMatch || agreementNotFound) && !expanded ? (
            <div className="mt-2">{statusMessage}</div>
          ) : null}
        </div>

        <CompanyAgreementInfoModal
          open={infoOpen}
          onClose={() => setInfoOpen(false)}
          embedded={compactEmbed}
        />
      </>
    );
  }

  return (
    <>
      <section
        data-embed-measure
        aria-labelledby="company-agreement-title"
        className={joinClasses(
          safeWidth,
          "rounded-2xl border border-[var(--convenio-accent)]/25 bg-gradient-to-br from-[var(--convenio-accent-muted)] via-white to-[var(--convenio-accent-muted)] shadow-sm",
          compactEmbed ? "p-3 max-md:p-2.5" : "p-4 sm:p-5",
          className,
        )}
      >
        <div
          className={joinClasses(
            "flex items-start gap-3",
            compactEmbed && "max-md:gap-2",
          )}
        >
          <span
            className={joinClasses(
              "inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--convenio-accent-muted)] text-[var(--convenio-accent)]",
              compactEmbed ? "size-9 max-md:size-8" : "size-10",
            )}
            aria-hidden
          >
            <SparkIcon />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => setExpanded((open) => !open)}
                aria-expanded={expanded}
                className="min-w-0 flex-1 text-left"
              >
                <h2
                  id="company-agreement-title"
                  className={joinClasses(
                    "font-bold leading-snug text-[var(--convenio-accent)]",
                    compactEmbed
                      ? "text-sm max-md:text-[13px]"
                      : "text-base sm:text-lg",
                  )}
                >
                  {INLINE_TITLE_BEFORE}
                  <span data-convenio-word>{INLINE_TITLE_WORD}</span>
                  {INLINE_TITLE_AFTER}{" "}
                  <span data-convenio-discount>{INLINE_DISCOUNT_PILL}</span>{" "}
                  {INLINE_TITLE_TAIL}
                </h2>
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[var(--convenio-accent)]">
                  {expanded ? "Ocultar formulario" : "Consultar convenio"}
                  <ChevronIcon expanded={expanded} />
                </span>
              </button>

              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                aria-label="Más información sobre convenios empresa"
                className={joinClasses(
                  "inline-flex shrink-0 items-center justify-center rounded-full border border-[var(--convenio-accent)]/30 text-[var(--convenio-accent)] transition hover:bg-[var(--convenio-accent-muted)]",
                  compactEmbed ? "size-8" : "size-9",
                  touchTarget,
                )}
              >
                <InfoIcon />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className={joinClasses("pt-3", compactEmbed && "pt-2")}>
                    {formContent}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {(submitted || agreementMatch || agreementNotFound) && !expanded ? (
              <div className="mt-2">{statusMessage}</div>
            ) : null}
          </div>
        </div>
      </section>

      <CompanyAgreementInfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        embedded={compactEmbed}
      />
    </>
  );
}
