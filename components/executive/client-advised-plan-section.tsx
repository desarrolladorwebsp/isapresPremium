"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientPlanHistoryTimeline } from "@/components/executive/client-plan-history-timeline";
import { ClientPlanSummary } from "@/components/executive/client-plan-summary";
import { CollapsibleSection } from "@/components/executive/collapsible-section";
import {
  assignClientPlan,
  fetchClientActivities,
  fetchPlans,
  unassignClientPlan,
  updateClientAdvisedPlan,
} from "@/lib/api/admin-client";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { ClientActivityRecord } from "@/types/client-activity";
import type { ClientPlanSnapshot } from "@/types/client-plan";
import type { UserRecord } from "@/types/user";
import type { HealthPlan } from "@/types/plan";

export interface ClientAdvisedPlanSectionProps {
  client: UserRecord;
  onUpdated: (client: UserRecord) => void;
  onNotify: (message: string, tone?: "success" | "error") => void;
  /** Sin card ni título (modal de ficha). */
  bare?: boolean;
}

export function ClientAdvisedPlanSection({
  client,
  onUpdated,
  onNotify,
  bare = false,
}: ClientAdvisedPlanSectionProps) {
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [activities, setActivities] = useState<ClientActivityRecord[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  const assignedPlans = client.assignedPlans ?? [];
  const chosenCode = client.advisedPlan?.planCode ?? null;

  useEffect(() => {
    setNotes("");
  }, [client.id]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [catalog, nextActivities] = await Promise.all([
          fetchPlans(),
          fetchClientActivities(client.id),
        ]);
        if (!cancelled) {
          setPlans(catalog);
          setActivities(nextActivities);
        }
      } catch {
        if (!cancelled) {
          onNotify("No se pudieron cargar los planes del catálogo.", "error");
        }
      } finally {
        if (!cancelled) {
          setLoadingPlans(false);
          setLoadingActivities(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client.id, onNotify]);

  const assignedCodes = useMemo(
    () => new Set(assignedPlans.map((plan) => plan.planCode)),
    [assignedPlans],
  );

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    const pool = plans.filter((plan) => !assignedCodes.has(plan.unique_code));
    if (!query) return pool.slice(0, 8);

    return pool
      .filter((plan) =>
        [plan.plan_name, plan.unique_code, plan.isapre]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 8);
  }, [plans, search, assignedCodes]);

  async function refreshActivities() {
    const nextActivities = await fetchClientActivities(client.id);
    setActivities(nextActivities);
  }

  async function handleAddPlan(planCode: string, setAsChosen: boolean) {
    setBusyCode(planCode);
    try {
      const updated = await assignClientPlan(client.id, {
        planCode,
        notes: notes.trim() || null,
        setAsChosen,
      });
      onUpdated(updated);
      setNotes("");
      setSearch("");
      await refreshActivities();
      onNotify(
        setAsChosen
          ? "Plan agregado y marcado como elegido."
          : "Plan agregado a la propuesta.",
      );
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo agregar el plan.",
        "error",
      );
    } finally {
      setBusyCode(null);
    }
  }

  async function handleChoosePlan(plan: ClientPlanSnapshot) {
    if (plan.planCode === chosenCode) return;
    setBusyCode(plan.planCode);
    try {
      const updated = await updateClientAdvisedPlan(client.id, {
        planCode: plan.planCode,
        notes: notes.trim() || null,
      });
      onUpdated(updated);
      setNotes("");
      await refreshActivities();
      onNotify("Plan elegido actualizado.");
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo marcar el plan elegido.",
        "error",
      );
    } finally {
      setBusyCode(null);
    }
  }

  async function handleRemovePlan(plan: ClientPlanSnapshot) {
    setBusyCode(plan.planCode);
    try {
      const updated = await unassignClientPlan(client.id, plan.planCode);
      onUpdated(updated);
      await refreshActivities();
      onNotify("Plan eliminado de la propuesta.");
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el plan.",
        "error",
      );
    } finally {
      setBusyCode(null);
    }
  }

  async function handleClearChosen() {
    if (!chosenCode) return;
    setBusyCode(chosenCode);
    try {
      const updated = await updateClientAdvisedPlan(client.id, {
        planCode: null,
        notes: notes.trim() || null,
      });
      onUpdated(updated);
      setNotes("");
      await refreshActivities();
      onNotify("Se quitó el plan elegido (los demás planes siguen asignados).");
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo quitar el plan elegido.",
        "error",
      );
    } finally {
      setBusyCode(null);
    }
  }

  return (
    <CollapsibleSection
      title="Planes del cliente"
      description={
        bare
          ? undefined
          : "Puedes asignar varios planes a la propuesta y marcar uno como elegido."
      }
      defaultOpen={bare ? true : false}
      hideIntro={bare}
      className={
        bare ? undefined : "rounded-xl border border-border bg-bg-layout/40 p-4"
      }
      bodyClassName="space-y-5"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Plan solicitado
          </p>
          <div className="mt-2">
            <ClientPlanSummary requestedPlan={client.requestedPlan} compact />
          </div>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-dark">
            Plan elegido
          </p>
          <div className="mt-2">
            {client.advisedPlan ? (
              <ClientPlanSummary
                requestedPlan={client.requestedPlan}
                advisedPlan={client.advisedPlan}
                compact
              />
            ) : (
              <p className="text-sm text-muted">
                Sin plan elegido. Marca uno de la lista de propuestos.
              </p>
            )}
          </div>
          {client.advisedPlan ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              disabled={Boolean(busyCode)}
              onClick={() => void handleClearChosen()}
            >
              Quitar elegido
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground">
            Planes en la propuesta
          </h4>
          <span className="text-xs text-muted">
            {assignedPlans.length} plan
            {assignedPlans.length === 1 ? "" : "es"}
          </span>
        </div>

        {assignedPlans.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-white px-3 py-4 text-sm text-muted">
            Aún no hay planes asignados. Agrégalos desde el catálogo o el
            cotizador.
          </p>
        ) : (
          <ul className="space-y-2">
            {assignedPlans.map((plan) => {
              const isChosen = plan.planCode === chosenCode;
              const busy = busyCode === plan.planCode;
              return (
                <li
                  key={plan.planCode}
                  className={joinClasses(
                    "rounded-xl border bg-white p-3",
                    isChosen
                      ? "border-primary/35 bg-primary/5"
                      : "border-border",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {plan.isapre} · {plan.planName}
                      </p>
                      <p className="text-xs text-muted">
                        {plan.planCode}
                        {plan.basePriceUf != null
                          ? ` · UF ${plan.basePriceUf}`
                          : ""}
                      </p>
                      {isChosen ? (
                        <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                          Elegido
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {!isChosen ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          disabled={Boolean(busyCode)}
                          onClick={() => void handleChoosePlan(plan)}
                        >
                          {busy ? "…" : "Elegir"}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        disabled={Boolean(busyCode)}
                        onClick={() => void handleRemovePlan(plan)}
                      >
                        {busy ? "…" : "Eliminar"}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Agregar plan del catálogo</span>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Isapre, nombre o código del plan…"
            disabled={loadingPlans}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Nota (opcional)</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder="Ej. Cliente pidió comparar estas opciones…"
            className={joinClasses("w-full rounded-xl px-3 py-2 text-sm", ui.input)}
          />
        </label>

        {loadingPlans ? (
          <p className="text-sm text-muted">Cargando catálogo…</p>
        ) : filteredPlans.length > 0 ? (
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border bg-white p-2">
            {filteredPlans.map((plan) => {
              const busy = busyCode === plan.unique_code;
              return (
                <li
                  key={plan.unique_code}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-hover"
                >
                  <div className="min-w-0 text-sm">
                    <span className="font-medium">
                      {plan.isapre} · {plan.plan_name}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {plan.unique_code}
                      {Number.isFinite(plan.base_price_uf)
                        ? ` · Base ${plan.base_price_uf.toLocaleString("es-CL", {
                            minimumFractionDigits: 3,
                            maximumFractionDigits: 3,
                          })} UF`
                        : ""}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={Boolean(busyCode)}
                      onClick={() => void handleAddPlan(plan.unique_code, false)}
                    >
                      {busy ? "…" : "Agregar"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="success"
                      disabled={Boolean(busyCode)}
                      onClick={() => void handleAddPlan(plan.unique_code, true)}
                    >
                      {busy ? "…" : "Agregar y elegir"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            {search.trim()
              ? "No hay planes que coincidan (o ya están asignados)."
              : "Todos los planes del catálogo reciente ya están asignados, o busca por nombre."}
          </p>
        )}
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <h4 className="text-sm font-semibold text-foreground">
          Historial de cambios
        </h4>
        <ClientPlanHistoryTimeline
          activities={activities}
          loading={loadingActivities}
        />
      </div>
    </CollapsibleSection>
  );
}
