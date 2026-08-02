"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { IsapreLogo } from "@/components/plan-card/isapre-logo";
import {
  buildPlanFinalPriceQuote,
  formatPlanClp,
  formatQuotedUf,
  PLAN_TYPE_LABELS,
  resolveCommercialPlanName,
  resolvePrimaryPlanType,
} from "@/domain";
import { SINGLE_PERSON_AGE_SAMPLES } from "@/lib/plan-price-by-age";
import {
  accent,
  accentIconClass,
  horizontalScrollRail,
  planTypeBadgeTone,
  safeWidth,
  statusBadgeToneClass,
  touchTarget,
  ui,
} from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import { usePlanDetail } from "@/hooks/use-plan-detail";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { usePartnerEntity } from "@/components/partner/partner-entity-provider";
import type {
  BeneficiaryGroupSummary,
  FamilyBeneficiariesState,
} from "@/domain";
import type { HealthPlanSummary } from "@/domain";
import type { QuoteCriteria } from "./public-quote-criteria-bar";
import { notifyCotizacionByEmail } from "@/lib/cotizacion-notify/client";
import { useCompanyAgreementContext } from "@/components/cotizador/company-agreement";
import { toCotizacionNotifyConvenio } from "@/lib/company-agreements/cotizacion-notify-convenio";
import {
  buildPlanAgreementPriceDisplay,
  resolveAgreementDiscountPercentForPlan,
  resolveAgreementPlanMapping,
  buildPlanAgreementPriceDisplayWithMapping,
} from "@/lib/company-agreements/plan-price-discount";
import type {
  ParsedCotizadorDeepLink,
  SolicitarModalTab,
} from "@/lib/deep-link/parse-cotizador-url";
import type { QuoteSortKey } from "@/lib/quote-criteria-options";
import type { CurrencyDisplay } from "./public-results-toolbar";
import type { DashboardFiltersState } from "@/types/filters";
import { ModalPlanOverviewPanel } from "./modal-plan-overview-panel";
import { ModalPricePanel } from "./modal-price-panel";
import {
  isValidRequestEmail,
  ModalRequestForm,
  normalizeRequestPhoneDigits,
} from "./modal-request-form";

export interface ContractPlanModalProps {
  open: boolean;
  planSummary: HealthPlanSummary | null;
  beneficiarySummary: BeneficiaryGroupSummary;
  dependents: FamilyBeneficiariesState["dependents"];
  ufToClp: number;
  criteria: QuoteCriteria;
  filters: DashboardFiltersState;
  searchText: string;
  sortKey: QuoteSortKey;
  currency: CurrencyDisplay;
  deepLink: ParsedCotizadorDeepLink;
  initialTab?: SolicitarModalTab;
  onClose: () => void;
  /** Widget embebido: overlay fijo sobre el iframe (portal a body). */
  embedded?: boolean;
}

type ModalTabId = "overview" | "price" | "request";

const MODAL_TABS: {
  id: ModalTabId;
  label: string;
  icon: string;
  tone: "primary" | "secondary" | "warning";
}[] = [
  { id: "overview", label: "Vista general", icon: "◎", tone: "secondary" },
  { id: "price", label: "Precio", icon: "$", tone: "primary" },
  { id: "request", label: "Solicitar", icon: "✉", tone: "primary" },
];

const BENEFITS = [
  {
    title: "Sin costo adicional",
    description: "La asesoría y cotización no tienen cargo para ti.",
    icon: "✓",
    tone: "primary" as const,
  },
  {
    title: "Acompañamiento post-venta",
    description: "Te guiamos hasta la incorporación y después del contrato.",
    icon: "★",
    tone: "secondary" as const,
  },
  {
    title: "Cancelación gratuita",
    description: "Puedes desistir sin compromiso antes de firmar.",
    icon: "↺",
    tone: "warning" as const,
  },
] as const;

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function resolveChartHighlightAge(age: number | null): number | null {
  if (age === null) return null;
  return SINGLE_PERSON_AGE_SAMPLES.reduce((closest, sample) =>
    Math.abs(sample - age) < Math.abs(closest - age) ? sample : closest,
  );
}

