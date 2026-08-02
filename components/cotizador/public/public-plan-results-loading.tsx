"use client";

import { motion } from "framer-motion";
import { PLAN_LOADING_SKELETON_COUNT } from "@/lib/plan-search-config";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

const skeletonPulse = "animate-pulse rounded-lg bg-foreground/8";

function PlanCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      className={joinClasses(
        "overflow-hidden rounded-xl border bg-white",
        ui.border,
      )}
    >
      <div
        className={joinClasses(
          "relative flex flex-col gap-3 overflow-hidden border-b px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4",
          ui.border,
        )}
      >
        <motion.div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        />
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className={joinClasses(skeletonPulse, "size-10 shrink-0 rounded-lg")} />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className={joinClasses(skeletonPulse, "h-4 w-3/4 max-w-[14rem]")} />
            <div className="flex flex-wrap gap-2">
              <div className={joinClasses(skeletonPulse, "h-6 w-20")} />
              <div className={joinClasses(skeletonPulse, "h-6 w-16")} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className={joinClasses(skeletonPulse, "h-10 w-16")} />
          <div className={joinClasses(skeletonPulse, "h-10 w-20")} />
        </div>
      </div>

      <div className="grid gap-3 px-3 py-3 sm:grid-cols-2 sm:px-4">
        <div className={joinClasses(skeletonPulse, "h-12 w-full")} />
        <div className={joinClasses(skeletonPulse, "h-12 w-full")} />
      </div>
    </motion.div>
  );
}

function LoadingSpinner() {
  return (
    <div className="relative size-11" aria-hidden>
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary/20"
        animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 motion-safe:animate-spin rounded-full border-2 border-transparent border-t-primary" />
      <div className="absolute inset-[18%] motion-safe:animate-spin rounded-full border-2 border-transparent border-b-primary/50 [animation-duration:1.2s] [animation-direction:reverse]" />
    </div>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="size-1.5 rounded-full bg-primary"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: index * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
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
    <div
      className="flex flex-col gap-4 motion-safe:animate-fade-in"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <div
        className={joinClasses(
          "relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-white to-sky-50/80 text-center",
          ui.border,
          compact ? "px-5 py-6" : "px-6 py-7",
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-2xl bg-primary/10">
          <motion.div
            className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
            animate={{ x: ["-120%", "420%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner />
          <div className="space-y-1.5">
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-primary-dark">
              {message}
              <LoadingDots />
            </p>
            <p className="text-xs text-muted">
              Comparando precios y coberturas de las Isapres
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: count }, (_, index) => (
          <PlanCardSkeleton key={index} index={index} />
        ))}
      </div>
    </div>
  );
}

export function PublicPlanResultsLoadingInline({
  message = "Actualizando resultados…",
}: {
  message?: string;
}) {
  return (
    <div
      className={joinClasses(
        "flex items-center justify-center gap-3 rounded-xl border bg-white px-4 py-3",
        ui.border,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingSpinner />
      <p className="flex items-center gap-2 text-sm font-medium text-muted">
        {message}
        <LoadingDots />
      </p>
    </div>
  );
}
