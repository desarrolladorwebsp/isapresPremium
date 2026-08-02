"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { IsapreLogo } from "@/components/plan-card/isapre-logo";
import { DownloadIcon } from "@/components/plan-card/icons";
import {
  calculateFinalPlanPriceClp,
  coverageGlobalPercentage,
  formatPlanClp,
  formatPlanUf,
  PLAN_TYPE_LABELS,
  resolveCommercialPlanName,
  resolvePrimaryPlanType,
  splitCoverageByType,
  type BeneficiaryGroupSummary,
  type HealthPlan,
  type PlanFinalPriceQuote,
} from "@/domain";
import { resolveGesPremiumUf } from "@/lib/isapre-pricing-rules";
import {
  getPlanPdfDownloadUrl,
  getPlanPdfInlineUrl,
  planHasPdf,
} from "@/lib/plan-pdf";
import {
  planTypeBadgeTone,
  statusBadgeToneClass,
  touchTarget,
} from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import type { CoverageEntry } from "@/types/plan";
import type { PersonRiskFactor } from "@/types/beneficiary";

export type PlanDetailTabId = "coverages" | "summary" | "contract";

export interface PlanDetailModalProps {
  open: boolean;
  plan: HealthPlan | null;
  beneficiarySummary: BeneficiaryGroupSummary;
  priceQuote: PlanFinalPriceQuote;
  highlightHospitalClinicIds?: string[];
  highlightAmbulatoryClinicIds?: string[];
  initialTab?: PlanDetailTabId;
  onClose: () => void;
}

interface ProviderCoverage {
  clinicId: string;
  clinicName: string;
  hospitalPercent: number | null;
  ambulatoryPercent: number | null;
  highlighted: boolean;
}

