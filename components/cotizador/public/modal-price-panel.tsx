"use client";

import { useMemo } from "react";
import {
  formatPlanClp,
  formatQuotedUf,
} from "@/domain";
import {
  buildSinglePersonPricesByAge,
  formatAgePriceClpShort,
} from "@/lib/plan-price-by-age";
import {
  buildCargasScenariosForGroup,
  buildGesScalePoints,
  buildPriceCompositionFromSummary,
  type CargasPriceScenario,
} from "@/lib/plan-price-scenarios";
import { accent, horizontalScrollRail, safeWidth, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { BeneficiaryGroupSummary, PlanFinalPriceQuote } from "@/domain";
import type { FamilyBeneficiariesState } from "@/domain";

export interface ModalPricePanelProps {
  basePriceUf: number;
  ufToClp: number;
  priceQuote: PlanFinalPriceQuote;
  highlightAge?: number | null;
  beneficiarySummary: BeneficiaryGroupSummary;
  dependents: FamilyBeneficiariesState["dependents"];
}

const AGE_CHART_HEIGHT = 168;
const AGE_CHART_WIDTH = 360;
const AGE_PADDING = { top: 12, right: 8, bottom: 28, left: 8 };

const CARGAS_CHART_HEIGHT = 180;
const CARGAS_CHART_WIDTH = 340;

function StackedBar({
  riskClp,
  gesClp,
  className,
}: {
  riskClp: number;
  gesClp: number;
  className?: string;
}) {
  const total = Math.max(riskClp + gesClp, 1);
  const riskPct = (riskClp / total) * 100;
  const gesPct = (gesClp / total) * 100;

  return (
    <div className={joinClasses("space-y-2", className)}>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-hover">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary-dark transition-all"
          style={{ width: `${riskPct}%` }}
          title={`Factor de riesgo: ${formatPlanClp(riskClp)}`}
        />
        <div
          className="h-full bg-gradient-to-r from-secondary to-secondary/80 transition-all"
          style={{ width: `${gesPct}%` }}
          title={`GES: ${formatPlanClp(gesClp)}`}
        />
      </div>
      <div className="flex flex-wrap gap-3 text-[11px]">
        <span className="inline-flex items-center gap-1.5 font-medium text-primary-dark">
          <span className="size-2 rounded-full bg-primary" />
          Riesgo {formatPlanClp(riskClp)}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-secondary">
          <span className="size-2 rounded-full bg-secondary" />
          GES {formatPlanClp(gesClp)}
        </span>
      </div>
    </div>
  );
}

function CargasStackedChart({
  scenarios,
  highlightDependentCount,
}: {
  scenarios: CargasPriceScenario[];
  highlightDependentCount: number;
}) {
  const maxClp = Math.max(...scenarios.map((s) => s.priceClp), 1);
  const barGap = 12;
  const plotWidth = CARGAS_CHART_WIDTH - 24;
  const barWidth = (plotWidth - barGap * (scenarios.length - 1)) / scenarios.length;
  const plotHeight = CARGAS_CHART_HEIGHT - 40;

  return (
    <div className={joinClasses(horizontalScrollRail, safeWidth)}>
      <svg
        viewBox={`0 0 ${CARGAS_CHART_WIDTH} ${CARGAS_CHART_HEIGHT}`}
        className="mx-auto h-auto w-full min-w-[300px] max-w-full"
        role="img"
        aria-label="Gráfico de precio según cantidad de cargas familiares"
      >
        {scenarios.map((scenario, index) => {
          const x = 12 + index * (barWidth + barGap);
          const totalHeight = Math.max(8, (scenario.priceClp / maxClp) * plotHeight);
          const gesHeight =
            scenario.priceClp > 0
              ? (scenario.gesClp / scenario.priceClp) * totalHeight
              : 0;
          const riskHeight = totalHeight - gesHeight;
          const isHighlight = scenario.dependentCount === highlightDependentCount;

          return (
            <g key={scenario.id}>
              <rect
                x={x}
                y={12 + plotHeight - totalHeight}
                width={barWidth}
                height={riskHeight}
                rx={3}
                fill={isHighlight ? "var(--primary)" : "var(--primary-dark)"}
                opacity={isHighlight ? 1 : 0.85}
              />
              <rect
                x={x}
                y={12 + plotHeight - gesHeight}
                width={barWidth}
                height={gesHeight}
                rx={3}
                fill="var(--secondary)"
                opacity={isHighlight ? 1 : 0.9}
              />
              <text
                x={x + barWidth / 2}
                y={8}
                textAnchor="middle"
                className="fill-primary-dark text-[8px] font-bold"
              >
                {formatAgePriceClpShort(scenario.priceClp)}
              </text>
              <text
                x={x + barWidth / 2}
                y={CARGAS_CHART_HEIGHT - 6}
                textAnchor="middle"
                className="fill-muted text-[9px] font-semibold"
              >
                {scenario.dependentCount === 0
                  ? "0 cargas"
                  : `${scenario.dependentCount} carga${scenario.dependentCount === 1 ? "" : "s"}`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function ModalPricePanel({
  basePriceUf,
  ufToClp,
  priceQuote,
  highlightAge,
  beneficiarySummary,
  dependents,
}: ModalPricePanelProps) {
  const agePoints = useMemo(
    () =>
      buildSinglePersonPricesByAge(
        basePriceUf,
        ufToClp,
        undefined,
        priceQuote.gesPremiumUfPerPerson,
      ),
    [basePriceUf, ufToClp, priceQuote.gesPremiumUfPerPerson],
  );

  const composition = useMemo(
    () =>
      buildPriceCompositionFromSummary(
        basePriceUf,
        beneficiarySummary,
        ufToClp,
        priceQuote.finalPriceUf,
        priceQuote.finalPriceClp,
        priceQuote.gesPremiumUfPerPerson,
      ),
    [basePriceUf, beneficiarySummary, ufToClp, priceQuote],
  );

  const cargasScenarios = useMemo(
    () =>
      buildCargasScenariosForGroup(
        basePriceUf,
        ufToClp,
        beneficiarySummary.contributor.age,
        dependents,
        priceQuote.gesPremiumUfPerPerson,
      ),
    [
      basePriceUf,
      ufToClp,
      beneficiarySummary.contributor.age,
      dependents,
      priceQuote.gesPremiumUfPerPerson,
    ],
  );

  const gesScale = useMemo(
    () => buildGesScalePoints(ufToClp, 5, priceQuote.gesPremiumUfPerPerson),
    [ufToClp, priceQuote.gesPremiumUfPerPerson],
  );

  const maxAgeClp = Math.max(...agePoints.map((p) => p.priceClp), 1);
  const plotWidth = AGE_CHART_WIDTH - AGE_PADDING.left - AGE_PADDING.right;
  const plotHeight = AGE_CHART_HEIGHT - AGE_PADDING.top - AGE_PADDING.bottom;
  const barGap = 6;
  const barWidth = (plotWidth - barGap * (agePoints.length - 1)) / agePoints.length;

  const ageBars = agePoints.map((point, index) => {
    const height = Math.max(6, (point.priceClp / maxAgeClp) * plotHeight);
    const x = AGE_PADDING.left + index * (barWidth + barGap);
    const y = AGE_PADDING.top + plotHeight - height;
    const isHighlight = highlightAge !== null && highlightAge !== undefined && point.age === highlightAge;
    return { ...point, height, x, y, isHighlight };
  });

  const highlightPoint = ageBars.find((bar) => bar.isHighlight);
  const currentDependentCount = beneficiarySummary.dependents.filter(
    (d) => d.age !== null,
  ).length;

  const maxGesClp = Math.max(...gesScale.map((p) => p.gesClp), 1);

  return (
    <div className={joinClasses(safeWidth, "space-y-6 p-4 sm:p-6")}>
      <div>
        <h3 className="text-lg font-bold text-primary-dark">Precio del plan</h3>
        <p className="mt-1 text-sm text-muted">
          Desglose por factor de riesgo, cargas familiares y GES obligatorio.
        </p>
      </div>

      {/* Tu selección actual */}
      <section
        className={joinClasses(
          "rounded-2xl border bg-gradient-to-br from-primary/5 to-white p-4 sm:p-5",
          ui.border,
          accent.ringPrimary,
        )}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Tu cotización actual
        </p>
        <p className="mt-1 text-2xl font-black text-primary-dark">
          {formatPlanClp(composition.totalClp)}
          <span className="text-sm font-semibold text-muted"> /mes</span>
        </p>
        <p className={joinClasses("text-sm font-semibold", accent.valueSecondary)}>
          {formatQuotedUf(composition.totalUf)}
        </p>
        <div className="mt-4">
          <StackedBar riskClp={composition.riskClp} gesClp={composition.gesClp} />
        </div>
        <p className="mt-3 text-xs text-muted">
          {beneficiarySummary.beneficiaryCount} beneficiario
          {beneficiarySummary.beneficiaryCount === 1 ? "" : "s"} · Factor total{" "}
          {beneficiarySummary.totalFactors.toLocaleString("es-CL", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </section>

      {/* Precio por edad */}
      <section
        className={joinClasses(
          "rounded-2xl border bg-white p-4 sm:p-5",
          ui.border,
        )}
      >
        <h4 className="text-base font-bold text-primary-dark">Precio por edad</h4>
        <p className="mt-1 text-sm text-muted">
          Cotizante solo (1 persona), según factor de riesgo por edad.
        </p>

        {highlightPoint ? (
          <p className="mt-2 text-xs font-semibold text-primary-dark">
            Tu edad ({highlightPoint.age}):{" "}
            <span className={accent.valuePrimary}>
              {formatPlanClp(highlightPoint.priceClp)}
            </span>
          </p>
        ) : null}

        <div className={joinClasses("mt-4", horizontalScrollRail, safeWidth)}>
          <svg
            viewBox={`0 0 ${AGE_CHART_WIDTH} ${AGE_CHART_HEIGHT}`}
            className="mx-auto h-auto w-full min-w-[280px] max-w-full"
            role="img"
            aria-label="Precio por edad para una persona"
          >
            <defs>
              <linearGradient id="price-age-primary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--primary-dark)" />
              </linearGradient>
              <linearGradient id="price-age-highlight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-warning)" />
                <stop offset="100%" stopColor="var(--primary)" />
              </linearGradient>
            </defs>
            {ageBars.map((bar) => (
              <g key={bar.age}>
                <rect
                  x={bar.x}
                  y={bar.y}
                  width={barWidth}
                  height={bar.height}
                  rx={4}
                  fill={
                    bar.isHighlight
                      ? "url(#price-age-highlight)"
                      : "url(#price-age-primary)"
                  }
                />
                <text
                  x={bar.x + barWidth / 2}
                  y={AGE_CHART_HEIGHT - 8}
                  textAnchor="middle"
                  className="fill-muted text-[9px] font-semibold"
                >
                  {bar.age}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </section>

      {/* Precio por cargas */}
      <section
        className={joinClasses(
          "rounded-2xl border bg-white p-4 sm:p-5",
          ui.border,
        )}
      >
        <h4 className="text-base font-bold text-primary-dark">
          Impacto de las cargas familiares
        </h4>
        <p className="mt-1 text-sm text-muted">
          Mismo cotizante
          {beneficiarySummary.contributor.age !== null
            ? ` (${beneficiarySummary.contributor.age} años)`
            : ""}
          , variando el número de cargas. Barras apiladas:{" "}
          <span className="font-medium text-primary-dark">verde = riesgo</span>,{" "}
          <span className="font-medium text-secondary">azul = GES</span>.
        </p>

        <div className="mt-4">
          <CargasStackedChart
            scenarios={cargasScenarios}
            highlightDependentCount={currentDependentCount}
          />
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {cargasScenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={joinClasses(
                "rounded-xl border px-3 py-2.5",
                scenario.dependentCount === currentDependentCount
                  ? "border-primary/35 bg-primary/5"
                  : ui.border,
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                {scenario.label}
              </p>
              <p className="mt-0.5 text-sm font-bold text-primary-dark">
                {formatPlanClp(scenario.priceClp)}
              </p>
              <p className="text-[11px] text-muted">
                Riesgo {formatQuotedUf(scenario.riskUf)} + GES{" "}
                {formatQuotedUf(scenario.gesUf)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* GES */}
      <section
        className={joinClasses(
          "rounded-2xl border border-secondary/25 bg-secondary-muted/40 p-4 sm:p-5",
          ui.border,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-base font-bold text-secondary">GES obligatorio</h4>
            <p className="mt-1 text-sm text-foreground">
              {formatQuotedUf(priceQuote.gesPremiumUfPerPerson)} por beneficiario al mes
            </p>
          </div>
          <span
            className={joinClasses(
              "rounded-full px-3 py-1 text-[11px] font-bold",
              accent.iconSecondary,
            )}
          >
            Copago fijo
          </span>
        </div>

        <p className="mt-3 rounded-lg border border-secondary/20 bg-white/70 px-3 py-2 text-[11px] leading-relaxed text-muted">
          <span className="font-semibold text-secondary">Observación:</span> el GES es
          obligatorio para todas las personas del plan,{" "}
          <span className="font-semibold text-foreground">
            excepto para menores de 2 años
          </span>
          , quienes no pagan este componente.
        </p>

        <p className="mt-3 text-xs text-muted">
          En tu grupo: {composition.gesBillableCount} de{" "}
          {composition.beneficiaryCount} persona
          {composition.beneficiaryCount === 1 ? "" : "s"} con GES · Total{" "}
          <span className="font-semibold text-secondary">
            {formatPlanClp(composition.gesClp)}
          </span>{" "}
          ({formatQuotedUf(composition.gesUf)})
        </p>

        <div className="mt-4 flex items-end gap-2">
          {gesScale.map((point) => {
            const height = Math.max(12, (point.gesClp / maxGesClp) * 72);
            return (
              <div
                key={point.beneficiaries}
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
              >
                <span className="text-[9px] font-bold text-secondary">
                  {formatAgePriceClpShort(point.gesClp)}
                </span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-secondary/90 to-secondary/50"
                  style={{ height }}
                />
                <span className="text-[10px] font-semibold text-muted">
                  {point.beneficiaries} pers.
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-xs leading-relaxed text-muted">
        Valores referenciales según tabla de factores de riesgo y GES vigente. El
        precio final puede variar según evaluación del ejecutivo.
      </p>
    </div>
  );
}
