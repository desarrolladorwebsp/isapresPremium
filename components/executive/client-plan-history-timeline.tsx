"use client";

import { motion } from "framer-motion";
import { formatQuoteDate } from "@/lib/quote/quote-display";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type {
  ClientActivityRecord,
  ClientActivityType,
} from "@/types/client-activity";

const ACTIVITY_LABELS: Record<ClientActivityType, string> = {
  PLAN_CHANGED: "Cambio de plan",
  ADVISED_PLAN_CLEARED: "Plan asesorado removido",
};

const ACTIVITY_TONES: Record<ClientActivityType, string> = {
  PLAN_CHANGED: "bg-primary/10 text-primary-dark",
  ADVISED_PLAN_CLEARED: "bg-amber-500/10 text-amber-800",
};

export interface ClientPlanHistoryTimelineProps {
  activities: ClientActivityRecord[];
  loading?: boolean;
}

export function ClientPlanHistoryTimeline({
  activities,
  loading = false,
}: ClientPlanHistoryTimelineProps) {
  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-muted">
        Cargando historial de planes…
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div
        className={joinClasses(
          "rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted",
          ui.border,
        )}
      >
        Aún no hay cambios de plan registrados.
      </div>
    );
  }

  return (
    <ol className="relative space-y-0">
      {activities.map((activity, index) => (
        <motion.li
          key={activity.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.04, duration: 0.25 }}
          className="relative flex gap-4 pb-5 last:pb-0"
        >
          {index < activities.length - 1 ? (
            <span
              className="absolute left-[0.6875rem] top-8 h-[calc(100%-1rem)] w-px bg-border"
              aria-hidden
            />
          ) : null}

          <span
            className={joinClasses(
              "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
              ACTIVITY_TONES[activity.activityType],
            )}
            aria-hidden
          >
            {index + 1}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={joinClasses(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                  ACTIVITY_TONES[activity.activityType],
                )}
              >
                {ACTIVITY_LABELS[activity.activityType]}
              </span>
              <time
                className="text-xs tabular-nums text-muted"
                dateTime={activity.createdAt}
              >
                {formatQuoteDate(activity.createdAt)}
              </time>
            </div>

            {activity.description ? (
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {activity.description}
              </p>
            ) : null}

            {activity.previousValue || activity.newValue ? (
              <p className="mt-1 text-xs text-muted">
                {activity.previousValue ?? "—"} → {activity.newValue ?? "—"}
              </p>
            ) : null}

            {activity.actorName ? (
              <p className="mt-2 text-xs text-muted">
                Por{" "}
                <span className="font-medium text-foreground">
                  {activity.actorName}
                </span>
              </p>
            ) : null}
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