const TABS: Array<{
  id: PlanDetailTabId;
  label: string;
  icon: ReactNode;
}> = [
  {
    id: "coverages",
    label: "Coberturas",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
        <path
          d="M12 4.5 17 6.5V11c0 3.1-2.1 5.9-5 6.5-2.9-.6-5-3.4-5-6.5V6.5l5-2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "summary",
    label: "Resumen",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
        <path
          d="M4 5h7v7H4V5Zm9 0h7v4h-7V5ZM4 14h7v5H4v-5Zm9-3h7v8h-7v-8Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "contract",
    label: "Contrato (PDF)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
        <path
          d="M7 4h7l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M14 4v4h4" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
];

function personUnitPriceUf(
  person: PersonRiskFactor,
  basePriceUf: number,
  gesPremiumUfPerPerson: number,
): number {
  return (person.factor ?? 0) * basePriceUf + gesPremiumUfPerPerson;
}

function buildProviderRows(
  coverage: CoverageEntry[],
  highlightHospitalClinicIds: string[],
  highlightAmbulatoryClinicIds: string[],
): ProviderCoverage[] {
  const byClinic = new Map<string, ProviderCoverage>();
  const highlight = new Set([
    ...highlightHospitalClinicIds,
    ...highlightAmbulatoryClinicIds,
  ]);

  for (const entry of coverage) {
    const current = byClinic.get(entry.clinic_id) ?? {
      clinicId: entry.clinic_id,
      clinicName: entry.clinic_name,
      hospitalPercent: null,
      ambulatoryPercent: null,
      highlighted: highlight.has(entry.clinic_id),
    };

    if (entry.type === "hospitalaria") {
      current.hospitalPercent = entry.percentage;
    } else {
      current.ambulatoryPercent = entry.percentage;
    }

    byClinic.set(entry.clinic_id, current);
  }

  return [...byClinic.values()];
}

function CoverageBar({
  percent,
  tone,
}: {
  percent: number | null;
  tone: "hospital" | "ambulatory" | "muted";
}) {
  const value = percent ?? 0;
  const barClass =
    tone === "hospital"
      ? "bg-primary"
      : tone === "ambulatory"
        ? "bg-secondary"
        : "bg-border";

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
      <div
        className={joinClasses("h-full rounded-full transition-all", barClass)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function CoveragesPanel({
  plan,
  hospitalaria,
  ambulatoria,
  providers,
  planTypeLabel,
}: {
  plan: HealthPlan;
  hospitalaria: CoverageEntry[];
  ambulatoria: CoverageEntry[];
  providers: ProviderCoverage[];
  planTypeLabel: string;
}) {
  const hospitalAvg = coverageGlobalPercentage(hospitalaria);
  const ambulatoryAvg = coverageGlobalPercentage(ambulatoria);
  const hospitalClinics = [
    ...new Set(hospitalaria.map((entry) => entry.clinic_name)),
  ];
  const ambulatoryClinics = [
    ...new Set(ambulatoria.map((entry) => entry.clinic_name)),
  ];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl bg-primary-dark px-5 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/90">
              {planTypeLabel}
            </span>
            <h3 className="mt-2 text-lg font-bold tracking-tight sm:text-xl">
              Coberturas del Plan
            </h3>
            <p className="mt-1 text-sm text-white/65">
              {providers.length} prestador
              {providers.length === 1 ? "" : "es"} incluido
              {providers.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:max-w-3xl">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/55">
                Hospitalaria
              </p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-sky-300">
                {hospitalaria.length > 0 ? `${hospitalAvg}%` : "—"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {hospitalClinics.slice(0, 4).map((name) => (
                  <span
                    key={`h-${name}`}
                    className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-white/80"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/55">
                Ambulatoria
              </p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-[var(--dash-cyan,#1ac9ea)]">
                {ambulatoria.length > 0 ? `${ambulatoryAvg}%` : "—"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ambulatoryClinics.slice(0, 4).map((name) => (
                  <span
                    key={`a-${name}`}
                    className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-white/80"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => {
          const complete =
            provider.hospitalPercent != null &&
            provider.ambulatoryPercent != null;
          return (
            <article
              key={provider.clinicId}
              className={joinClasses(
                "rounded-xl border bg-[var(--plan-card-surface)] p-4 shadow-sm ring-1 ring-inset ring-[var(--plan-card-ring)]",
                "border-[var(--plan-card-border)]",
                provider.highlighted && "ring-2 ring-primary/30",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-primary-dark">
                    {provider.clinicName}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">
                    {plan.isapre}
                  </p>
                </div>
                <span
                  className={joinClasses(
                    "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                    complete
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700",
                  )}
                >
                  {complete ? "Completo" : "Parcial"}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted">Hospitalaria</span>
                    <span className="font-bold tabular-nums text-primary-dark">
                      {provider.hospitalPercent != null
                        ? `${provider.hospitalPercent}%`
                        : "No aplica"}
                    </span>
                  </div>
                  <CoverageBar
                    percent={provider.hospitalPercent}
                    tone={
                      provider.hospitalPercent != null ? "hospital" : "muted"
                    }
                  />
                  <p className="mt-1 text-[10px] text-muted">
                    {provider.hospitalPercent != null
                      ? `Isapre paga ${provider.hospitalPercent}% · tú pagas ${100 - provider.hospitalPercent}%`
                      : "Sin cobertura hospitalaria"}
                  </p>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted">Ambulatoria</span>
                    <span className="font-bold tabular-nums text-primary-dark">
                      {provider.ambulatoryPercent != null
                        ? `${provider.ambulatoryPercent}%`
                        : "No aplica"}
                    </span>
                  </div>
                  <CoverageBar
                    percent={provider.ambulatoryPercent}
                    tone={
                      provider.ambulatoryPercent != null
                        ? "ambulatory"
                        : "muted"
                    }
                  />
                  <p className="mt-1 text-[10px] text-muted">
                    {provider.ambulatoryPercent != null
                      ? `Isapre paga ${provider.ambulatoryPercent}% · tú pagas ${100 - provider.ambulatoryPercent}%`
                      : "Sin cobertura ambulatoria"}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        El % indica cuánto paga la Isapre sobre el arancel FONASA de referencia.
        Mayor % = menor copago de tu parte.
      </p>
    </div>
  );
}

function SummaryPanel({
  plan,
  priceQuote,
  beneficiarySummary,
  providers,
  planTypeLabel,
  hospitalAvg,
  ambulatoryAvg,
}: {
  plan: HealthPlan;
  priceQuote: PlanFinalPriceQuote;
  beneficiarySummary: BeneficiaryGroupSummary;
  providers: ProviderCoverage[];
  planTypeLabel: string;
  hospitalAvg: number;
  ambulatoryAvg: number;
}) {
  const commercialName = resolveCommercialPlanName(plan);
  const gesRate = resolveGesPremiumUf(plan.ges_premium_uf);
  const rows = useMemo(() => {
    const items: Array<{
      key: string;
      label: string;
      badge: string;
      uf: number;
      clp: number;
    }> = [];

    beneficiarySummary.contributors.forEach((contributor, index) => {
      if (contributor.age == null) return;
      const uf = personUnitPriceUf(
        contributor,
        priceQuote.basePriceUf,
        gesRate,
      );
      items.push({
        key: contributor.id,
        label:
          beneficiarySummary.contributors.length > 1
            ? `Cotizante ${index + 1}`
            : "Cotizante",
        badge: "COT",
        uf,
        clp: calculateFinalPlanPriceClp(uf, priceQuote.ufToClp),
      });
    });

    beneficiarySummary.dependents.forEach((dependent, index) => {
      const uf = personUnitPriceUf(
        dependent,
        priceQuote.basePriceUf,
        gesRate,
      );
      items.push({
        key: dependent.id,
        label: `Carga ${index + 1}`,
        badge: "CRG",
        uf,
        clp: calculateFinalPlanPriceClp(uf, priceQuote.ufToClp),
      });
    });

    return items;
  }, [beneficiarySummary, gesRate, priceQuote.basePriceUf, priceQuote.ufToClp]);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl bg-primary-dark px-5 py-5 text-white sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
          Resumen ejecutivo
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-bold tracking-tight sm:text-xl">
              {commercialName}
            </h3>
            <p className="mt-1 text-sm text-white/65">
              {plan.isapre} · {planTypeLabel} · {plan.unique_code}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-2xl font-extrabold tabular-nums sm:text-3xl">
              {formatPlanUf(priceQuote.finalPriceUf)}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[var(--dash-cyan,#1ac9ea)]">
              {formatPlanClp(priceQuote.finalPriceClp)} / mes
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-3 text-xs text-white/70">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-rose-400" aria-hidden />
            Cobertura del plan
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-violet-400" aria-hidden />
            {providers.length} prestador
            {providers.length === 1 ? "" : "es"} en red
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-amber-300" aria-hidden />
            {priceQuote.beneficiaryCount} beneficiario
            {priceQuote.beneficiaryCount === 1 ? "" : "s"} activo
            {priceQuote.beneficiaryCount === 1 ? "" : "s"}
          </span>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className={joinClasses(
          "rounded-xl border bg-[var(--plan-card-surface)] p-4 ring-1 ring-inset ring-[var(--plan-card-ring)]",
          "border-[var(--plan-card-border)]",
        )}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Base plan
          </p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-primary-dark">
            {priceQuote.basePriceUf.toLocaleString("es-CL", {
              minimumFractionDigits: 3,
              maximumFractionDigits: 3,
            })}
          </p>
          <p className="mt-1 text-xs text-muted">UF por cotizante</p>
        </div>
        <div className={joinClasses(
          "rounded-xl border bg-[var(--plan-card-surface)] p-4 ring-1 ring-inset ring-[var(--plan-card-ring)]",
          "border-[var(--plan-card-border)]",
        )}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            GES Isapre
          </p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-primary-dark">
            {priceQuote.gesPremiumUfPerPerson.toLocaleString("es-CL", {
              minimumFractionDigits: 3,
              maximumFractionDigits: 3,
            })}
          </p>
          <p className="mt-1 text-xs text-muted">UF por beneficiario</p>
        </div>
        <div className={joinClasses(
          "rounded-xl border bg-[var(--plan-card-surface)] p-4 ring-1 ring-inset ring-[var(--plan-card-ring)]",
          "border-[var(--plan-card-border)]",
        )}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Suma factores
          </p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-primary-dark">
            {priceQuote.groupTotalFactor.toLocaleString("es-CL", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="mt-1 text-xs text-muted">
            {priceQuote.beneficiaryCount} beneficiario
            {priceQuote.beneficiaryCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className={joinClasses(
          "rounded-xl border bg-[var(--plan-card-surface)] p-4 ring-1 ring-inset ring-[var(--plan-card-ring)]",
          "border-[var(--plan-card-border)]",
        )}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Cobertura promedio
          </p>
          <div className="mt-3 space-y-2">
            <div>
              <div className="mb-1 flex justify-between text-[10px] font-semibold">
                <span className="text-muted">HOSP</span>
                <span>{hospitalAvg}%</span>
              </div>
              <CoverageBar percent={hospitalAvg} tone="hospital" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[10px] font-semibold">
                <span className="text-muted">AMB</span>
                <span>{ambulatoryAvg}%</span>
              </div>
              <CoverageBar percent={ambulatoryAvg} tone="ambulatory" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          className={joinClasses(
            "overflow-hidden rounded-xl border bg-[var(--plan-card-surface)] ring-1 ring-inset ring-[var(--plan-card-ring)]",
            "border-[var(--plan-card-border)]",
          )}
        >
          <header className="border-b border-[var(--plan-card-border)] bg-[var(--plan-card-header-bg)] px-4 py-3">
            <h4 className="text-sm font-bold text-primary-dark">
              Valor por beneficiario
            </h4>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[18rem] text-left text-sm">
              <thead className="bg-surface-hover/60 text-[10px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2 font-semibold">Beneficiario</th>
                  <th className="px-4 py-2 font-semibold">UF</th>
                  <th className="px-4 py-2 font-semibold">Pesos</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-t border-border/70">
                    <td className="px-4 py-2.5">
                      <span className="mr-2 inline-flex rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        {row.badge}
                      </span>
                      {row.label}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-semibold">
                      {row.uf.toLocaleString("es-CL", {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted">
                      {formatPlanClp(row.clp)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-surface-hover/40">
                  <td className="px-4 py-3 text-sm font-bold">Total</td>
                  <td className="px-4 py-3 tabular-nums text-sm font-bold">
                    {priceQuote.finalPriceUf.toLocaleString("es-CL", {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-sm font-bold">
                    {formatPlanClp(priceQuote.finalPriceClp)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section
          className={joinClasses(
            "overflow-hidden rounded-xl border bg-[var(--plan-card-surface)] ring-1 ring-inset ring-[var(--plan-card-ring)]",
            "border-[var(--plan-card-border)]",
          )}
        >
          <header className="border-b border-[var(--plan-card-border)] bg-[var(--plan-card-header-bg)] px-4 py-3">
            <h4 className="text-sm font-bold text-primary-dark">
              Prestadores en red
            </h4>
          </header>
          <ul className="divide-y divide-border/70">
            {providers.length === 0 ? (
              <li className="px-4 py-6 text-sm text-muted">
                Sin prestadores en la cobertura del plan.
              </li>
            ) : (
              providers.map((provider) => (
                <li
                  key={provider.clinicId}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {provider.clinicName}
                    </p>
                    <div className="mt-1.5">
                      <CoverageBar
                        percent={
                          provider.hospitalPercent ??
                          provider.ambulatoryPercent
                        }
                        tone={
                          provider.hospitalPercent != null
                            ? "hospital"
                            : "ambulatory"
                        }
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      H {provider.hospitalPercent ?? "—"}
                      {provider.hospitalPercent != null ? "%" : ""}
                    </span>
                    <span className="rounded-md bg-secondary-muted px-1.5 py-0.5 text-[10px] font-bold text-secondary">
                      A {provider.ambulatoryPercent ?? "—"}
                      {provider.ambulatoryPercent != null ? "%" : ""}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function ContractPanel({
  hasPdf,
  inlineUrl,
  downloadUrl,
  onDownload,
}: {
  hasPdf: boolean;
  inlineUrl: string | null;
  downloadUrl: string | null;
  onDownload: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoading(Boolean(hasPdf && inlineUrl));
    setFailed(false);
  }, [hasPdf, inlineUrl]);

  if (!hasPdf || !inlineUrl) {
    return (
      <div
        className={joinClasses(
          "flex min-h-[22rem] flex-col items-center justify-center rounded-xl border border-dashed bg-[var(--plan-card-surface)] px-6 text-center shadow-sm ring-1 ring-inset ring-[var(--plan-card-ring)]",
          "border-[var(--plan-card-border)]",
        )}
      >
        <p className="text-base font-semibold text-primary-dark">
          PDF disponible pronto
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Este plan aún no tiene contrato cargado en administración. Cuando esté
          disponible podrás visualizarlo y descargarlo desde aquí.
        </p>
      </div>
    );
  }

  if (failed) {
    return (
      <div
        className={joinClasses(
          "flex min-h-[22rem] flex-col items-center justify-center rounded-xl border border-dashed bg-[var(--plan-card-surface)] px-6 text-center shadow-sm ring-1 ring-inset ring-[var(--plan-card-ring)]",
          "border-[var(--plan-card-border)]",
        )}
      >
        <p className="text-base font-semibold text-primary-dark">
          No se pudo mostrar el PDF
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted">
          El visor no cargó el contrato. Puedes descargarlo e abrirlo en tu
          dispositivo.
        </p>
        <button
          type="button"
          onClick={onDownload}
          disabled={!downloadUrl}
          data-executive-quick-action={downloadUrl ? "download" : undefined}
          className={joinClasses(
            touchTarget,
            "mt-4 h-9 gap-1.5 rounded-xl border border-secondary/50 bg-secondary-muted px-4 text-xs font-bold text-secondary hover:border-secondary hover:bg-secondary/20 disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          <DownloadIcon />
          Descargar PDF
        </button>
      </div>
    );
  }

  return (
    <div
      className={joinClasses(
        "relative overflow-hidden rounded-xl border bg-[var(--plan-card-surface)] shadow-sm ring-1 ring-inset ring-[var(--plan-card-ring)]",
        "border-[var(--plan-card-border)]",
      )}
    >
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[color-mix(in_srgb,var(--plan-card-surface)_92%,transparent)] text-sm text-muted">
          Cargando contrato…
        </div>
      ) : null}
      <iframe
        title="Contrato PDF del plan"
        src={inlineUrl}
        className="h-[min(70vh,42rem)] w-full bg-surface-hover"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
      />
    </div>
  );
}

export function PlanDetailModal({
  open,
  plan,
  beneficiarySummary,
  priceQuote,
  highlightHospitalClinicIds = [],
  highlightAmbulatoryClinicIds = [],
  initialTab = "coverages",
  onClose,
}: PlanDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<PlanDetailTabId>(initialTab);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab);
  }, [open, initialTab, plan?.unique_code]);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const coverageSplit = useMemo(
    () => (plan ? splitCoverageByType(plan.coverage) : null),
    [plan],
  );

  const providers = useMemo(
    () =>
      plan
        ? buildProviderRows(
            plan.coverage,
            highlightHospitalClinicIds,
            highlightAmbulatoryClinicIds,
          )
        : [],
    [
      plan,
      highlightHospitalClinicIds,
      highlightAmbulatoryClinicIds,
    ],
  );

  if (!mounted || !plan || !coverageSplit) return null;

  const commercialName = resolveCommercialPlanName(plan);
  const planType = resolvePrimaryPlanType(plan);
  const planTypeLabel = PLAN_TYPE_LABELS[planType];
  const badgeTone = statusBadgeToneClass[planTypeBadgeTone[planType]];
  const hasPdf = planHasPdf(plan);
  const downloadUrl = getPlanPdfDownloadUrl(plan);
  const inlineUrl = getPlanPdfInlineUrl(plan);
  const hospitalAvg = coverageGlobalPercentage(coverageSplit.hospitalaria);
  const ambulatoryAvg = coverageGlobalPercentage(coverageSplit.ambulatoria);

  function handleDownload() {
    if (!hasPdf || !downloadUrl) return;
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  }

  const modal = (
    <AnimatePresence>
      {open ? (
        /*
         * Portal a body: reaplicar scope premium + cotizador ejecutivo para
         * heredar la misma paleta (--primary navy/azul, --secondary cyan, etc.)
         * que la página (no caer al verde de :root).
         */
        <motion.div
          data-premium-surface
          data-premium-variant="dashboard"
          className="premium-surface-root fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Cerrar detalle del plan"
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--dash-navy)_48%,transparent)] backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.div
            data-executive-cotizador
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-detail-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={joinClasses(
              "relative z-10 flex max-h-[min(94dvh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border bg-[var(--plan-card-surface)] text-foreground shadow-[var(--shadow-plan-card)] ring-1 ring-inset ring-[var(--plan-card-ring)] sm:rounded-2xl",
              "border-[var(--plan-card-border)] [background-image:none]",
            )}
          >
            <header className="shrink-0 border-b border-[var(--plan-card-border)] bg-[var(--plan-card-header-bg)] px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-start gap-3 sm:gap-4">
                <IsapreLogo isapre={plan.isapre} size="md" />
                <div className="min-w-0 flex-1">
                  <h2
                    id="plan-detail-title"
                    className="truncate text-sm font-bold text-primary-dark sm:text-base"
                  >
                    {commercialName}
                  </h2>
                  <span
                    className={joinClasses(
                      "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      badgeTone,
                    )}
                  >
                    {planTypeLabel}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-extrabold tabular-nums text-primary-dark sm:text-lg">
                    {formatPlanUf(priceQuote.finalPriceUf)}
                  </p>
                  <p className="text-xs text-muted">
                    {formatPlanClp(priceQuote.finalPriceClp)} / mes
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className={joinClasses(
                    touchTarget,
                    "size-9 shrink-0 rounded-xl border border-border bg-white text-muted hover:bg-surface-hover hover:text-primary-dark",
                  )}
                >
                  <span aria-hidden className="text-lg leading-none">
                    ×
                  </span>
                </button>
              </div>
            </header>

            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--plan-card-border)] bg-white px-4 py-2 sm:px-6">
              <div
                className="flex min-w-0 flex-1 gap-1 overflow-x-auto"
                role="tablist"
                aria-label="Secciones del plan"
              >
                {TABS.map((tab) => {
                  const active = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(tab.id)}
                      className={joinClasses(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide transition",
                        active
                          ? "bg-primary/10 text-primary ring-1 ring-primary/25"
                          : "text-muted hover:bg-surface-hover hover:text-primary-dark",
                      )}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={!hasPdf || !downloadUrl}
                data-executive-quick-action={hasPdf ? "download" : undefined}
                className={joinClasses(
                  touchTarget,
                  "h-9 shrink-0 gap-1.5 rounded-xl border px-3 text-xs font-bold transition",
                  hasPdf
                    ? "border-secondary/50 bg-secondary-muted text-secondary hover:border-secondary hover:bg-secondary/20"
                    : "cursor-not-allowed border-border bg-surface-hover text-muted opacity-60",
                )}
              >
                <DownloadIcon />
                Descargar PDF
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-bg-layout px-4 py-4 sm:px-6 sm:py-5">
              {activeTab === "coverages" ? (
                <CoveragesPanel
                  plan={plan}
                  hospitalaria={coverageSplit.hospitalaria}
                  ambulatoria={coverageSplit.ambulatoria}
                  providers={providers}
                  planTypeLabel={planTypeLabel}
                />
              ) : null}
              {activeTab === "summary" ? (
                <SummaryPanel
                  plan={plan}
                  priceQuote={priceQuote}
                  beneficiarySummary={beneficiarySummary}
                  providers={providers}
                  planTypeLabel={planTypeLabel}
                  hospitalAvg={hospitalAvg}
                  ambulatoryAvg={ambulatoryAvg}
                />
              ) : null}
              {activeTab === "contract" ? (
                <ContractPanel
                  hasPdf={hasPdf}
                  inlineUrl={inlineUrl}
                  downloadUrl={downloadUrl}
                  onDownload={handleDownload}
                />
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
