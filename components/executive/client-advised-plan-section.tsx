"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientPlanHistoryTimeline } from "@/components/executive/client-plan-history-timeline";
import { ClientPlanSummary } from "@/components/executive/client-plan-summary";
import { CollapsibleSection } from "@/components/executive/collapsible-section";
import {
  fetchClientActivities,
  fetchPlans,
  updateClientAdvisedPlan,
} from "@/lib/api/admin-client";
import { formatClientPlanLabel } from "@/lib/client-plan/format";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { ClientActivityRecord } from "@/types/client-activity";
import type { UserRecord } from "@/types/user";
import type { HealthPlan } from "@/types/plan";

export interface ClientAdvisedPlanSectionProps {
  client: UserRecord;
  onUpdated: (client: UserRecord) => void;
  onNotify: (message: string, tone?: "success" | "error") => void;
}

export function ClientAdvisedPlanSection({
  client,
  onUpdated,
  onNotify,
}: ClientAdvisedPlanSectionProps) {
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(
    client.advisedPlan?.planCode ?? null,
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState<ClientActivityRecord[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    setSelectedPlanCode(client.advisedPlan?.planCode ?? null);
    setNotes("");
  }, [client.id, client.advisedPlan?.planCode]);

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

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return plans.slice(0, 8);

    return plans
      .filter((plan) =>
        [plan.plan_name, plan.unique_code, plan.isapre]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 8);
  }, [plans, search]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.unique_code === selectedPlanCode) ?? null,
    [plans, selectedPlanCode],
  );

  const hasChanges =
    selectedPlanCode !== (client.advisedPlan?.planCode ?? null);

  async function handleSavePlan() {
    setSaving(true);
    try {
      const updated = await updateClientAdvisedPlan(client.id, {
        planCode: selectedPlanCode,
        notes: notes.trim() || null,
      });
      onUpdated(updated);
      setNotes("");
      const nextActivities = await fetchClientActivities(client.id);
      setActivities(nextActivities);
      onNotify("Plan asesorado actualizado.");
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo actualizar el plan.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <CollapsibleSection
      title="Planes del cliente"
      description="El plan solicitado viene de la cotización. Puedes registrar otro plan o Isapre que asesores al cliente."
      defaultOpen={false}
      className="rounded-xl border border-border bg-bg-layout/40 p-4"
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
            Plan asesorado
          </p>
          <div className="mt-2">
            {selectedPlan ? (
              <div>
                <p className="text-sm font-medium text-foreground">
                  {formatClientPlanLabel({
                    planCode: selectedPlan.unique_code,
                    planName: selectedPlan.plan_name,
                    isapre: selectedPlan.isapre,
                  })}
                </p>
                <p className="text-xs text-muted">{selectedPlan.unique_code}</p>
              </div>
            ) : client.advisedPlan ? (
              <ClientPlanSummary
                requestedPlan={client.requestedPlan}
                advisedPlan={client.advisedPlan}
                compact
              />
            ) : (
              <p className="text-sm text-muted">
                Igual al solicitado hasta que registres un cambio.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Buscar plan del catálogo</span>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Isapre, nombre o código del plan…"
            disabled={loadingPlans}
          />
        </label>

        {loadingPlans ? (
          <p className="text-sm text-muted">Cargando catálogo…</p>
        ) : filteredPlans.length > 0 ? (
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border bg-white p-2">
            {filteredPlans.map((plan) => {
              const isSelected = selectedPlanCode === plan.unique_code;
              return (
                <li key={plan.unique_code}>
                  <button
                    type="button"
                    onClick={() => setSelectedPlanCode(plan.unique_code)}
                    className={joinClasses(
                      "w-full rounded-lg px-3 py-2 text-left text-sm transition",
                      isSelected
                        ? "bg-primary/10 text-primary-dark"
                        : "hover:bg-surface-hover",
                    )}
                  >
                    <span className="font-medium">
                      {plan.isapre} · {plan.plan_name}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {plan.unique_code}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">No hay planes que coincidan.</p>
        )}

        {selectedPlanCode ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPlanCode(null)}
          >
            Usar plan solicitado
          </Button>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium">Motivo del cambio</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder="Ej. Cliente prefirió otra Isapre con mejor red en su zona…"
            className={joinClasses("w-full rounded-xl px-3 py-2 text-sm", ui.input)}
          />
        </label>

        <Button
          type="button"
          size="sm"
          disabled={saving || !hasChanges}
          variant="success"
          onClick={() => void handleSavePlan()}
        >
          {saving ? "Guardando plan…" : "Registrar plan asesorado"}
        </Button>
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
