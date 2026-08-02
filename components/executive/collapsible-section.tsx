"use client";

import { useId, useState, type ReactNode } from "react";
import { joinClasses } from "@/lib/utils";

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={joinClasses(
        "mt-0.5 size-4 shrink-0 text-muted transition-transform duration-200",
        expanded && "rotate-180",
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface CollapsibleSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  className?: string;
  bodyClassName?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  description,
  defaultOpen = true,
  className,
  bodyClassName,
  headerRight,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 rounded-lg text-left transition hover:bg-surface-hover/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronIcon expanded={open} />
          <span className="min-w-0 py-0.5">
            <span className="block text-sm font-semibold text-foreground">
              {title}
            </span>
            {description ? (
              <span className="mt-1 block text-xs text-muted">{description}</span>
            ) : null}
          </span>
        </button>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {open ? headerRight : null}
          <button
            type="button"
            className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-hover"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? "Minimizar" : "Ampliar"}
          </button>
        </div>
      </div>

      {open ? (
        <div id={panelId} className={joinClasses("mt-4", bodyClassName)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
