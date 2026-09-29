"use client";

import { useMemo, useState } from "react";
import { AdminFormModal } from "@/components/admin/admin-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SentQuotationIsapreOption } from "@/lib/executive/sent-quotation-kpi";

export function IsapreMultiFilter({
  options,
  selectedIds,
  onChange,
  compact = false,
}: {
  options: SentQuotationIsapreOption[];
  /** Vacío = todas. */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const allSelected = selectedIds.length === 0;
  const labels = useMemo(() => {
    const map = new Map(options.map((option) => [option.id, option.label]));
    return map;
  }, [options]);
  const selectedLabel = allSelected
    ? "Todas las isapres"
    : selectedIds.length === 1
      ? labels.get(selectedIds[0]) ?? "1 isapre"
      : `${selectedIds.length} isapres`;
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es-CL");
    if (!needle) return options;
    return options.filter((option) =>
      option.label.toLocaleLowerCase("es-CL").includes(needle),
    );
  }, [options, query]);

  function toggle(id: string) {
    if (allSelected) {
      onChange([id]);
      return;
    }
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((value) => value !== id)
        : [...selectedIds, id],
    );
  }

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <div className={compact ? "min-w-0" : "min-w-0 space-y-2"}>
        {!compact ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Isapres
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border/80 bg-bg-layout/40 px-3 py-2 text-left transition hover:border-primary/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Filtrar cotizaciones por isapre"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-primary-dark">
              {selectedLabel}
            </span>
            {!compact ? (
              <span className="mt-0.5 block text-xs text-muted">
                {allSelected
                  ? "Una, varias o todas"
                  : "Toca para cambiar la selección"}
              </span>
            ) : null}
          </span>
          <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-primary-dark shadow-sm">
            Elegir
          </span>
        </button>
      </div>
      <AdminFormModal
        open={open}
        title="Filtrar por isapre"
        description="Una, varias o todas. Cambia enviadas, recepcionadas, aceptadas y rechazadas."
        onClose={close}
        size="md"
        overlayClassName="z-[60]"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={allSelected ? "primary" : "ghost"}
              onClick={() => onChange([])}
            >
              Todas
            </Button>
            <p className="text-xs text-muted">{selectedLabel}</p>
          </div>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar isapre…"
            aria-label="Buscar isapre"
          />
          <ul className="max-h-[min(22rem,50vh)] space-y-1 overflow-y-auto overscroll-y-contain rounded-xl border border-border/70 p-1.5">
            {visible.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-muted">
                Sin coincidencias.
              </li>
            ) : (
              visible.map((option) => {
                const checked = selectedIds.includes(option.id);
                return (
                  <li key={option.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-bg-layout/80">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-primary"
                        checked={allSelected || checked}
                        onChange={() => toggle(option.id)}
                      />
                      <span className="min-w-0 leading-snug text-primary-dark">
                        {option.label}
                      </span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>
          <div className="flex justify-end pt-1">
            <Button type="button" variant="primary" onClick={close}>
              Listo
            </Button>
          </div>
        </div>
      </AdminFormModal>
    </>
  );
}
