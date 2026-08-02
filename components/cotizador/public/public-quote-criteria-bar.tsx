"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { buildBeneficiaryGroupSummary, parseBeneficiaryAge } from "@/domain";
import { DependentLoadsEditor } from "@/components/beneficiaries/dependent-loads-editor";
import { ConfirmableFieldInput } from "@/components/cotizador/confirmable-field-input";
import {
  formatMonthlyIncomeForDisplay,
  normalizeIncomeDigits,
} from "@/lib/deep-link/income";
import { getMissingQuoteCriteriaFields } from "@/lib/quote-criteria-validation";
import {
  CONTRIBUTOR_TYPE_OPTIONS,
  type QuoteCriteria,
} from "@/lib/quote-criteria-options";
import {
  getConfirmedDependents,
} from "@/lib/beneficiary-display";
import {
  getPrimaryContributorAge,
  setPrimaryContributorAge,
} from "@/lib/beneficiary-state";
import { criteriaBar, safeWidth, touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import { CompanyAgreementValidationSection } from "@/components/cotizador/company-agreement";
import type {
  BeneficiaryGroupSummary,
  FamilyBeneficiariesState,
} from "@/domain";

export type { QuoteCriteria } from "@/lib/quote-criteria-options";
export { createDefaultQuoteCriteria } from "@/lib/quote-criteria-options";

export type CompanyAgreementVariant = "standalone" | "inline";

export interface PublicQuoteCriteriaBarProps {
  criteria: QuoteCriteria;
  onCriteriaChange: (patch: Partial<QuoteCriteria>) => void;
  beneficiaries: FamilyBeneficiariesState;
  onBeneficiariesChange: (
    next: FamilyBeneficiariesState,
    summary: BeneficiaryGroupSummary,
  ) => void;
  onCalculate: () => void;
  onResetAll?: () => void;
  /** Vista compacta para widget embebido en móvil. */
  compactEmbed?: boolean;
  /** Abre el panel de cargas cuando vienen prellenadas desde la URL. */
  showPreloadedDependents?: boolean;
  /** Muestra consulta de convenio empresa integrada en la tarjeta. */
  showCompanyAgreement?: boolean;
  partnerEntitySlug?: string;
}

const fieldClass = joinClasses(
  "h-12 w-full rounded-md border-0 bg-white px-3 text-base text-primary-dark shadow-sm ring-1 ring-border/80 focus:ring-2 focus:ring-primary/40",
);

const compactFieldClass =
  "max-md:h-9 max-md:rounded-md max-md:px-2.5 max-md:text-xs";

const labelClass = "text-sm font-semibold text-muted";

function isValidIncomeDraft(raw: string): boolean {
  const digits = normalizeIncomeDigits(raw);
  if (!digits) return false;
  const value = Number(digits);
  return Number.isFinite(value) && value > 0;
}

export function PublicQuoteCriteriaBar({
  criteria,
  onCriteriaChange,
  beneficiaries,
  onBeneficiariesChange,
  onCalculate,
  onResetAll,
  compactEmbed = false,
  showPreloadedDependents = false,
  showCompanyAgreement = true,
  partnerEntitySlug,
}: PublicQuoteCriteriaBarProps) {
  const primaryAge = getPrimaryContributorAge(beneficiaries);
  const [ageInput, setAgeInput] = useState(
    primaryAge !== null ? String(primaryAge) : "",
  );
  const [incomeInput, setIncomeInput] = useState(criteria.monthlyIncome);
  const [loadsOpen, setLoadsOpen] = useState(showPreloadedDependents);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const age = getPrimaryContributorAge(beneficiaries);
    setAgeInput(age !== null ? String(age) : "");
  }, [beneficiaries]);

  useEffect(() => {
    setIncomeInput(criteria.monthlyIncome);
  }, [criteria.monthlyIncome]);

  useEffect(() => {
    if (showPreloadedDependents && getConfirmedDependents(beneficiaries).length > 0) {
      setLoadsOpen(true);
    }
  }, [showPreloadedDependents, beneficiaries]);

  useEffect(() => {
    if (!loadsOpen) return;
    function handleClick(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setLoadsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [loadsOpen]);

  const emitBeneficiaries = useCallback(
    (next: FamilyBeneficiariesState) => {
      onBeneficiariesChange(next, buildBeneficiaryGroupSummary(next));
    },
    [onBeneficiariesChange],
  );

  const parsedAgeDraft = parseBeneficiaryAge(ageInput);
  const canConfirmAge =
    parsedAgeDraft !== null &&
    parsedAgeDraft >= 18 &&
    parsedAgeDraft <= 120;

  function confirmAge() {
    if (!canConfirmAge || parsedAgeDraft === null) return;
    setAgeInput(String(parsedAgeDraft));
    emitBeneficiaries({
      ...setPrimaryContributorAge(beneficiaries, parsedAgeDraft),
      dependents: getConfirmedDependents(beneficiaries),
    });
  }

  function updateContributorType(value: QuoteCriteria["contributorType"]) {
    onCriteriaChange({ contributorType: value });
  }

  const canConfirmIncome = isValidIncomeDraft(incomeInput);
  const committedIncomeDisplay = criteria.monthlyIncome.trim()
    ? formatMonthlyIncomeForDisplay(criteria.monthlyIncome) || criteria.monthlyIncome
    : "";

  function confirmIncome() {
    if (!canConfirmIncome) return;
    const formatted = formatMonthlyIncomeForDisplay(incomeInput);
    if (!formatted) return;
    setIncomeInput(formatted);
    onCriteriaChange({ monthlyIncome: formatted });
  }

  function emitDependents(nextDependents: FamilyBeneficiariesState["dependents"]) {
    emitBeneficiaries({
      ...beneficiaries,
      dependents: nextDependents,
    });
  }

  /** Confirma borradores válidos pendientes antes de buscar. */
  function commitPendingDrafts() {
    const committedPrimaryAge = getPrimaryContributorAge(beneficiaries);
    const ageNeedsCommit =
      canConfirmAge &&
      parsedAgeDraft !== null &&
      parsedAgeDraft !== committedPrimaryAge;

    if (ageNeedsCommit) {
      emitBeneficiaries({
        ...setPrimaryContributorAge(beneficiaries, parsedAgeDraft),
        dependents: getConfirmedDependents(beneficiaries),
      });
      setAgeInput(String(parsedAgeDraft));
    }

    const formattedIncome = canConfirmIncome
      ? formatMonthlyIncomeForDisplay(incomeInput)
      : "";
    const incomeNeedsCommit =
      Boolean(formattedIncome) &&
      formattedIncome !==
        (formatMonthlyIncomeForDisplay(criteria.monthlyIncome) ||
          criteria.monthlyIncome.trim());

    if (incomeNeedsCommit && formattedIncome) {
      setIncomeInput(formattedIncome);
      onCriteriaChange({ monthlyIncome: formattedIncome });
    }

    return {
      nextAge: ageNeedsCommit ? parsedAgeDraft : committedPrimaryAge,
      nextIncome: incomeNeedsCommit ? formattedIncome : criteria.monthlyIncome,
    };
  }

  const confirmedDependents = getConfirmedDependents(beneficiaries);
  const loadsCount = confirmedDependents.length;

  function handleSearchClick() {
    let nextAge = getPrimaryContributorAge(beneficiaries);
    let nextIncome = criteria.monthlyIncome;

    flushSync(() => {
      const committed = commitPendingDrafts();
      nextAge = committed.nextAge;
      nextIncome = committed.nextIncome;
    });

    const missing = getMissingQuoteCriteriaFields({
      criteria: {
        ...criteria,
        monthlyIncome: nextIncome,
      },
      beneficiaries: {
        ...setPrimaryContributorAge(beneficiaries, nextAge),
        dependents: confirmedDependents,
      },
    });

    if (missing.length > 0) {
      if (missing.includes("edad")) {
        document.getElementById("qc-age")?.focus();
      } else if (missing.includes("tipo de cotizante")) {
        document.getElementById("qc-contributor-type")?.focus();
      } else if (missing.includes("renta imponible")) {
        document.getElementById("qc-income")?.focus();
      }
      return;
    }

    onCalculate();
  }

  return (
    <section
      data-criteria-bar
      className={joinClasses(
        criteriaBar,
        compactEmbed && "max-md:rounded-lg max-md:p-3 max-md:shadow-none",
      )}
    >
      <div
        className={joinClasses(
          "flex w-full flex-col gap-3",
          compactEmbed
            ? "max-md:gap-y-2.5 sm:grid sm:grid-cols-2 sm:items-end"
            : joinClasses(
                "md:grid md:items-end md:gap-2 lg:gap-3 xl:gap-4",
                /* Edad | Tipo | Renta (más ancha) | Cargas (más compacta) | CTAs */
                "md:grid-cols-[minmax(0,8.5rem)_minmax(0,0.85fr)_minmax(0,14rem)_minmax(0,0.72fr)_auto_auto]",
                "xl:grid-cols-[minmax(0,8.5rem)_minmax(0,0.9fr)_minmax(0,15.5rem)_minmax(0,0.65fr)_auto_auto]",
              ),
        )}
      >
        {/* Edad */}
        <ConfirmableFieldInput
          id="qc-age"
          label="Edad"
          value={ageInput}
          committedValue={
            getPrimaryContributorAge(beneficiaries) !== null
              ? String(getPrimaryContributorAge(beneficiaries))
              : ""
          }
          onChange={setAgeInput}
          onConfirm={confirmAge}
          canConfirm={canConfirmAge}
          type="number"
          min={18}
          max={120}
          inputMode="numeric"
          placeholder="35"
          compact={compactEmbed}
          className={joinClasses(safeWidth, compactEmbed && "max-md:col-span-2")}
          inputClassName="text-center tabular-nums md:px-1.5 lg:px-2"
          confirmLabel="Agregar edad al cálculo"
        />

        {/* Tipo de cotizante */}
        <div
          className={joinClasses(
            safeWidth,
            "min-w-0 space-y-1.5",
            compactEmbed && "max-md:space-y-1",
          )}
        >
          <label
            htmlFor="qc-contributor-type"
            className={joinClasses(labelClass, compactEmbed && "max-md:text-[11px]")}
          >
            Tipo de cotizante
          </label>
          <select
            id="qc-contributor-type"
            value={criteria.contributorType}
            onChange={(event) =>
              updateContributorType(
                event.target.value as QuoteCriteria["contributorType"],
              )
            }
            className={joinClasses(fieldClass, compactEmbed && compactFieldClass)}
          >
            <option value="">Selecciona...</option>
            {CONTRIBUTOR_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Renta imponible */}
        <ConfirmableFieldInput
          id="qc-income"
          label="Renta imponible"
          value={incomeInput}
          committedValue={committedIncomeDisplay}
          onChange={setIncomeInput}
          onConfirm={confirmIncome}
          canConfirm={canConfirmIncome}
          type="text"
          inputMode="numeric"
          placeholder="Ej: $1.200.000"
          compact={compactEmbed}
          className={safeWidth}
          confirmLabel="Agregar renta imponible"
          onBlur={() => {
            if (!incomeInput.trim()) return;
            const formatted = formatMonthlyIncomeForDisplay(incomeInput);
            if (formatted) setIncomeInput(formatted);
          }}
        />

        {/* Cargas médicas */}
        <div
          ref={popoverRef}
          className={joinClasses(
            safeWidth,
            "relative min-w-0 space-y-1.5",
            compactEmbed && "max-md:space-y-1",
          )}
        >
          <p
            className={joinClasses(labelClass, compactEmbed && "max-md:text-[11px]")}
          >
            Cargas médicas
          </p>
          <button
            type="button"
            onClick={() => setLoadsOpen((open) => !open)}
            data-criteria-loads
            className={joinClasses(
              touchTarget,
              "flex h-12 w-full items-center gap-2 rounded-md border border-dashed border-primary/40 bg-white px-3 text-base font-semibold text-primary-dark transition hover:bg-primary/5",
              !compactEmbed && "md:px-2.5 lg:px-3",
              compactEmbed &&
                "max-md:h-9 max-md:min-h-10 max-md:rounded-md max-md:px-2.5 max-md:text-xs",
            )}
          >
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={joinClasses(
                  "size-4 shrink-0",
                  compactEmbed && "max-md:size-3.5",
                )}
                aria-hidden
              >
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="truncate md:hidden">Gestionar cargas</span>
              <span className="hidden truncate md:inline xl:hidden">Cargas</span>
              <span className="hidden truncate xl:inline">Gestionar cargas</span>
              {loadsCount > 0 ? (
                <span className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-[10px] text-white">
                  {loadsCount}
                </span>
              ) : null}
            </span>
          </button>

          {loadsOpen ? (
            <div
              className={joinClasses(
                "absolute right-0 top-full z-20 mt-2 rounded-lg border bg-white p-4 shadow-xl",
                compactEmbed
                  ? "left-0 w-full max-md:p-3"
                  : "w-[min(100vw-2rem,20rem)]",
                ui.border,
              )}
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
                Cargas médicas
              </p>
              <DependentLoadsEditor
                dependents={confirmedDependents}
                onDependentsChange={(dependents) => emitDependents(dependents)}
                variant="popover"
              />
            </div>
          ) : null}
        </div>

        {/* Buscar mejor plan */}
        <button
          type="button"
          onClick={handleSearchClick}
          data-criteria-cta
          className={joinClasses(
            touchTarget,
            "h-12 w-full shrink-0 rounded-md px-5 text-base font-extrabold text-white transition",
            !compactEmbed &&
              "md:h-14 md:min-w-[12.5rem] md:whitespace-nowrap md:px-7 md:text-lg xl:min-w-[14rem] xl:px-8",
            compactEmbed && "max-md:h-10 max-md:px-4 max-md:text-xs sm:col-span-2",
            ui.cta,
          )}
        >
          {compactEmbed ? (
            <>
              <span className="md:hidden">Buscar plan</span>
              <span className="hidden md:inline">Buscar mejor plan</span>
            </>
          ) : (
            <>
              <span className="xl:hidden">Buscar plan</span>
              <span className="hidden xl:inline">Buscar mejor plan</span>
            </>
          )}
        </button>

        {/* Limpiar todo */}
        {onResetAll ? (
          <button
            type="button"
            onClick={onResetAll}
            data-criteria-secondary
            className={joinClasses(
              touchTarget,
              "h-12 w-full shrink-0 rounded-md border px-4 text-sm font-semibold",
              !compactEmbed && "md:w-auto md:whitespace-nowrap md:px-3.5 xl:px-4",
              compactEmbed && "max-md:h-10 max-md:px-4 max-md:text-xs sm:col-span-2",
              ui.border,
              "bg-white text-primary-dark transition hover:border-primary/35 hover:bg-surface-hover",
            )}
          >
            {compactEmbed ? (
              <>
                <span className="md:hidden">Limpiar</span>
                <span className="hidden md:inline">Limpiar todo</span>
              </>
            ) : (
              <>
                <span className="xl:hidden">Limpiar</span>
                <span className="hidden xl:inline">Limpiar todo</span>
              </>
            )}
          </button>
        ) : null}
      </div>

      {showCompanyAgreement ? (
        <CompanyAgreementValidationSection
          variant="inline"
          compactEmbed={compactEmbed}
          source="public"
          partnerEntitySlug={partnerEntitySlug}
        />
      ) : null}
    </section>
  );
}
