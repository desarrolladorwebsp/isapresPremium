"use client";

import { useState } from "react";
import { parseBeneficiaryAge } from "@/domain";
import { touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { DependentBeneficiary, PersonRiskFactor } from "@/types/beneficiary";
import { FactorBadge } from "./factor-badge";

export interface DependentLoadsEditorProps {
  dependents: DependentBeneficiary[];
  onDependentsChange: (dependents: DependentBeneficiary[]) => void;
  variant?: "popover" | "form";
  dependentFactors?: PersonRiskFactor[];
  hideEmptyHint?: boolean;
}

function sanitizeDependents(dependents: DependentBeneficiary[]) {
  return dependents.filter((dependent) => dependent.age !== null);
}

export function DependentLoadsEditor({
  dependents,
  onDependentsChange,
  variant = "form",
  dependentFactors = [],
  hideEmptyHint = false,
}: DependentLoadsEditorProps) {
  const [draftAge, setDraftAge] = useState("");
  const confirmedDependents = sanitizeDependents(dependents);
  const parsedDraftAge = parseBeneficiaryAge(draftAge);
  const canAddDraft = parsedDraftAge !== null;
  const isPopover = variant === "popover";

  function addDependentFromDraft() {
    if (parsedDraftAge === null) return;

    onDependentsChange([
      ...confirmedDependents,
      { id: crypto.randomUUID(), age: parsedDraftAge },
    ]);
    setDraftAge("");
  }

  function removeDependent(id: string) {
    onDependentsChange(
      confirmedDependents.filter((dependent) => dependent.id !== id),
    );
  }

  return (
    <div className={joinClasses("space-y-3", isPopover && "space-y-2")}>
      {confirmedDependents.length > 0 ? (
        <ul className={joinClasses("space-y-2", isPopover && "space-y-1.5")}>
          {confirmedDependents.map((dependent, index) => {
            const personFactor = dependentFactors.find(
              (person) => person.id === dependent.id,
            );

            return (
              <li
                key={dependent.id}
                className={joinClasses(
                  "flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2",
                  !isPopover && "py-2.5",
                )}
              >
                <span
                  className={joinClasses(
                    "inline-flex min-w-0 flex-1 items-center gap-2 text-sm text-foreground",
                    isPopover && "text-xs",
                  )}
                >
                  <span className="font-semibold text-primary-dark">
                    Carga {index + 1}
                  </span>
                  <span className="text-muted">·</span>
                  <span className="font-bold tabular-nums">
                    {dependent.age} años
                  </span>
                </span>
                {!isPopover ? (
                  <FactorBadge factor={personFactor?.factor ?? null} />
                ) : null}
                <button
                  type="button"
                  onClick={() => removeDependent(dependent.id)}
                  aria-label={`Quitar carga ${index + 1}`}
                  className={joinClasses(
                    "shrink-0 text-xs font-semibold text-muted transition hover:text-accent-danger",
                    !isPopover && touchTarget,
                  )}
                >
                  Quitar
                </button>
              </li>
            );
          })}
        </ul>
      ) : hideEmptyHint ? null : (
        <p className={joinClasses("text-xs text-muted/80", isPopover && "text-[11px]")}>
          Aún no hay cargas agregadas. Ingresa la edad y pulsa Agregar.
        </p>
      )}

      <div
        className={joinClasses(
          "flex items-center gap-2",
          !isPopover && "rounded-lg border border-dashed border-primary/25 p-3",
        )}
      >
        <input
          type="number"
          min={0}
          max={120}
          inputMode="numeric"
          placeholder={isPopover ? "Edad de la carga" : "Edad"}
          aria-label="Edad de la nueva carga"
          value={draftAge}
          onChange={(event) => setDraftAge(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addDependentFromDraft();
            }
          }}
          className={joinClasses(
            "h-10 min-w-0 flex-1 rounded-lg px-3 text-sm tabular-nums",
            !isPopover && "h-12 text-base md:h-10 md:text-sm",
            ui.input,
          )}
        />
        <button
          type="button"
          onClick={addDependentFromDraft}
          disabled={!canAddDraft}
          className={joinClasses(
            touchTarget,
            "shrink-0 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
            isPopover ? "h-10 px-3 text-xs" : "h-12 md:h-10",
            canAddDraft ? ui.cta : joinClasses(ui.border, "bg-white text-muted"),
          )}
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
