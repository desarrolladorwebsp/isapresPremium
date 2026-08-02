"use client";

import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { CoverageColumnCompact } from "@/components/plan-card/coverage-column-compact";
import {
  AmbulatoryCoverageIcon,
  HospitalCoverageIcon,
} from "@/components/plan-card/coverage-column-icons";
import { ChatIcon, FileIcon } from "@/components/plan-card/icons";
import { IsapreLogo } from "@/components/plan-card/isapre-logo";
import {
  buildPlanFinalPriceQuote,
  PLAN_TYPE_LABELS,
  resolveCommercialPlanName,
  resolvePrimaryPlanType,
  splitCoverageByType,
} from "@/domain";
import { PublicPlanAgreementPrices } from "@/components/cotizador/company-agreement/plan-agreement-price";
import { buildPlanAgreementPriceDisplay } from "@/lib/company-agreements/plan-price-discount";
import { useInView } from "@/hooks/use-in-view";
import { usePlanDetail } from "@/hooks/use-plan-detail";
import {
  planCard,
  touchTarget,
  ui,
} from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { BeneficiaryGroupSummary } from "@/domain";
import type { HealthPlanSummary } from "@/domain";
import type { PlanTypeFilterId } from "@/types/filters";
import { planHasPdf } from "@/lib/plan-pdf";
import type { CurrencyDisplay } from "./public-results-toolbar";
import { formatQuotedUf } from "@/domain";
import { PublicPlanPdfModal } from "./public-plan-pdf-modal";

export interface PublicPlanCardProps {
  plan: HealthPlanSummary;
  beneficiarySummary: BeneficiaryGroupSummary;
  ufToClp: number;
  currency: CurrencyDisplay;
  onRequest: () => void;
  highlightHospitalClinicIds?: string[];
  highlightAmbulatoryClinicIds?: string[];
}

const metaChip =
  "inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-semibold leading-tight sm:text-[11px]";

const planMetaStyles = {
  code: joinClasses(
    metaChip,
    ui.borderHairline,
    "bg-surface-hover font-mono text-[10px] font-medium normal-case tracking-wide text-foreground/70",
  ),
  base: joinClasses(
    metaChip,
    "border-primary/20 bg-primary/5 text-primary-dark",
  ),
  top: joinClasses(
    metaChip,
    "border-primary/30 bg-primary text-primary-foreground shadow-sm",
  ),
} as const;

const planTypeMetaStyle: Record<PlanTypeFilterId, string> = {
  preferred: joinClasses(
    metaChip,
    "border-amber-300/60 bg-amber-50 text-amber-950",
  ),
  closed: joinClasses(
    metaChip,
    "border-secondary/35 bg-secondary-muted text-secondary",
  ),
  free_choice: joinClasses(
    metaChip,
    ui.borderHairline,
    "bg-white text-muted",
  ),
};

const planActionBase = joinClasses(
  touchTarget,
  "inline-flex h-10 items-center gap-1.5 rounded-md px-3.5 text-xs font-bold transition active:scale-[0.98]",
);

const planActionIconCircle =
  "flex size-5 shrink-0 items-center justify-center rounded-full [&_svg]:size-3.5";

function PlanCardActionButton({
  label,
  icon,
  variant,
  onClick,
  href,
  download,
  target,
  rel,
  title,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  variant: "primary" | "secondary";
  onClick?: () => void;
  href?: string;
  download?: string;
  target?: string;
  rel?: string;
  title?: string;
  disabled?: boolean;
}) {
  const isPrimary = variant === "primary";

  const className = joinClasses(
    planActionBase,
    isPrimary
      ? ui.cta
      : joinClasses(
          ui.border,
          "border bg-white text-foreground shadow-sm hover:border-primary/35 hover:bg-primary/5 hover:text-primary-dark",
        ),
    disabled && "pointer-events-none cursor-not-allowed opacity-50",
  );

  const iconClassName = joinClasses(
    planActionIconCircle,
    isPrimary
      ? "bg-white/20 text-primary-foreground"
      : "bg-primary/10 text-primary-dark",
    disabled && "opacity-80",
  );

  const content = (
    <>
      <span className={iconClassName} aria-hidden>
        {icon}
      </span>
      {label}
    </>
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        download={download}
        target={target}
        rel={rel}
        title={title}
        aria-label={title ?? label}
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title ?? label}
      aria-disabled={disabled || undefined}
      className={className}
    >
      {content}
    </button>
  );
}

