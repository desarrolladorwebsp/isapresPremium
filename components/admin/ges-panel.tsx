"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchIsapres, updateIsapreGes } from "@/lib/api/admin-client";
import { formatQuotedUf } from "@/lib/plan-format";
import { touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { IsapreRecord } from "@/types/isapre";

export interface GesPanelProps {
  onNotify: (message: string, tone?: "success" | "error") => void;
  canManage?: boolean;
}

function formatGesInput(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value).replace(".", ",");
}

function parseGesInput(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function GesPanel({ onNotify, canManage = true }: GesPanelProps) {
  const [isapres, setIsapres] = useState<IsapreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { gesPremiumUf: string; gesPremiumUfLegacy: string }>
  >({});

  async function loadIsapres() {
    setLoading(true);
    try {
      const next = await fetchIsapres();
      setIsapres(next);
      setDrafts(
        Object.fromEntries(
          next.map((item) => [
            item.id,
            {
              gesPremiumUf: formatGesInput(item.gesPremiumUf),
              gesPremiumUfLegacy: formatGesInput(item.gesPremiumUfLegacy),
            },
          ]),
        ),
      );
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los valores GES.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadIsapres();
  }, []);

  function updateDraft(
    id: string,
    field: "gesPremiumUf" | "gesPremiumUfLegacy",
    value: string,
  ) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: value,
      },
    }));
  }

  async function handleSave(isapre: IsapreRecord) {
    const draft = drafts[isapre.id];
    if (!draft) return;

    const gesPremiumUf = parseGesInput(draft.gesPremiumUf);
    const legacyRaw = draft.gesPremiumUfLegacy.trim();
    const gesPremiumUfLegacy = legacyRaw
      ? parseGesInput(draft.gesPremiumUfLegacy)
      : null;

    if (gesPremiumUf == null || gesPremiumUf <= 0) {
      onNotify("Ingresa un valor GES vigente válido.", "error");
      return;
    }

    if (legacyRaw && (gesPremiumUfLegacy == null || gesPremiumUfLegacy <= 0)) {
      onNotify("El valor GES de referencia no es válido.", "error");
      return;
    }

    setSavingId(isapre.id);

    try {
      const { isapre: updated } = await updateIsapreGes(isapre.id, {
        gesPremiumUf,
        gesPremiumUfLegacy,
      });

      setIsapres((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      onNotify(`Valores GES actualizados para ${updated.name}.`);
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los valores GES.",
        "error",
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary-dark">Valores GES</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Prima GES mensual en UF por beneficiario, según cada isapre. El valor
            vigente se usa en todas las cotizaciones del cotizador.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadIsapres()}
          className={joinClasses(
            touchTarget,
            "rounded-lg px-4 text-sm font-semibold",
            ui.ctaOutline,
          )}
        >
          Actualizar
        </button>
      </div>

      <div
        className={joinClasses(
          "overflow-hidden rounded-2xl border bg-white shadow-sm",
          ui.border,
        )}
      >
        {loading ? (
          <p className="px-6 py-16 text-center text-sm text-muted">
            Cargando valores GES…
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[44rem] w-full text-left text-sm">
              <thead className="border-b bg-bg-layout/70 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Isapre</th>
                  <th className="px-4 py-3 font-semibold">GES vigente (UF)</th>
                  <th className="px-4 py-3 font-semibold">
                    GES referencia 2023/24 (UF)
                  </th>
                  <th className="px-4 py-3 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {isapres.map((isapre) => (
                  <tr key={isapre.id} className="border-b last:border-b-0">
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-foreground">
                        {isapre.name}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Actual: {formatQuotedUf(isapre.gesPremiumUf)}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <Input
                        inputMode="decimal"
                        value={drafts[isapre.id]?.gesPremiumUf ?? ""}
                        onChange={(event) =>
                          updateDraft(
                            isapre.id,
                            "gesPremiumUf",
                            event.target.value,
                          )
                        }
                        placeholder="0,731"
                        className="max-w-[8rem] font-mono"
                        disabled={!canManage}
                        readOnly={!canManage}
                      />
                      <p className="mt-1 text-xs text-muted">Dic 2025</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <Input
                        inputMode="decimal"
                        value={drafts[isapre.id]?.gesPremiumUfLegacy ?? ""}
                        onChange={(event) =>
                          updateDraft(
                            isapre.id,
                            "gesPremiumUfLegacy",
                            event.target.value,
                          )
                        }
                        placeholder="0,602"
                        className="max-w-[8rem] font-mono"
                        disabled={!canManage}
                        readOnly={!canManage}
                      />
                      <p className="mt-1 text-xs text-muted">Solo referencia</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      {canManage ? (
                        <Button
                          size="sm"
                          disabled={savingId === isapre.id}
                          onClick={() => void handleSave(isapre)}
                        >
                          {savingId === isapre.id ? "Guardando…" : "Guardar"}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted">
        Los cambios aplican de inmediato a nuevas cotizaciones. Valores en UF
        por beneficiario al mes (excluye menores de 2 años según reglas del
        cotizador).
      </p>
    </div>
  );
}
