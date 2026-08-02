"use client";

import { isValidRut } from "@/lib/auth/rut";
import { joinClasses } from "@/lib/utils";

function IconRutWarning({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        d="M12 9v4M12 17h.01"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClientRutCell({ rut }: { rut?: string | null }) {
  const value = rut?.trim() || "";
  if (!value) {
    return <span className="text-sm text-muted">—</span>;
  }

  const invalid = !isValidRut(value);

  return (
    <span
      className={joinClasses(
        "inline-flex items-center gap-1.5 font-mono text-sm tabular-nums",
        invalid && "text-amber-900",
      )}
      title={invalid ? "RUT con dígito verificador incorrecto" : undefined}
    >
      {value}
      {invalid ? (
        <span
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"
          aria-label="RUT incorrecto"
        >
          <IconRutWarning className="size-3.5" />
        </span>
      ) : null}
    </span>
  );
}
