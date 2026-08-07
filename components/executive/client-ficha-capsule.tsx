"use client";

import type { ReactNode } from "react";
import { joinClasses } from "@/lib/utils";

export interface ClientFichaCapsuleProps {
  icon: ReactNode;
  title: string;
  description: string;
  bullets: string[];
  ctaLabel: string;
  onClick: () => void;
  disabled?: boolean;
}

export function ClientFichaCapsule({
  icon,
  title,
  description,
  bullets,
  ctaLabel,
  onClick,
  disabled = false,
}: ClientFichaCapsuleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={joinClasses(
        "client-ficha-capsule group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-white p-5 text-left shadow-card transition duration-200",
        "hover:-translate-y-0.5 hover:border-[color:var(--dash-navy)]/35 hover:shadow-card-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--dash-navy)]/30",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[color:var(--dash-navy,#092558)] opacity-90 transition group-hover:opacity-100"
      />
      <div className="flex items-start gap-3.5">
        <div
          className={joinClasses(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md sm:size-14",
            "bg-[color:var(--dash-navy,#092558)]",
            "ring-4 ring-[color:var(--dash-navy)]/12 transition duration-200",
            "group-hover:ring-[color:var(--dash-navy)]/20 group-hover:shadow-[0_8px_20px_-8px_rgb(9_37_88_/_0.45)]",
          )}
        >
          <span className="[&_svg]:size-6 [&_svg]:stroke-[2] sm:[&_svg]:size-7">
            {icon}
          </span>
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-primary-dark">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
        </div>
      </div>
      <ul className="mt-4 flex-1 space-y-2">
        {bullets.map((bullet) => (
          <li
            key={bullet}
            className="flex items-start gap-2 text-xs leading-snug text-foreground"
          >
            <span
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[color:var(--dash-navy,#092558)] shadow-[0_0_0_3px_rgb(9_37_88_/_0.12)]"
              aria-hidden
            />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <span
        className={joinClasses(
          "mt-5 inline-flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition",
          "bg-primary-dark/8 text-primary-dark",
          "group-hover:bg-primary-dark group-hover:text-white",
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
