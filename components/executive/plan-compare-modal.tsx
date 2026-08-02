"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useOptionalCompanyAgreementContext } from "@/components/cotizador/company-agreement";
import { IsapreLogo } from "@/components/plan-card/isapre-logo";
import {
  buildPlanFinalPriceQuote,
  formatPlanClp,
  formatPlanUf,
  formatQuotedUf,
  PLAN_TYPE_LABELS,
  resolveCommercialPlanName,
  resolvePrimaryPlanType,
  splitCoverageByType,
  type BeneficiaryGroupSummary,
  type HealthPlan,
} from "@/domain";
import { getZoneLabel } from "@/lib/clinic-admin";
import {
  buildPlanAgreementPriceDisplay,
  buildPlanAgreementPriceDisplayWithMapping,
  resolveAgreementDiscountPercentForPlan,
  resolveAgreementPlanMapping,
} from "@/lib/company-agreements/plan-price-discount";
import { resolveGesPremiumUf } from "@/lib/isapre-pricing-rules";
import { getPlanZoneIds } from "@/lib/plan-admin";
import { planHasPdf } from "@/lib/plan-pdf";
import { touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import type { ValidatedCompanyAgreement } from "@/types/company-agreement";

export interface PlanCompareModalProps {
  open: boolean;
  plans: HealthPlan[];
  beneficiarySummary: BeneficiaryGroupSummary;
  ufToClp: number;
  onClose: () => void;
}

interface CompareColumn {
  plan: HealthPlan;
  name: string;
  typeLabel: string;
  baseUf: string;
  gesUf: string;
  finalUf: string;
  finalClp: string;
  hospital: string;
  ambulatory: string;
  zones: string;
  hasPdf: boolean;
}

type CompareRowKey =
  | "isapre"
  | "name"
  | "code"
  | "typeLabel"
  | "baseUf"
  | "gesUf"
  | "finalUf"
  | "finalClp"
  | "hospital"
  | "ambulatory"
  | "zones"
  | "hasPdf";

function formatCoverageCell(
  entries: { clinic_name: string; percentage: number }[],
): string {
  if (entries.length === 0) return "—";
  return entries
    .map((entry) => `${entry.clinic_name} (${entry.percentage}%)`)
    .join(" · ");
}

function buildCompareColumn(
  plan: HealthPlan,
  beneficiarySummary: BeneficiaryGroupSummary,
  ufToClp: number,
  validatedAgreement: ValidatedCompanyAgreement | null,
): CompareColumn {
  const standardQuote = buildPlanFinalPriceQuote(
    plan.base_price_uf,
    beneficiarySummary,
    ufToClp,
    plan.ges_premium_uf,
  );

  const mapping = resolveAgreementPlanMapping(
    plan.unique_code,
    plan.isapre,
    validatedAgreement,
  );

  let finalUf = standardQuote.finalPriceUf;
  let finalClp = standardQuote.finalPriceClp;
  let baseUf = plan.base_price_uf;

  if (mapping) {
    const convenioQuote = buildPlanFinalPriceQuote(
      mapping.price,
      beneficiarySummary,
      ufToClp,
      plan.ges_premium_uf,
    );
    const display = buildPlanAgreementPriceDisplayWithMapping(
      standardQuote,
      convenioQuote,
    );
    finalUf = display.displayFinalPriceUf;
    finalClp = display.displayFinalPriceClp;
    baseUf = mapping.price;
  } else {
    const discountPercent = resolveAgreementDiscountPercentForPlan(
      plan.isapre,
      validatedAgreement,
    );
    const display = buildPlanAgreementPriceDisplay(
      standardQuote,
      discountPercent,
    );
    if (display.hasAgreementDiscount) {
      finalUf = display.displayFinalPriceUf;
      finalClp = display.displayFinalPriceClp;
    }
  }

  const { hospitalaria, ambulatoria } = splitCoverageByType(plan.coverage);
  const zones = getPlanZoneIds(plan)
    .map((zoneId) => getZoneLabel(zoneId))
    .join(", ");

  return {
    plan,
    name: resolveCommercialPlanName(plan),
    typeLabel: PLAN_TYPE_LABELS[resolvePrimaryPlanType(plan)],
    baseUf: formatPlanUf(baseUf),
    gesUf: formatQuotedUf(resolveGesPremiumUf(plan.ges_premium_uf)),
    finalUf: formatQuotedUf(finalUf),
    finalClp: formatPlanClp(finalClp),
    hospital: formatCoverageCell(hospitalaria),
    ambulatory: formatCoverageCell(ambulatoria),
    zones: zones || "—",
    hasPdf: planHasPdf(plan),
  };
}

const COMPARE_ROWS: Array<{ key: CompareRowKey; label: string }> = [
  { key: "isapre", label: "Isapre" },
  { key: "name", label: "Nombre" },
  { key: "code", label: "Código" },
  { key: "typeLabel", label: "Tipo" },
  { key: "baseUf", label: "Precio base" },
  { key: "gesUf", label: "GES" },
  { key: "finalUf", label: "Precio final UF" },
  { key: "finalClp", label: "Precio final CLP" },
  { key: "hospital", label: "Cobertura hospitalaria" },
  { key: "ambulatory", label: "Cobertura ambulatoria" },
  { key: "zones", label: "Zonas" },
  { key: "hasPdf", label: "PDF" },
];

function cellValue(column: CompareColumn, key: CompareRowKey): string {
  switch (key) {
    case "isapre":
      return column.plan.isapre;
    case "name":
      return column.name;
    case "code":
      return column.plan.unique_code;
    case "hasPdf":
      return column.hasPdf ? "Disponible" : "No disponible";
    default:
      return column[key];
  }
}

export function PlanCompareModal({
  open,
  plans,
  beneficiarySummary,
  ufToClp,
  onClose,
}: PlanCompareModalProps) {
  const [mounted, setMounted] = useState(false);
  const validatedAgreement =
    useOptionalCompanyAgreementContext()?.validatedAgreement ?? null;

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
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const columns = useMemo(
    () =>
      plans.map((plan) =>
        buildCompareColumn(
          plan,
          beneficiarySummary,
          ufToClp,
          validatedAgreement,
        ),
      ),
    [plans, beneficiarySummary, ufToClp, validatedAgreement],
  );

  if (!mounted) return null;

  const modal = (
    <AnimatePresence>
      {open ? (
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
            aria-label="Cerrar comparación de planes"
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--dash-navy)_48%,transparent)] backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.div
            data-executive-cotizador
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-compare-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={joinClasses(
              "relative z-10 flex max-h-[min(92dvh,56rem)] w-full max-w-[min(100%,72rem)] flex-col overflow-hidden rounded-t-2xl border bg-white shadow-2xl sm:rounded-2xl",
              ui.border,
            )}
          >
            <header
              className={joinClasses(
                "flex shrink-0 items-start justify-between gap-3 border-b px-4 py-4 sm:px-6",
                ui.border,
              )}
            >
              <div className="min-w-0">
                <h2
                  id="plan-compare-title"
                  className="text-lg font-bold text-primary-dark sm:text-xl"
                >
                  Comparar planes
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {columns.length} planes seleccionados · precios según
                  beneficiarios actuales
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={joinClasses(
                  touchTarget,
                  "shrink-0 rounded-xl border px-3 text-sm font-semibold text-muted transition hover:bg-surface-hover hover:text-foreground",
                  ui.border,
                )}
              >
                Cerrar
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
              <div className="min-w-max">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm">
                    <tr>
                      <th
                        scope="col"
                        className={joinClasses(
                          "sticky left-0 z-20 min-w-[10rem] border-b bg-white/95 px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted sm:px-5",
                          ui.border,
                        )}
                      >
                        Atributo
                      </th>
                      {columns.map((column) => (
                        <th
                          key={column.plan.unique_code}
                          scope="col"
                          className={joinClasses(
                            "min-w-[14rem] max-w-[18rem] border-b px-4 py-3 sm:px-5",
                            ui.border,
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <IsapreLogo isapre={column.plan.isapre} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-bold text-primary-dark">
                                {column.name}
                              </p>
                              <p className="truncate text-xs text-muted">
                                {column.plan.isapre}
                              </p>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE_ROWS.map((row) => (
                      <tr key={row.key} className="align-top">
                        <th
                          scope="row"
                          className={joinClasses(
                            "sticky left-0 z-10 border-b bg-surface-hover/40 px-4 py-3 text-xs font-semibold text-muted sm:px-5",
                            ui.border,
                          )}
                        >
                          {row.label}
                        </th>
                        {columns.map((column) => (
                          <td
                            key={`${column.plan.unique_code}-${row.key}`}
                            className={joinClasses(
                              "border-b px-4 py-3 text-foreground sm:px-5",
                              ui.border,
                              (row.key === "finalUf" ||
                                row.key === "finalClp") &&
                                "font-semibold text-primary-dark",
                            )}
                          >
                            {cellValue(column, row.key)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
