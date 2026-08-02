"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  buildBeneficiaryGroupSummary,
  formatRiskFactor,
  parseBeneficiaryAge,
} from "@/domain";
import { touchTarget, ui } from "@/lib/ui-tokens";
import { formatDependentsCountLabel } from "@/lib/beneficiary-display";
import {
  getPrimaryContributorAge,
  setPrimaryContributorAge,
} from "@/lib/beneficiary-state";
import { joinClasses } from "@/lib/utils";
import type {
  BeneficiaryGroupSummary,
  DependentBeneficiary,
  FamilyBeneficiariesState,
} from "@/domain";
import { DependentLoadsEditor } from "./dependent-loads-editor";
import { FactorBadge } from "./factor-badge";

export interface BeneficiariesFormProps {
  value: FamilyBeneficiariesState;
  onChange: (
    next: FamilyBeneficiariesState,
    summary: BeneficiaryGroupSummary,
  ) => void;
  className?: string;
  /** Oculta textos de ayuda del formulario (panel ejecutivo). */
  hideHelperText?: boolean;
  /** Estilo plano para el panel lateral ejecutivo. */
  executiveVisual?: boolean;
}

type ListRow = {
  id: string;
  age: number;
  role: "contributor" | "dependent";
  factor: number | null;
};

/** Oculta spinners nativos del input number (Chrome/Safari/Firefox). */
const ageInputNoSpinner =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function PersonGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5.5 18.5c1.4-3 3.7-4.5 6.5-4.5s5.1 1.5 6.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 7h14M10 7V5.5h4V7M8.5 7l.7 11h5.6l.7-11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GroupGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="9" cy="8" r="2.75" stroke="currentColor" strokeWidth="1.55" />
      <circle cx="16" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.55" />
      <path
        d="M3.75 18c1.1-2.5 2.9-3.75 5.25-3.75S13.15 15.5 14.25 18"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
      />
      <path
        d="M14.5 14.4c1.55.15 2.85.95 3.75 2.6"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusPersonGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="10" cy="8" r="2.75" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.5 18c1.1-2.4 2.8-3.6 5.5-3.6 1.35 0 2.5.3 3.45.85"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M17 11v6M14 14h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function buildListRows(
  value: FamilyBeneficiariesState,
  summary: BeneficiaryGroupSummary,
): ListRow[] {
  const contributorFactors = new Map(
    summary.contributors.map((person) => [person.id, person]),
  );
  const dependentFactors = new Map(
    summary.dependents.map((person) => [person.id, person]),
  );

  const rows: ListRow[] = [];

  for (const person of value.contributors) {
    if (person.age === null) continue;
    const factor = contributorFactors.get(person.id);
    rows.push({
      id: person.id,
      age: person.age,
      role: "contributor",
      factor: factor?.factor ?? null,
    });
  }

  for (const person of value.dependents) {
    if (person.age === null) continue;
    const factor = dependentFactors.get(person.id);
    rows.push({
      id: person.id,
      age: person.age,
      role: "dependent",
      factor: factor?.factor ?? null,
    });
  }

  return rows;
}

