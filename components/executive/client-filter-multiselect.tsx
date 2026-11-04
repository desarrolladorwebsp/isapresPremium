"use client";

import { useEffect, useId, useRef, useState } from "react";
import { joinClasses } from "@/lib/utils";
import { ui } from "@/lib/ui-tokens";

type Option<T extends string> = { value: T; label: string };

/** Checkbox group: normal Tab/Space navigation, Escape and outside click close. */
export function ClientFilterMultiselect<T extends string>({
  label, summary, options, selected, onChange, resetValues, resetLabel = "Restablecer",
  hint,
}: {
  label: string;
  summary: string;
  options: readonly Option<T>[];
  selected: readonly T[];
  onChange: (values: T[]) => void;
  resetValues: readonly T[];
  resetLabel?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0 w-full sm:w-auto sm:min-w-[12rem]"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}>
      <button ref={triggerRef} type="button" aria-label={label}
        aria-expanded={open} aria-controls={panelId}
        onClick={() => setOpen(current => !current)}
        className={joinClasses("flex h-10 w-full max-w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm sm:h-9 sm:max-w-64", ui.input)}>
        <span className="truncate" title={summary}>{summary}</span>
        <span aria-hidden="true" className="text-[10px] text-muted">▾</span>
      </button>
      {open ? (
        <div id={panelId} role="group" aria-label={label}
          className="absolute left-0 z-30 mt-1 w-full rounded-xl border border-border bg-white p-2 shadow-lg sm:w-72">
          <p className="px-2 pb-1.5 text-xs font-semibold text-primary-dark">{label}</p>
          {hint ? <p className="px-2 pb-2 text-xs text-muted">{hint}</p> : null}
          <div className="max-h-64 overflow-y-auto overscroll-contain">
            {options.map(option => (
              <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-hover">
                <input type="checkbox" checked={selected.includes(option.value)}
                  onChange={() => onChange(selected.includes(option.value)
                    ? selected.filter(value => value !== option.value)
                    : [...selected, option.value])}
                  className="size-4 shrink-0 rounded border-border" />
                <span className="min-w-0 break-words">{option.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2">
            <button type="button" className="flex-1 rounded-md px-2 py-2 text-xs font-medium hover:bg-surface-hover"
              onClick={() => onChange([...resetValues])}>{resetLabel}</button>
            <button type="button" className="flex-1 rounded-md px-2 py-2 text-xs font-medium hover:bg-surface-hover"
              onClick={() => onChange(options.map(option => option.value))}>Seleccionar todos</button>
            <button type="button" className="rounded-md px-2 py-2 text-xs font-semibold text-primary hover:bg-surface-hover"
              onClick={() => { setOpen(false); triggerRef.current?.focus(); }}>Listo</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
