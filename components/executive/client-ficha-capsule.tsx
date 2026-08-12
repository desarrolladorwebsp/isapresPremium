"use client";

import type { ReactNode } from "react";
import { joinClasses } from "@/lib/utils";

export type ClientFichaCapsuleField = {
  label: string;
  value: string;
};

export interface ClientFichaCapsuleProps {
  icon: ReactNode;
  title: string;
  description: string;
  /** Filas etiquetadas (preferido). */
  fields?: ClientFichaCapsuleField[];
  /** Fallback simple sin etiqueta. */
  bullets?: string[];
  ctaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  /** Se ignora: todas las cápsulas usan el mismo color navy. */
  accent?: string;
}

export function ClientFichaCapsule({
  icon,
  title,
  description,
  fields,
  bullets = [],
  ctaLabel,
  onClick,
  disabled = false,
}: ClientFichaCapsuleProps) {
  const rows =
    fields && fields.length > 0
      ? fields
      : bullets.map((value) => ({ label: "", value }));

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={joinClasses(
        "client-ficha-capsule group relative flex h-full min-h-[14.5rem] w-full flex-col overflow-hidden rounded-2xl border p-5 text-left shadow-card transition duration-200 sm:min-h-[15.5rem] sm:p-6",
        "border-[color-mix(in_srgb,var(--dash-navy,#092558)_14%,transparent)] bg-[color-mix(in_srgb,var(--dash-navy,#092558)_5%,white)]",
        "hover:-translate-y-0.5 hover:border-[color:var(--dash-navy)]/35 hover:shadow-card-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--dash-navy)]/30",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-[color:var(--dash-navy,#092558)] opacity-95 transition group-hover:opacity-100"
      />
      <div className="flex items-start gap-3.5">
        <div
          className={joinClasses(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ring-4 transition duration-200 sm:size-14",
            "bg-[color:var(--dash-navy,#092558)] ring-[color:var(--dash-navy)]/12",
            "group-hover:ring-[color:var(--dash-navy)]/20 group-hover:shadow-[0_8px_20px_-8px_rgb(9_37_88_/_0.4)]",
          )}
        >
          <span className="[&_svg]:size-6 [&_svg]:stroke-[2] sm:[&_svg]:size-7">
            {icon}
          </span>
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-[color:var(--dash-navy,#092558)] sm:text-sm">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
        </div>
      </div>

      <dl className="mt-4 flex-1 space-y-2">
        {rows.map((row, index) => {
          const emphasize = Boolean(row.label) && index === 0;
          return (
            <div
              key={`${row.label}-${row.value}-${index}`}
              className="flex min-w-0 items-baseline gap-2"
            >
              <span
                className="mt-[0.35rem] size-1.5 shrink-0 self-start rounded-full bg-[color:var(--dash-navy,#092558)] shadow-[0_0_0_3px_rgb(9_37_88_/_0.12)]"
                aria-hidden
              />
              {row.label ? (
                <dt className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--dash-navy,#092558)]/65">
                  {row.label}
                </dt>
              ) : null}
              <dd
                className={joinClasses(
                  "min-w-0 flex-1 truncate text-right leading-snug text-[color:var(--dash-navy,#092558)]",
                  emphasize
                    ? "text-sm font-bold sm:text-[15px]"
                    : "text-xs font-semibold sm:text-sm",
                )}
              >
                {row.value}
              </dd>
            </div>
          );
        })}
      </dl>

      <span
        className={joinClasses(
          "mt-5 inline-flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition",
          "bg-[color:var(--dash-navy,#092558)]/10 text-[color:var(--dash-navy,#092558)]",
          "group-hover:bg-[color:var(--dash-navy,#092558)] group-hover:text-white",
        )}
      >
        {ctaLabel}
        <span
          aria-hidden
          className="text-base leading-none transition group-hover:translate-x-0.5"
        >
          ›
        </span>
      </span>
    </button>
  );
}
