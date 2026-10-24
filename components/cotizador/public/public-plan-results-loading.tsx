"use client";

import { PLAN_LOADING_SKELETON_COUNT } from "@/lib/plan-search-config";
import { planCard, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

const placeholder = "rounded-md bg-primary/8";

function LoadingSpinner() {
  return (
    <span
      aria-hidden
      className="inline-block size-3.5 shrink-0 rounded-full border-2 border-primary/20 border-t-primary motion-safe:animate-spin"
    />
  );
}

function PlanCardSkeleton() {
  return (
    <div className={planCard.root} data-plan-loading-skeleton aria-hidden="true">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 border-b border-border px-3 py-3 sm:px-4">
        <div className="col-span-2 flex items-center gap-2.5">
          <div className={joinClasses(placeholder, "h-8 w-14 sm:h-11 sm:w-28")} />
          <div className={joinClasses(placeholder, "h-4 w-28")} />
          <div className={joinClasses(placeholder, "h-6 w-16")} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 self-center">
          <div className={joinClasses(placeholder, "h-6 w-20")} />
          <div className={joinClasses(placeholder, "h-6 w-14")} />
        </div>
        <div className="flex items-center gap-2 py-1">
          <div className={joinClasses(placeholder, "h-8 w-14")} />
          <div className={joinClasses(placeholder, "h-8 w-16")} />
        </div>
      </div>
      <div className={planCard.coverageGrid}>
        {[0, 1].map((section) => (
          <div key={section} className="space-y-3 px-3 py-4 sm:px-4">
            <div className="flex items-center justify-between gap-3">
              <div className={joinClasses(placeholder, "h-3 w-40 max-w-[75%]")} />
              <div className={joinClasses(placeholder, "h-6 w-10")} />
            </div>
            <div className={joinClasses(placeholder, "h-2 w-full")} />
            <div className={joinClasses(placeholder, "h-3 w-24")} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-border px-3 py-3 sm:flex sm:justify-end sm:px-4">
        <div className={joinClasses(placeholder, "h-12 sm:w-24")} />
        <div className={joinClasses(placeholder, "h-12 sm:w-28")} />
      </div>
    </div>
  );
}

export interface PublicPlanResultsLoadingProps {
  count?: number;
  message?: string;
  compact?: boolean;
}

export function PublicPlanResultsLoading({
  count = PLAN_LOADING_SKELETON_COUNT,
  message = "Buscando los mejores planes para ti…",
  compact = false,
}: PublicPlanResultsLoadingProps) {
  return (
    <div className="space-y-4 motion-safe:animate-fade-in" role="status" aria-live="polite" aria-busy="true">
      <div className={joinClasses("flex items-center gap-3 rounded-lg border bg-white", ui.border, compact ? "px-3 py-3" : "px-4 py-3")}>
        <LoadingSpinner />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary-dark">{message}</p>
          <p className="mt-0.5 text-xs text-muted">Comparando precios y coberturas</p>
        </div>
      </div>
      <div className={planCard.listStack}>
        {Array.from({ length: count }, (_, index) => <PlanCardSkeleton key={index} />)}
      </div>
    </div>
  );
}

export function PublicPlanResultsLoadingInline() {
  return (
    <span className="inline-flex h-5 shrink-0 items-center gap-1.5 text-[11px] font-medium text-primary" role="status" aria-live="polite">
      <LoadingSpinner />
      <span className="sr-only">Actualizando resultados</span>
      <span aria-hidden className="hidden min-[360px]:inline">Actualizando…</span>
    </span>
  );
}

export function PublicPlanDetailLoading() {
  return (
    <div className="min-h-64 space-y-5 p-4 sm:p-6" role="status" aria-live="polite" aria-busy="true" data-plan-detail-loading>
      <p className="flex items-center gap-2 text-sm text-muted"><LoadingSpinner /> Cargando coberturas del plan…</p>
      <div aria-hidden="true" className="space-y-4">
        <div className={joinClasses(placeholder, "h-5 w-44")} />
        {[0, 1, 2, 3].map((row) => <div key={row} className={joinClasses(placeholder, "h-9 w-full")} />)}
      </div>
    </div>
  );
}