export function PublicPlanCard({
  plan,
  beneficiarySummary,
  ufToClp,
  currency,
  onRequest,
  highlightHospitalClinicIds = [],
  highlightAmbulatoryClinicIds = [],
}: PublicPlanCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const needsClinicDetail =
    highlightHospitalClinicIds.length > 0 ||
    highlightAmbulatoryClinicIds.length > 0;
  const { ref, inView } = useInView<HTMLElement>();
  const { plan: detailPlan, loading: detailLoading } = usePlanDetail(
    plan.unique_code,
    needsClinicDetail && inView,
  );

  const hasPdf = planHasPdf(plan);

  const { hospitalaria, ambulatoria } = useMemo(() => {
    if (!detailPlan) {
      return { hospitalaria: [], ambulatoria: [] };
    }
    return splitCoverageByType(detailPlan.coverage);
  }, [detailPlan]);

  const planType = resolvePrimaryPlanType(plan);
  const planTypeLabel = PLAN_TYPE_LABELS[planType];
  const commercialName = resolveCommercialPlanName(plan).toUpperCase();

  // Público/widget: precios de lista sin aplicar ni mostrar descuento real de convenio.
  const standardQuote = useMemo(
    () =>
      buildPlanFinalPriceQuote(
        plan.base_price_uf,
        beneficiarySummary,
        ufToClp,
        plan.ges_premium_uf,
      ),
    [plan.base_price_uf, plan.ges_premium_uf, beneficiarySummary, ufToClp],
  );

  const priceQuote = standardQuote;

  const agreementPrices = useMemo(
    () => buildPlanAgreementPriceDisplay(standardQuote, null),
    [standardQuote],
  );

  return (
    <motion.article
      ref={ref}
      layout="position"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      animate={{
        y: isHovered ? -planCard.elevation.hoverLiftPx : 0,
        borderColor: isHovered
          ? planCard.elevation.borderHover
          : planCard.elevation.borderRest,
        boxShadow: isHovered
          ? planCard.elevation.shadowHover
          : planCard.elevation.shadowRest,
      }}
      transition={planCard.elevation.spring}
      className={planCard.root}
      data-public-plan-card
    >
      {/* Cabecera — hero del plan */}
      <div className={joinClasses(planCard.header, "plan-card-header")}>
        <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
          <IsapreLogo isapre={plan.isapre} size="sm" />

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-xs font-bold uppercase leading-snug tracking-wide text-primary-dark sm:text-sm">
              {commercialName}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className={planMetaStyles.code} title="Código del plan">
                {plan.unique_code}
              </span>
              <span className={planMetaStyles.base} title="Precio base en UF">
                <span className="font-normal text-primary-dark/70">Base</span>
                <span className="font-bold tabular-nums">
                  {formatQuotedUf(priceQuote.basePriceUf).replace("UF ", "")} UF
                </span>
              </span>
              <span className={planTypeMetaStyle[planType]}>{planTypeLabel}</span>
              {plan.has_top ? (
                <span className={planMetaStyles.top}>Top</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="plan-card-header-actions flex shrink-0 flex-col items-stretch gap-2 sm:items-end sm:gap-2.5">
          <PublicPlanAgreementPrices
            prices={agreementPrices}
            currency={currency}
          />

          <div className="flex flex-wrap items-center gap-2">
            <PlanCardActionButton
              label="PDF"
              icon={<FileIcon />}
              variant="secondary"
              onClick={() => setPdfModalOpen(true)}
              title={
                hasPdf
                  ? "Ver contrato PDF del plan"
                  : "PDF no disponible para este plan"
              }
              disabled={!hasPdf}
            />
            <PlanCardActionButton
              label="Solicitar asesoría"
              icon={<ChatIcon />}
              variant="primary"
              onClick={onRequest}
              title="Solicitar asesoría del plan"
            />
          </div>
        </div>
      </div>

      {/* Coberturas — estilo competencia: 1 barra + lista */}
      <div className={planCard.coverageGrid}>
        <CoverageColumnCompact
          title="Cobertura hospitalaria"
          icon={<HospitalCoverageIcon />}
          entries={hospitalaria}
          fallbackPercentages={plan.coverage_summary.hospital_percentages}
          barClassName="bg-primary"
          percentClassName="text-primary-dark"
          headerClassName="text-primary-dark/80"
          badgeClassName="border border-primary/25 bg-primary/10 text-primary-dark"
          showDivider
          highlightClinicIds={highlightHospitalClinicIds}
        />
        <CoverageColumnCompact
          title="Cobertura ambulatoria"
          icon={<AmbulatoryCoverageIcon />}
          entries={ambulatoria}
          fallbackPercentages={plan.coverage_summary.ambulatory_percentages}
          barClassName="bg-secondary"
          percentClassName="text-secondary"
          headerClassName="text-secondary"
          badgeClassName="border border-secondary/35 bg-secondary-muted text-secondary"
          highlightClinicIds={highlightAmbulatoryClinicIds}
        />
      </div>

      {detailLoading && needsClinicDetail && inView ? (
        <p className={planCard.footer}>
          Cargando prestadores…
        </p>
      ) : null}

      <PublicPlanPdfModal
        open={pdfModalOpen}
        plan={plan}
        onClose={() => setPdfModalOpen(false)}
      />
    </motion.article>
  );
}