export function ContractPlanModal({
  open,
  planSummary,
  beneficiarySummary,
  dependents,
  ufToClp,
  criteria,
  filters,
  searchText,
  sortKey,
  currency,
  deepLink,
  initialTab,
  onClose,
  embedded = false,
}: ContractPlanModalProps) {
  const [mounted, setMounted] = useState(false);
  const { plan: detailPlan, loading: detailLoading } = usePlanDetail(
    planSummary?.unique_code ?? null,
    open,
  );
  const { entity: partnerEntity } = usePartnerEntity();
  const { validatedAgreement, inquiryDraft } = useCompanyAgreementContext();
  const convenioEmpresa = toCotizacionNotifyConvenio(validatedAgreement);
  const inquiryDraftRef = useRef(inquiryDraft);
  inquiryDraftRef.current = inquiryDraft;
  const [activeTab, setActiveTab] = useState<ModalTabId>("overview");
  const [submitted, setSubmitted] = useState(false);
  const [emailNotifyFailed, setEmailNotifyFailed] = useState(false);
  const [emailNotifyError, setEmailNotifyError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [name, setName] = useState("");
  const [rut, setRut] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  useEffect(() => {
    if (!open) {
      setActiveTab("overview");
      setSubmitted(false);
      setEmailNotifyFailed(false);
      setEmailNotifyError(null);
      setSubmitting(false);
      setSubmitError(null);
      setValidationErrors([]);
      setAttemptedSubmit(false);
      setName("");
      setRut("");
      setEmail("");
      setPhone("");
      setAcceptPrivacy(false);
      return;
    }

    const draft = inquiryDraftRef.current;
    setActiveTab(initialTab ?? "overview");
    setSubmitted(false);
    setEmailNotifyFailed(false);
    setEmailNotifyError(null);
    setSubmitting(false);
    setSubmitError(null);
    setValidationErrors([]);
    setAttemptedSubmit(false);
    // Prefill al abrir: deepLink gana; si no hay, borrador del convenio.
    // No reaccionar a cambios del draft mientras el modal está abierto.
    setName(deepLink.requestPrefill?.name ?? "");
    setRut(
      deepLink.requestPrefill?.rut?.trim() || draft?.userRut?.trim() || "",
    );
    setEmail(
      deepLink.requestPrefill?.email?.trim() ||
        deepLink.email?.trim() ||
        draft?.email?.trim() ||
        "",
    );
    setPhone(
      deepLink.requestPrefill?.phone?.trim() || draft?.phone?.trim() || "",
    );
    setAcceptPrivacy(false);
  }, [open, initialTab, deepLink.requestPrefill, deepLink.email]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const agreementMapping = useMemo(() => {
    if (!planSummary) return null;
    return resolveAgreementPlanMapping(
      planSummary.unique_code,
      planSummary.isapre,
      validatedAgreement,
    );
  }, [planSummary, validatedAgreement]);

  const standardQuote = useMemo(() => {
    if (!planSummary) return null;
    return buildPlanFinalPriceQuote(
      planSummary.base_price_uf,
      beneficiarySummary,
      ufToClp,
      planSummary.ges_premium_uf,
    );
  }, [planSummary, beneficiarySummary, ufToClp]);

  const convenioQuote = useMemo(() => {
    if (!planSummary || !agreementMapping) return null;
    return buildPlanFinalPriceQuote(
      agreementMapping.price,
      beneficiarySummary,
      ufToClp,
      planSummary.ges_premium_uf,
    );
  }, [planSummary, agreementMapping, beneficiarySummary, ufToClp]);

  /** Precios con convenio (solo para notify/API interno; no se muestran en UI pública). */
  const agreementPrices = useMemo(() => {
    if (!planSummary || !standardQuote) return null;
    if (agreementMapping && convenioQuote) {
      return buildPlanAgreementPriceDisplayWithMapping(standardQuote, convenioQuote);
    }
    const discountPercent = resolveAgreementDiscountPercentForPlan(
      planSummary.isapre,
      validatedAgreement,
    );
    return buildPlanAgreementPriceDisplay(standardQuote, discountPercent);
  }, [validatedAgreement, planSummary, agreementMapping, standardQuote, convenioQuote]);

  /** UI pública: siempre precio de lista, sin % ni tachado de convenio. */
  const uiPrices = useMemo(() => {
    if (!standardQuote) return null;
    return buildPlanAgreementPriceDisplay(standardQuote, null);
  }, [standardQuote]);

  const priceQuote = standardQuote;
  const notifyPriceQuote = convenioQuote ?? standardQuote;

  const chartHighlightAge = useMemo(
    () => resolveChartHighlightAge(beneficiarySummary.contributor.age),
    [beneficiarySummary.contributor.age],
  );

  if (!planSummary || !priceQuote || !uiPrices || !agreementPrices || !notifyPriceQuote) {
    return null;
  }

  const summary = planSummary;
  const quote = notifyPriceQuote;

  const planType = resolvePrimaryPlanType(summary);
  const planTypeLabel = PLAN_TYPE_LABELS[planType];
  const badgeTone = statusBadgeToneClass[planTypeBadgeTone[planType]];
  const commercialName = resolveCommercialPlanName(summary);

  function collectValidationErrors(): string[] {
    const errors: string[] = [];

    if (!name.trim()) {
      errors.push("Ingresa tu nombre y apellido.");
    }
    if (!rut.trim()) {
      errors.push("Ingresa tu RUT.");
    } else if (rut.replace(/\D/g, "").length < 7) {
      errors.push("El RUT ingresado no parece válido.");
    }
    if (!email.trim()) {
      errors.push("Ingresa tu correo electrónico.");
    } else if (!isValidRequestEmail(email)) {
      errors.push("Ingresa un correo electrónico válido.");
    }
    if (!phone.trim()) {
      errors.push("Ingresa tu teléfono de contacto.");
    } else if (normalizeRequestPhoneDigits(phone).length < 8) {
      errors.push("Ingresa un teléfono válido (mínimo 8 dígitos).");
    }
    if (!acceptPrivacy) {
      errors.push(
        "Debes autorizar el tratamiento de tus datos personales para continuar.",
      );
    }

    return errors;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setAttemptedSubmit(true);
    setSubmitError(null);

    const errors = collectValidationErrors();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    setSubmitting(true);

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode: summary.unique_code,
          fullName: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          rut: rut.trim(),
          region: criteria.region || null,
          sex: criteria.sex || null,
          monthlyIncome: criteria.monthlyIncome || null,
          contributorAge: beneficiarySummary.contributor.age,
          dependentsCount: beneficiarySummary.dependents.length,
          dependentAges: beneficiarySummary.dependents
            .map((dependent) => dependent.age)
            .filter((age): age is number => age !== null),
          finalPriceUf: quote.finalPriceUf,
          finalPriceClp: quote.finalPriceClp,
          ufValue: ufToClp,
          beneficiaryCount: beneficiarySummary.beneficiaryCount,
          totalFactors: beneficiarySummary.totalFactors,
          quoteReason: "Solicitud desde cotizador público",
          partnerEntitySlug: partnerEntity?.slug ?? deepLink.entidad ?? null,
          partnerEntityName: partnerEntity?.name ?? null,
          companyAgreementRut: convenioEmpresa?.rutEmpresa ?? null,
          companyAgreementName: convenioEmpresa?.nombreEmpresa ?? null,
          companyAgreementDiscount: convenioEmpresa?.descuentoPercent ?? null,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "No se pudo enviar la solicitud.");
      }

      try {
        await notifyCotizacionByEmail({
          email: email.trim(),
          criteria,
          beneficiarySummary,
          filters,
          searchText,
          sortKey,
          currency,
          deepLink,
          plan: summary,
          priceQuote: quote,
          agreementPrices,
          partnerEntitySlug: partnerEntity?.slug ?? deepLink.entidad ?? null,
          partnerEntityName: partnerEntity?.name ?? null,
          partnerEntityTheme: partnerEntity?.theme ?? null,
          partnerEntityLogoUrl: partnerEntity?.logoUrl ?? null,
          solicitante: {
            nombre: name.trim(),
            rut: rut.trim() || undefined,
            telefono: phone.trim() || undefined,
          },
          convenioEmpresa,
        });
        setEmailNotifyFailed(false);
        setEmailNotifyError(null);
      } catch (notifyError) {
        setEmailNotifyFailed(true);
        setEmailNotifyError(
          notifyError instanceof Error
            ? notifyError.message
            : "No se pudo enviar el correo de confirmación.",
        );
        console.error(
          "La solicitud se guardó, pero falló el envío de correos:",
          notifyError,
        );
      }

      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la solicitud. Intenta nuevamente o contáctanos.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const overlayZ = embedded ? "z-[110]" : "z-50";

  const modalLayer = (
    <AnimatePresence>
      {open ? (
        <motion.div
          {...(embedded ? { "data-embed-overlay": "contract-modal" } : {})}
          className={joinClasses(
            "fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4",
            embedded ? "px-2 py-2 sm:px-3" : "",
            overlayZ,
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-primary-dark/55 backdrop-blur-[3px]"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contract-plan-title"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className={joinClasses(
              safeWidth,
              "relative z-10 flex min-h-0 w-full max-w-full max-h-[min(96dvh,100svh)] flex-col overflow-hidden overscroll-none rounded-t-2xl border bg-white shadow-2xl sm:max-h-[92dvh] sm:max-w-6xl sm:rounded-2xl",
              ui.border,
            )}
          >
            <div
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary/70 to-accent-warning/80"
              aria-hidden
            />

            <div className="flex shrink-0 items-center justify-end px-3 pb-0 pt-2 sm:px-5 sm:pt-2.5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modal"
                className={joinClasses(
                  "rounded-full text-muted transition hover:bg-surface-hover hover:text-foreground",
                  touchTarget,
                )}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="shrink-0 px-4 pb-5 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
              <div
                className={joinClasses(
                  "grid items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.15fr)_auto] sm:gap-x-8 sm:gap-y-0 lg:gap-x-10",
                  safeWidth,
                )}
              >
                <div className="flex min-w-0 items-center gap-3 sm:w-[9.5rem] sm:flex-col sm:items-start sm:gap-2.5">
                  <IsapreLogo
                    isapre={summary.isapre}
                    size="md"
                    className="!border-0 !shadow-none"
                  />
                  <p className="truncate text-sm font-bold leading-snug text-primary-dark">
                    {summary.isapre}
                  </p>
                </div>

                <div className="min-w-0 space-y-2">
                  <span
                    className={joinClasses(
                      "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      badgeTone,
                    )}
                  >
                    {planTypeLabel}
                  </span>
                  <h2
                    id="contract-plan-title"
                    className="text-xl font-bold leading-[1.15] tracking-tight text-primary-dark sm:text-[1.65rem]"
                  >
                    {commercialName}
                  </h2>
                  <p className="font-mono text-[11px] tracking-wide text-muted/80">
                    {summary.unique_code}
                  </p>
                </div>

                <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
                  <span
                    className={joinClasses(
                      "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full sm:mt-0 sm:size-11",
                      accentIconClass.primary,
                    )}
                    aria-hidden
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="size-[1.15rem]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3 5 6.5v5.2c0 4.1 2.8 7.8 7 8.8 4.2-1 7-4.7 7-8.8V6.5L12 3Z" />
                      <path d="m9.2 12 1.9 1.9 3.7-3.8" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold leading-snug text-primary-dark">
                      Conoce tu plan
                    </p>
                    <p className="mt-1.5 max-w-[17.5rem] text-[13px] leading-relaxed text-muted">
                      Revisa las coberturas y características principales de
                      este plan.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl bg-primary px-7 py-5 text-center text-primary-foreground sm:min-h-[7.25rem] sm:min-w-[14.5rem] sm:px-8">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                    Precio estimado mensual
                  </p>
                  <p className="mt-2.5 text-[1.45rem] font-bold leading-none tracking-tight sm:text-[1.65rem]">
                    Desde {formatPlanClp(uiPrices.displayFinalPriceClp)}
                    <span className="ml-1.5 text-sm font-semibold text-white/80">
                      /mes
                    </span>
                  </p>
                  <span className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tabular-nums text-white">
                    {formatQuotedUf(uiPrices.displayFinalPriceUf)}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={joinClasses(
                horizontalScrollRail,
                "flex shrink-0 gap-1 border-b px-4 py-2 sm:px-6",
              )}
              role="tablist"
              aria-label="Secciones del plan"
            >
              {MODAL_TABS.map((tab) => {
                const active = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={joinClasses(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition",
                      active
                        ? "bg-primary/10 text-primary-dark ring-1 ring-primary/20"
                        : "text-muted hover:bg-surface-hover/80",
                    )}
                  >
                    <span
                      className={joinClasses(
                        "flex size-5 items-center justify-center rounded-md text-[10px]",
                        active
                          ? accentIconClass[tab.tone]
                          : "bg-surface-hover text-muted",
                      )}
                      aria-hidden
                    >
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
              {submitted ? (
                <div className="space-y-4 px-6 py-12 text-center">
                  <div
                    className={joinClasses(
                      "mx-auto flex size-16 items-center justify-center rounded-full text-2xl",
                      accentIconClass.primary,
                    )}
                  >
                    ✓
                  </div>
                  <p className="text-xl font-bold text-primary-dark">
                    Solicitud enviada correctamente
                  </p>
                  <p className="mx-auto max-w-md text-sm leading-relaxed text-muted">
                    Tu información fue cargada correctamente. Un ejecutivo
                    especializado de Isapres Premium se pondrá en contacto
                    contigo próximamente para entregarte el precio final y
                    acompañarte en tu incorporación a {summary.isapre}.
                  </p>
                  {emailNotifyFailed ? (
                    <p
                      className="mx-auto mt-4 max-w-md rounded-lg border border-accent-warning/40 bg-warning-muted px-4 py-3 text-sm text-accent-warning-foreground"
                      role="alert"
                    >
                      Tu solicitud quedó registrada, pero no pudimos enviar el
                      correo de confirmación en este momento.
                      {emailNotifyError ? (
                        <>
                          {" "}
                          <span className="block mt-2 text-xs text-muted">
                            {emailNotifyError}
                          </span>
                        </>
                      ) : null}
                      {" "}
                      Revisa tu bandeja más tarde o contáctanos si no recibes
                      respuesta.
                    </p>
                  ) : (
                    <p className="mx-auto mt-3 max-w-md text-sm font-medium text-primary">
                      Te enviamos un correo de confirmación a {email.trim()}. Si
                      no lo ves en unos minutos, revisa tu carpeta de spam o
                      correo no deseado.
                    </p>
                  )}
                  <Button type="button" onClick={onClose} className="mt-2">
                    Cerrar
                  </Button>
                </div>
              ) : activeTab === "overview" ? (
                detailLoading || !detailPlan ? (
                  <p className="px-6 py-12 text-center text-sm text-muted">
                    Cargando coberturas del plan…
                  </p>
                ) : (
                  <ModalPlanOverviewPanel
                    plan={detailPlan}
                    name={name}
                    onNameChange={setName}
                    rut={rut}
                    onRutChange={setRut}
                    email={email}
                    onEmailChange={setEmail}
                    phone={phone}
                    onPhoneChange={setPhone}
                    acceptPrivacy={acceptPrivacy}
                    onAcceptPrivacyChange={setAcceptPrivacy}
                    attemptedSubmit={attemptedSubmit}
                    validationErrors={validationErrors}
                    submitError={submitError}
                    submitting={submitting}
                    onSubmit={handleSubmit}
                  />
                )
              ) : activeTab === "price" ? (
                <ModalPricePanel
                  basePriceUf={summary.base_price_uf}
                  ufToClp={ufToClp}
                  priceQuote={priceQuote}
                  highlightAge={chartHighlightAge}
                  beneficiarySummary={beneficiarySummary}
                  dependents={dependents}
                />
              ) : (
                <div className="grid gap-0 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
                  <aside className="space-y-4 border-b bg-bg-layout/40 p-4 sm:p-5 lg:border-b-0 lg:border-r">
                    <div
                      className={joinClasses(
                        "rounded-xl border border-primary/15 bg-primary/5 p-4",
                        accent.ringPrimary,
                      )}
                    >
                      <h3 className="text-sm font-bold text-primary-dark">
                        ¿Por qué Isapres Premium?
                      </h3>
                      <ul className="mt-3 space-y-3">
                        {BENEFITS.map((benefit) => (
                          <li key={benefit.title} className="flex gap-3">
                            <span
                              className={joinClasses(
                                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                accentIconClass[benefit.tone],
                              )}
                            >
                              {benefit.icon}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {benefit.title}
                              </p>
                              <p className="text-xs leading-relaxed text-muted">
                                {benefit.description}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div
                      className={joinClasses(
                        "rounded-xl border bg-white p-4",
                        accent.borderSecondary,
                      )}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                        Tu selección
                      </p>
                      <p className="mt-2 text-sm font-bold text-primary-dark">
                        {commercialName}
                      </p>
                      <p className="mt-2 text-lg font-bold text-foreground">
                        {formatPlanClp(uiPrices.displayFinalPriceClp)}
                        <span className="text-xs font-medium text-muted">
                          {" "}
                          /mes
                        </span>
                      </p>
                      <p
                        className={joinClasses(
                          "mt-1 text-xs font-semibold",
                          accent.valueSecondary,
                        )}
                      >
                        {formatQuotedUf(uiPrices.displayFinalPriceUf)}
                      </p>
                    </div>
                  </aside>

                  <div className="p-4 sm:p-6">
                    <ModalRequestForm
                      name={name}
                      onNameChange={setName}
                      rut={rut}
                      onRutChange={setRut}
                      email={email}
                      onEmailChange={setEmail}
                      phone={phone}
                      onPhoneChange={setPhone}
                      acceptPrivacy={acceptPrivacy}
                      onAcceptPrivacyChange={setAcceptPrivacy}
                      attemptedSubmit={attemptedSubmit}
                      validationErrors={validationErrors}
                      submitError={submitError}
                      submitting={submitting}
                      onSubmit={handleSubmit}
                      variant="plain"
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (embedded) {
    if (!mounted) return null;
    return createPortal(modalLayer, document.body);
  }

  return modalLayer;
}
