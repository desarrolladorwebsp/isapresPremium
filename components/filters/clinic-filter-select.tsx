"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { PlanCatalogClinicOption } from "@/lib/api/plan-clinics";
import { ClinicPickerModal } from "./clinic-picker-modal";

export interface ClinicFilterSelectProps {
  value: string[];
  onChange: (clinicIds: string[]) => void;
  options: PlanCatalogClinicOption[];
  loading?: boolean;
  error?: string | null;
  showSelectedHint?: boolean;
  modalTitle?: string;
  /** Contexto del hint cuando hay selección (hospitalaria / ambulatoria). */
  coverageContext?: "hospitalaria" | "ambulatoria";
  compactEmbed?: boolean;
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0" aria-hidden>
      <path
        d="M8 10l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0" aria-hidden>
      <path
        d="M4 20V8l8-4 8 4v12M9 20v-5h6v5M9 12h.01M15 12h.01M9 16h.01M15 16h.01"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatSelectionLabel(
  selected: PlanCatalogClinicOption[],
): string {
  if (selected.length === 0) return "Seleccionar prestador…";
  if (selected.length === 1) return selected[0].name;
  if (selected.length === 2) {
    return `${selected[0].name}, ${selected[1].name}`;
  }
  return `${selected.length} prestadores seleccionados`;
}

export function ClinicFilterSelect({
  value,
  onChange,
  options,
  loading = false,
  error = null,
  showSelectedHint = false,
  modalTitle = "Seleccionar prestador",
  coverageContext,
  compactEmbed = false,
}: ClinicFilterSelectProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const selected = useMemo(() => {
    const selectedSet = new Set(value);
    return options.filter((option) => selectedSet.has(option.id));
  }, [options, value]);

  function handleApply(clinicIds: string[]) {
    onChange(clinicIds);
  }

  function handleClear(event: MouseEvent) {
    event.stopPropagation();
    onChange([]);
  }

  const hasSelection = value.length > 0;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        disabled={loading}
        data-filter-control
        data-filter-active={hasSelection ? "true" : "false"}
        className={joinClasses(
          "flex w-full items-center gap-2 rounded-lg border px-3 text-left transition",
          compactEmbed ? "min-h-10 py-2 text-xs" : "min-h-11 py-2.5 text-sm",
          hasSelection
            ? "border-primary bg-primary/20 font-semibold text-primary-dark shadow-sm ring-2 ring-primary/35"
            : joinClasses(
                "border-border/70 bg-bg-layout/30",
                ui.hoverSurface,
              ),
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          loading && "cursor-wait opacity-70",
        )}
        aria-haspopup="dialog"
        aria-expanded={modalOpen}
      >
        <span className="text-primary-dark/70">
          <BuildingIcon />
        </span>
        <span
          className={joinClasses(
            "min-w-0 flex-1 truncate",
            hasSelection
              ? "font-semibold text-primary-dark"
              : "text-muted",
          )}
        >
          {loading
            ? "Cargando prestadores…"
            : formatSelectionLabel(selected)}
        </span>
        {hasSelection ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onChange([]);
              }
            }}
            className={joinClasses(
              "shrink-0 rounded-md px-2 text-[11px] font-semibold text-muted hover:bg-surface-hover hover:text-foreground",
              touchTarget,
            )}
            aria-label="Quitar filtro de clínicas"
          >
            Quitar
          </span>
        ) : (
          <span className="shrink-0 text-muted/70">
            <ChevronIcon />
          </span>
        )}
      </button>

      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {showSelectedHint && hasSelection ? (
        <p className="text-[11px] text-muted">
          {coverageContext
            ? `Filtrando cobertura ${coverageContext} en `
            : "Mostrando planes con cobertura en "}
          <span className="font-medium text-foreground">
            {selected.map((clinic) => clinic.name).join(", ")}
          </span>
          .
        </p>
      ) : null}

      <ClinicPickerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        options={options}
        value={value}
        onApply={handleApply}
        loading={loading}
      />
    </div>
  );
}
