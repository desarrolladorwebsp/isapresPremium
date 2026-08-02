"use client";

import {
  createClearedDashboardFilters,
  getActiveAmbulatoryClinicIds,
  getActiveHospitalClinicIds,
  ISAPRE_FILTER_OPTIONS,
  PLAN_TYPE_FILTER_OPTIONS,
  toggleCheckboxFilter,
  ZONE_FILTER_OPTIONS,
} from "@/domain";
import { FILTER_HELP } from "@/lib/filter-help-content";
import { touchTarget } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { PlanCatalogClinicOption } from "@/lib/api/plan-clinics";
import type { DashboardFiltersState } from "@/domain";
import { ClinicFilterSelect } from "./clinic-filter-select";
import { CoveragePercentageFilter } from "./coverage-percentage-filter";
import { FilterCheckboxList } from "./filter-checkbox-list";
import { FilterHelpBlock } from "./filter-info-tip";
import { FilterSection } from "./filter-section";
import { PriceFilterSection } from "./price-filter-section";

export interface DashboardFiltersPanelProps {
  value: DashboardFiltersState;
  onChange: (next: DashboardFiltersState) => void;
  className?: string;
  /** Oculta el bloque de cobertura hospitalaria/ambulatoria (widget embebido). */
  hideCoverageFilter?: boolean;
  /** Oculta el bloque de tipo de plan (widget embebido). */
  hidePlanTypeFilter?: boolean;
  /** Muestra buscador de clínica (cotizador principal y ejecutivos). */
  showClinicFilter?: boolean;
  clinicOptions?: PlanCatalogClinicOption[];
  clinicOptionsLoading?: boolean;
  clinicOptionsError?: string | null;
  /** Vista compacta para widget embebido en móvil. */
  compactEmbed?: boolean;
  priceMin?: number;
  priceMax?: number;
  ufToClp?: number;
  onPriceMinChange?: (value: number) => void;
  onPriceMaxChange?: (value: number) => void;
  defaultPriceMin?: number;
  defaultPriceMax?: number;
  /** Oculta textos de ayuda bajo cada bloque de filtro. */
  hideHelperText?: boolean;
  /** Estilo reforzado para el panel ejecutivo. */
  executiveVisual?: boolean;
  /** Oculta el botón interno (p. ej. si el sidebar provee uno propio). */
  showClearAction?: boolean;
}