export function BeneficiariesForm({
  value,
  onChange,
  className,
  hideHelperText = false,
  executiveVisual = false,
}: BeneficiariesFormProps) {
  const [ageDraft, setAgeDraft] = useState("");
  const [justConfirmed, setJustConfirmed] = useState(false);

  const summary = useMemo(
    () => buildBeneficiaryGroupSummary(value),
    [value],
  );

  const confirmedDependents = useMemo(
    () => value.dependents.filter((dependent) => dependent.age !== null),
    [value.dependents],
  );

  const primaryAge = getPrimaryContributorAge(value);
  const parsedDraftAge = parseBeneficiaryAge(ageDraft);
  const canUseDraftAge = parsedDraftAge !== null && parsedDraftAge <= 120;

  useEffect(() => {
    if (!executiveVisual) {
      setAgeDraft(primaryAge !== null ? String(primaryAge) : "");
    }
  }, [executiveVisual, primaryAge]);

  useEffect(() => {
    if (!justConfirmed) return;
    const timer = window.setTimeout(() => setJustConfirmed(false), 1600);
    return () => window.clearTimeout(timer);
  }, [justConfirmed]);

  function emit(next: FamilyBeneficiariesState) {
    onChange(next, buildBeneficiaryGroupSummary(next));
  }

  function confirmContributorAge() {
    if (!canUseDraftAge || parsedDraftAge === null) return;
    setAgeDraft(String(parsedDraftAge));
    emit({
      ...setPrimaryContributorAge(value, parsedDraftAge),
      dependents: confirmedDependents,
    });
    setJustConfirmed(true);
  }

  function handleDependentsChange(
    nextDependents: FamilyBeneficiariesState["dependents"],
  ) {
    emit({
      ...value,
      dependents: nextDependents,
    });
  }

  function addPerson(role: "contributor" | "dependent") {
    if (!canUseDraftAge || parsedDraftAge === null) return;
    const nextPerson: DependentBeneficiary = {
      id: crypto.randomUUID(),
      age: parsedDraftAge,
    };

    if (role === "contributor") {
      emit({
        ...value,
        contributors: [...value.contributors, nextPerson],
      });
    } else {
      emit({
        ...value,
        dependents: [...confirmedDependents, nextPerson],
      });
    }

    setAgeDraft("");
  }

  function removePerson(row: ListRow) {
    if (row.role === "contributor") {
      emit({
        ...value,
        contributors: value.contributors.filter((person) => person.id !== row.id),
      });
      return;
    }

    emit({
      ...value,
      dependents: value.dependents.filter((person) => person.id !== row.id),
    });
  }

  if (executiveVisual) {
    const rows = buildListRows(value, summary);

    return (
      <section className={joinClasses("p-0", className)}>
        <header className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/12 text-primary">
              <GroupGlyph className="size-4" />
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wide text-primary-dark">
              Beneficiarios
            </h2>
          </div>
        </header>

        <div className="space-y-3">
          <div className="rounded-lg border border-border/70 bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block min-w-0 flex-1 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  Edad
                </span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  inputMode="numeric"
                  placeholder="0"
                  value={ageDraft}
                  onChange={(event) => setAgeDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addPerson("contributor");
                    }
                  }}
                  className={joinClasses(
                    "h-11 w-full rounded-lg px-3 text-base tabular-nums md:text-sm",
                    ageInputNoSpinner,
                    ui.input,
                  )}
                />
              </label>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <button
                  type="button"
                  onClick={() => addPerson("contributor")}
                  disabled={!canUseDraftAge}
                  className={joinClasses(
                    touchTarget,
                    "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-45",
                    canUseDraftAge
                      ? ui.cta
                      : joinClasses(ui.border, "bg-white text-muted"),
                  )}
                >
                  <PlusPersonGlyph className="size-4" />
                  Cotizante
                </button>
                <button
                  type="button"
                  onClick={() => addPerson("dependent")}
                  disabled={!canUseDraftAge}
                  className={joinClasses(
                    touchTarget,
                    "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-primary/35 bg-primary/10 px-3 text-xs font-bold text-primary-dark transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-45",
                  )}
                >
                  <PlusPersonGlyph className="size-4" />
                  Carga
                </button>
              </div>
            </div>
          </div>

          {rows.length > 0 ? (
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-0.5">
              {rows.map((row) => (
                <li
                  key={`${row.role}-${row.id}`}
                  className="flex items-center gap-2 rounded-lg border border-border/70 bg-white px-2.5 py-2 shadow-sm"
                >
                  <span className="inline-flex size-8 shrink-0 items-center justify-center text-primary">
                    <PersonGlyph className="size-5" />
                  </span>
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-bold tabular-nums text-primary-dark">
                    {row.age}
                  </span>
                  <span
                    className={joinClasses(
                      "inline-flex shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      row.role === "contributor"
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/15 text-primary-dark",
                    )}
                  >
                    {row.role === "contributor" ? "COT" : "CRG"}
                  </span>
                  <span className="ml-auto text-sm font-bold tabular-nums text-primary-dark">
                    {row.factor !== null ? formatRiskFactor(row.factor) : "—"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePerson(row)}
                    aria-label={
                      row.role === "contributor"
                        ? `Quitar cotizante de ${row.age} años`
                        : `Quitar carga de ${row.age} años`
                    }
                    className={joinClasses(
                      touchTarget,
                      "inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-danger-muted hover:text-accent-danger",
                    )}
                  >
                    <TrashGlyph className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
              Ingresa una edad y agrega cotizantes o cargas.
            </p>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary-dark/80">
              Total factores:
            </p>
            <p className="text-2xl font-bold tabular-nums tracking-tight text-primary-dark">
              {summary.totalFactors.toLocaleString("es-CL", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const isAgeCommitted =
    primaryAge !== null && ageDraft.trim() === String(primaryAge);
  const ageActionLabel =
    primaryAge !== null && !isAgeCommitted ? "Actualizar" : "Agregar";

  return (
    <section
      className={joinClasses(ui.surfaceCard, "p-5 sm:p-6", className)}
    >
      <header className="mb-6 space-y-1">
        <h2 className={joinClasses("text-sm font-bold tracking-tight", ui.sectionTitle)}>
          Beneficiarios
        </h2>
        {!hideHelperText ? (
          <p className="text-xs leading-relaxed text-muted">
            Cotizante y cargas según Tabla Única de Factores N°604.
          </p>
        ) : null}
      </header>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="contributor-age"
              className="text-xs font-medium uppercase tracking-wide text-primary-dark/80"
            >
              Cotizante principal
            </label>
            <div className="flex items-center gap-2">
              {isAgeCommitted || justConfirmed ? (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary-dark"
                  aria-live="polite"
                >
                  <svg viewBox="0 0 16 16" fill="none" className="size-3" aria-hidden>
                    <path
                      d="M3.5 8.5 6.5 11.5 12.5 4.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Agregado
                </span>
              ) : (
                <span className="text-[10px] text-muted/80">Obligatorio · 1</span>
              )}
            </div>
          </div>

          <div className={joinClasses("flex items-center gap-2 rounded-lg px-3 py-2.5", ui.borderHairline)}>
            <input
              id="contributor-age"
              type="number"
              min={0}
              max={120}
              inputMode="numeric"
              placeholder="Edad"
              value={ageDraft}
              onChange={(event) => {
                setJustConfirmed(false);
                setAgeDraft(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  confirmContributorAge();
                }
              }}
              className={joinClasses(
                "h-12 w-full min-w-0 flex-1 rounded-lg px-3 text-base tabular-nums md:h-10 md:text-sm",
                ageInputNoSpinner,
                ui.input,
                isAgeCommitted && "ring-2 ring-primary/30",
              )}
            />
            <button
              type="button"
              onClick={confirmContributorAge}
              disabled={!canUseDraftAge || isAgeCommitted}
              aria-label={`${ageActionLabel} edad del cotizante`}
              className={joinClasses(
                touchTarget,
                "h-12 shrink-0 rounded-lg px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 md:h-10",
                isAgeCommitted
                  ? "bg-primary/10 text-primary-dark"
                  : canUseDraftAge
                    ? ui.cta
                    : joinClasses(ui.border, "bg-white text-muted"),
              )}
            >
              {isAgeCommitted ? (
                <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden>
                  <path
                    d="M3.5 8.5 6.5 11.5 12.5 4.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                ageActionLabel
              )}
            </button>
            <FactorBadge factor={summary.contributor.factor} />
          </div>
          {!hideHelperText ? (
            <p className="text-[11px] text-muted">
              Escribe la edad y pulsa Agregar para recalcular los precios de los planes.
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-primary-dark/80">
              Cargas familiares
            </p>
            <span className="text-[10px] font-medium text-primary-dark/80">
              {formatDependentsCountLabel(confirmedDependents.length)}
            </span>
          </div>

          <DependentLoadsEditor
            dependents={confirmedDependents}
            onDependentsChange={handleDependentsChange}
            dependentFactors={summary.dependents}
            variant="form"
            hideEmptyHint={hideHelperText}
          />
        </div>

        <motion.div
          layout="position"
          className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-4"
        >
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary-dark/70">
                Resumen del grupo
              </p>
              <p className="text-sm text-foreground">
                <span className="font-bold tabular-nums text-primary-dark">
                  {summary.beneficiaryCount}
                </span>{" "}
                {summary.beneficiaryCount === 1
                  ? "beneficiario"
                  : "beneficiarios"}
              </p>
              {confirmedDependents.length > 0 ? (
                <p className="text-[11px] leading-snug text-muted">
                  Cargas:{" "}
                  {confirmedDependents
                    .map((dependent) => `${dependent.age} años`)
                    .join(" · ")}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-primary-dark/70">
                Factor total
              </p>
              <p className="text-2xl font-bold tabular-nums tracking-tight text-primary-dark">
                {summary.totalFactors.toLocaleString("es-CL", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
