"use client";

import { useMemo } from "react";
import {
  PLAN_TYPE_LABELS,
  resolvePrimaryPlanType,
} from "@/domain";
import {
  buildClinicCoverageRows,
  formatCoverageCell,
  resolveUrgenciaDisplay,
} from "@/lib/clinic-coverage-table";
import { horizontalScrollRail, safeWidth, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { HealthPlan } from "@/domain";
import type { PlanTypeFilterId } from "@/types/filters";
import {
  ModalRequestForm,
  type ModalRequestFormProps,
} from "./modal-request-form";

export interface ModalPlanOverviewPanelProps extends ModalRequestFormProps {
  plan: HealthPlan;
}

function ClinicCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0 text-primary" aria-hidden>
      <path
        d="M6 12.5 10 16.5 18 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function planTypeIntro(planType: PlanTypeFilterId): string {
  switch (planType) {
    case "preferred":
      return "Este plan es Preferente y está pensado para que idealmente te atiendas en los siguientes lugares de preferencia:";
    case "closed":
      return "Este plan es Cerrado. La cobertura aplica principalmente en la siguiente red de prestadores:";
    default:
      return "Este plan contempla libre elección. A continuación se muestran los prestadores con cobertura preferente o destacada en el plan:";
  }
}

export function ModalPlanOverviewPanel({
  plan,
  ...formProps
}: ModalPlanOverviewPanelProps) {
  const planType = resolvePrimaryPlanType(plan);
  const planTypeLabel = PLAN_TYPE_LABELS[planType];

  const clinicRows = useMemo(
    () => buildClinicCoverageRows(plan.coverage),
    [plan.coverage],
  );

  return (
    <div
      className={joinClasses(
        safeWidth,
        "grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-0",
      )}
    >
      {/* Coberturas — estilo QuePlan */}
      <section className="min-w-0 space-y-4 p-4 sm:p-6 lg:border-r lg:pr-6">
        <div>
          <h3 className="text-lg font-bold text-secondary sm:text-xl">
            Características de este plan
          </h3>
          <p className="mt-2 text-sm font-bold text-foreground">
            Cobertura {planTypeLabel}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {planTypeIntro(planType)}
          </p>
        </div>

        <div
          className={joinClasses(
            horizontalScrollRail,
            "rounded-xl border",
            ui.border,
          )}
        >
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-surface-hover/80 text-xs font-bold uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Prestador</th>
                <th className="px-3 py-3 text-center">Hospitalaria</th>
                <th className="px-3 py-3 text-center">Ambulatoria</th>
                <th className="px-3 py-3 text-center">Urgencia</th>
              </tr>
            </thead>
            <tbody>
              {clinicRows.length > 0 ? (
                clinicRows.map((row, index) => (
                  <tr
                    key={row.clinicId}
                    className={joinClasses(
                      "border-t",
                      ui.border,
                      index % 2 === 1 ? "bg-surface-hover/35" : "bg-white",
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <ClinicCheckIcon />
                        <span className="min-w-0">{row.clinicName}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold tabular-nums text-primary-dark">
                      {formatCoverageCell(row.hospitalaria)}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold tabular-nums text-secondary">
                      {formatCoverageCell(row.ambulatoria)}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold tabular-nums text-muted">
                      {resolveUrgenciaDisplay(row)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className={joinClasses("border-t", ui.border)}>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted">
                    Este plan aún no tiene prestadores cargados en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {planType === "free_choice" ? (
          <div
            className={joinClasses(
              "rounded-xl border bg-bg-layout/50 p-4",
              ui.border,
            )}
          >
            <p className="text-sm font-bold text-primary-dark">
              Cobertura Libre Elección
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Para el resto de los prestadores la cobertura es en modalidad libre
              elección, según las condiciones comerciales vigentes del plan y la
              evaluación de tu ejecutivo.
            </p>
          </div>
        ) : null}

        {plan.additional_notes ? (
          <p className="text-xs leading-relaxed text-muted">{plan.additional_notes}</p>
        ) : null}
      </section>

      {/* Formulario solicitar */}
      <aside className="min-w-0 p-4 sm:p-6 lg:bg-bg-layout/25 lg:pl-6">
        <ModalRequestForm {...formProps} variant="card" />
      </aside>
    </div>
  );
}