export function DashboardFiltersPanel({
  value,
  onChange,
  className,
  hideCoverageFilter = false,
  hidePlanTypeFilter = false,
  showClinicFilter = false,
  clinicOptions = [],
  clinicOptionsLoading = false,
  clinicOptionsError = null,
  compactEmbed = false,
  priceMin,
  priceMax,
  ufToClp = 1,
  onPriceMinChange,
  onPriceMaxChange,
  defaultPriceMin,
  defaultPriceMax,
  hideHelperText = false,
  executiveVisual = false,
  showClearAction = true,
}: DashboardFiltersPanelProps) {
  const showPriceFilter =
    priceMin !== undefined &&
    priceMax !== undefined &&
    onPriceMinChange !== undefined &&
    onPriceMaxChange !== undefined;

  function update(partial: Partial<DashboardFiltersState>) {
    onChange({ ...value, ...partial });
  }

  function clearFilters() {
    onChange(createClearedDashboardFilters());

    if (
      showPriceFilter &&
      defaultPriceMin !== undefined &&
      defaultPriceMax !== undefined
    ) {
      onPriceMinChange(defaultPriceMin);
      onPriceMaxChange(defaultPriceMax);
    }
  }

  const coverageBlockClass = joinClasses(
    "space-y-3",
    !executiveVisual && "rounded-md border border-border bg-white p-3",
  );
  const ambulatoryCoverageBlockClass = joinClasses(
    "space-y-3",
    !executiveVisual && "rounded-md border border-border bg-white p-3",
    executiveVisual && "border-t border-border/40 pt-4",
  );

  return (
    <div className={className}>
      <div
        className={joinClasses(
          executiveVisual ? "divide-y divide-border/40" : "divide-y divide-border/50",
          compactEmbed && !executiveVisual && "max-md:divide-border/40",
        )}
      >
        {showClinicFilter ? (
          <FilterSection
            title="Clínicas y cobertura"
            description="Elige prestadores y umbrales mínimos por tipo de atención."
            compactEmbed={compactEmbed}
            hideDescription={hideHelperText}
            executiveVisual={executiveVisual}
            executiveAccent="primary"
            infoLabel="Información sobre filtro de clínicas"
            info={
              <FilterHelpBlock
                title="Prestadores y clínicas"
                paragraphs={[
                  "Puedes elegir clínicas distintas para cobertura hospitalaria y ambulatoria.",
                  "Si seleccionas dos o más clínicas, el plan debe incluir todas las seleccionadas de ese tipo.",
                  "Si defines un porcentaje junto con clínicas, cada clínica seleccionada debe cumplir ese mínimo.",
                ]}
                source={FILTER_HELP.coverage.source}
              />
            }
          >
            <div className="space-y-4">
              {hideCoverageFilter ? (
                <>
                  <ClinicFilterSelect
                    value={value.hospitalClinicIds}
                    onChange={(hospitalClinicIds) =>
                      update({ hospitalClinicIds })
                    }
                    options={clinicOptions}
                    loading={clinicOptionsLoading}
                    error={clinicOptionsError}
                    modalTitle="Clínicas hospitalarias"
                    coverageContext="hospitalaria"
                    compactEmbed={compactEmbed}
                    showSelectedHint
                  />
                  <ClinicFilterSelect
                    value={value.ambulatoryClinicIds}
                    onChange={(ambulatoryClinicIds) =>
                      update({ ambulatoryClinicIds })
                    }
                    options={clinicOptions}
                    loading={clinicOptionsLoading}
                    error={clinicOptionsError}
                    modalTitle="Clínicas ambulatorias"
                    coverageContext="ambulatoria"
                    compactEmbed={compactEmbed}
                    showSelectedHint
                  />
                </>
              ) : (
                <>
                  <div className={coverageBlockClass}>
                    <CoveragePercentageFilter
                      title="Cobertura hospitalaria"
                      value={value.hospitalCoveragePercent}
                      tone="hospital"
                      compactEmbed={compactEmbed}
                      onChange={(hospitalCoveragePercent) =>
                        update({ hospitalCoveragePercent })
                      }
                    />
                    <ClinicFilterSelect
                      value={value.hospitalClinicIds}
                      onChange={(hospitalClinicIds) =>
                        update({ hospitalClinicIds })
                      }
                      options={clinicOptions}
                      loading={clinicOptionsLoading}
                      error={clinicOptionsError}
                      modalTitle="Clínicas hospitalarias"
                      coverageContext="hospitalaria"
                      compactEmbed={compactEmbed}
                      showSelectedHint
                    />
                  </div>

                  <div className={ambulatoryCoverageBlockClass}>
                    <CoveragePercentageFilter
                      title="Cobertura ambulatoria"
                      value={value.ambulatoryCoveragePercent}
                      tone="ambulatory"
                      compactEmbed={compactEmbed}
                      onChange={(ambulatoryCoveragePercent) =>
                        update({ ambulatoryCoveragePercent })
                      }
                    />
                    <ClinicFilterSelect
                      value={value.ambulatoryClinicIds}
                      onChange={(ambulatoryClinicIds) =>
                        update({ ambulatoryClinicIds })
                      }
                      options={clinicOptions}
                      loading={clinicOptionsLoading}
                      error={clinicOptionsError}
                      modalTitle="Clínicas ambulatorias"
                      coverageContext="ambulatoria"
                      compactEmbed={compactEmbed}
                      showSelectedHint
                    />
                  </div>

                  {getActiveHospitalClinicIds(value).length > 0 ||
                  getActiveAmbulatoryClinicIds(value).length > 0 ? (
                    <p
                      className={joinClasses(
                        "text-[11px] leading-snug text-muted",
                        compactEmbed && "max-md:text-[10px]",
                      )}
                    >
                      Cada tipo de cobertura usa su propia selección de clínicas.
                      Si eliges varias, el plan debe incluirlas todas. Con
                      porcentaje, cada una debe cumplir ese mínimo.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </FilterSection>
        ) : null}

        <FilterSection
          title="Isapre"
          description="Selecciona una o más Isapres para acotar los resultados."
          compactEmbed={compactEmbed}
          hideDescription={hideHelperText}
          executiveVisual={executiveVisual}
          executiveAccent="primary"
          infoLabel="Información sobre Isapres"
          info={
            <FilterHelpBlock
              title={FILTER_HELP.isapre.title}
              paragraphs={FILTER_HELP.isapre.body}
              source={FILTER_HELP.isapre.source}
            />
          }
        >
          <FilterCheckboxList
            options={ISAPRE_FILTER_OPTIONS}
            state={value.isapres}
            idPrefix="filter-isapre"
            compactEmbed={compactEmbed}
            executiveVisual={executiveVisual}
            onToggle={(optionId, checked) =>
              update({
                isapres: toggleCheckboxFilter(value.isapres, optionId, checked),
              })
            }
          />
        </FilterSection>

        {hidePlanTypeFilter ? null : (
          <FilterSection
            title="Tipo de plan"
            description="Modalidad de contratación del plan de salud."
            compactEmbed={compactEmbed}
            hideDescription={hideHelperText}
            executiveVisual={executiveVisual}
            executiveAccent="secondary"
            infoLabel="Información sobre tipos de plan"
            info={
              <FilterHelpBlock
                title={FILTER_HELP.planType.title}
                paragraphs={FILTER_HELP.planType.paragraphs}
                items={FILTER_HELP.planType.items}
                footnote={FILTER_HELP.planType.footnote}
                source={FILTER_HELP.planType.source}
              />
            }
          >
            <FilterCheckboxList
              options={PLAN_TYPE_FILTER_OPTIONS}
              state={value.planTypes}
              idPrefix="filter-plan-type"
              compactEmbed={compactEmbed}
              executiveVisual={executiveVisual}
              onToggle={(optionId, checked) =>
                update({
                  planTypes: toggleCheckboxFilter(
                    value.planTypes,
                    optionId,
                    checked,
                  ),
                })
              }
            />
          </FilterSection>
        )}

        {showPriceFilter ? (
          <PriceFilterSection
            priceMin={priceMin}
            priceMax={priceMax}
            ufToClp={ufToClp}
            onPriceMinChange={onPriceMinChange}
            onPriceMaxChange={onPriceMaxChange}
            rangeMin={defaultPriceMin}
            rangeMax={defaultPriceMax}
            compactEmbed={compactEmbed}
            hideHelperText={hideHelperText}
            executiveVisual={executiveVisual}
          />
        ) : null}

        <FilterSection
          title="Zonas"
          description="Se sincroniza con la región del buscador. También puedes ajustar sectores RM, norte, Valparaíso, etc."
          compactEmbed={compactEmbed}
          hideDescription={hideHelperText}
          executiveVisual={executiveVisual}
          executiveAccent="neutral"
          infoLabel="Información sobre zonas y sectores geográficos"
          info={
            <FilterHelpBlock
              title={FILTER_HELP.zone.title}
              paragraphs={FILTER_HELP.zone.paragraphs}
              items={FILTER_HELP.zone.items}
              footnote={FILTER_HELP.zone.footnote}
              source={FILTER_HELP.zone.source}
            />
          }
        >
          <FilterCheckboxList
            options={ZONE_FILTER_OPTIONS}
            state={value.zones}
            idPrefix="filter-zone"
            scrollable
            compactEmbed={compactEmbed}
            executiveVisual={executiveVisual}
            onToggle={(optionId, checked) =>
              update({
                zones: toggleCheckboxFilter(value.zones, optionId, checked),
              })
            }
          />
        </FilterSection>

        {showClearAction ? (
          <div
            className={joinClasses(
              executiveVisual ? "py-4" : "py-4",
              compactEmbed && "max-md:py-3",
            )}
          >
            <button
              type="button"
              onClick={clearFilters}
              data-filters-clear
              className={joinClasses(
                "inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-semibold transition",
                executiveVisual
                  ? "text-muted hover:bg-surface-hover hover:text-foreground"
                  : joinClasses(
                      "border border-border/80 bg-bg-layout/40 text-muted hover:border-border hover:bg-surface-hover hover:text-foreground",
                    ),
                compactEmbed && "max-md:px-2.5 max-md:text-[11px]",
                touchTarget,
              )}
            >
              Limpiar filtros
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
