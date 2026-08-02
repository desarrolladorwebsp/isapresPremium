"use client";

import { formatPlanClp, formatPlanUf } from "@/domain";
import { joinClasses } from "@/lib/utils";
import { FilterSection } from "./filter-section";
import { FilterHelpBlock } from "./filter-info-tip";

export interface PriceFilterSectionProps {
  priceMin: number;
  priceMax: number;
  ufToClp: number;
  onPriceMinChange: (value: number) => void;
  onPriceMaxChange: (value: number) => void;
  rangeMin?: number;
  rangeMax?: number;
  compactEmbed?: boolean;
  hideHelperText?: boolean;
  executiveVisual?: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function PriceFilterSection({
  priceMin,
  priceMax,
  ufToClp,
  onPriceMinChange,
  onPriceMaxChange,
  rangeMin = 2,
  rangeMax = 8,
  compactEmbed = false,
  hideHelperText = false,
  executiveVisual = false,
}: PriceFilterSectionProps) {
  const sliderMin = Math.min(rangeMin, rangeMax);
  const sliderMax = Math.max(rangeMin, rangeMax);
  const span = Math.max(sliderMax - sliderMin, 0.0001);
  const startPct = clamp(((priceMin - sliderMin) / span) * 100, 0, 100);
  const endPct = clamp(((priceMax - sliderMin) / span) * 100, 0, 100);

  return (
    <FilterSection
      title="Precio"
      description="Ajusta el rango de precio en UF. Los resultados se actualizan al instante."
      compactEmbed={compactEmbed}
      hideDescription={hideHelperText}
      executiveVisual={executiveVisual}
      executiveAccent="primary"
      infoLabel="Información sobre filtro de precio"
      info={
        <FilterHelpBlock
          title="Rango de precio"
          paragraphs={[
            "El precio mostrado corresponde al plan base en UF antes de factores de riesgo y cargas.",
            "Usa los controles para acotar los planes según tu presupuesto.",
          ]}
        />
      }
    >
      <div className="space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-muted">
            Rango seleccionado
          </span>
          <span
            className={joinClasses(
              "rounded-md px-2.5 py-1 text-[10px] font-bold tabular-nums",
              executiveVisual
                ? "bg-surface-hover text-primary-dark"
                : "bg-primary/8 text-primary-dark",
            )}
          >
            {formatPlanClp(priceMin * ufToClp)} –{" "}
            {formatPlanClp(priceMax * ufToClp)}
          </span>
        </div>

        <div
          data-price-range
          className={joinClasses(
            "rounded-md border px-3 py-3",
            executiveVisual
              ? "border-border/50 bg-white/70"
              : "border-border/60 bg-bg-layout/25",
          )}
        >
          <div className="mb-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Desde
              </p>
              <p className="truncate text-sm font-bold tabular-nums text-primary-dark">
                {formatPlanUf(priceMin)} UF
              </p>
            </div>
            <div className="h-px flex-1 bg-border/70" aria-hidden />
            <div className="min-w-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Hasta
              </p>
              <p className="truncate text-sm font-bold tabular-nums text-primary-dark">
                {formatPlanUf(priceMax)} UF
              </p>
            </div>
          </div>

          <div className="relative h-8">
            <div
              data-price-track
              className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full"
              aria-hidden
            />
            <div
              data-price-track-active
              className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
              style={{ left: `${startPct}%`, width: `${Math.max(endPct - startPct, 0)}%` }}
              aria-hidden
            />

            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={0.1}
              value={priceMin}
              onChange={(event) =>
                onPriceMinChange(Math.min(Number(event.target.value), priceMax))
              }
              data-price-slider="min"
              className="price-range-input absolute inset-0 z-20 m-0 h-8 w-full cursor-pointer appearance-none bg-transparent"
              aria-label="Precio mínimo"
            />
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={0.1}
              value={priceMax}
              onChange={(event) =>
                onPriceMaxChange(Math.max(Number(event.target.value), priceMin))
              }
              data-price-slider="max"
              className="price-range-input absolute inset-0 z-30 m-0 h-8 w-full cursor-pointer appearance-none bg-transparent"
              aria-label="Precio máximo"
            />
          </div>
        </div>
      </div>
    </FilterSection>
  );
}
