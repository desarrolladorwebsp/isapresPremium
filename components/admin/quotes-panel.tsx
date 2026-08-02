"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminPanel,
  AdminPanelHeader,
  AdminRefreshButton,
  AdminTable,
  AdminTableBody,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  AdminToolbar,
} from "@/components/admin/admin-data-table";
import {
  distributeUnassignedQuotes,
  fetchExecutiveAccounts,
  fetchExecutiveAssignmentStats,
  updateQuoteLead,
  type ExecutiveAssignmentStat,
} from "@/lib/api/admin-client";
import { formatPlanClp, formatQuotedUf } from "@/lib/plan-format";
import { REGION_OPTIONS, SEX_OPTIONS } from "@/lib/quote-criteria-options";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_OPTIONS,
} from "@/lib/quote-status";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { QuoteRecord, QuoteStatus } from "@/types/quote";
import type { StaffAccountRecord } from "@/types/staff-account";

export interface QuotesPanelProps {
  quotes: QuoteRecord[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onNotify?: (message: string, tone?: "success" | "error") => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function resolvePartnerLabel(quote: QuoteRecord): string {
  if (quote.partnerEntityName) return quote.partnerEntityName;
  if (quote.partnerEntitySlug) return quote.partnerEntitySlug;
  return "Sin origen";
}

function resolveRegionLabel(region: string | null | undefined): string {
  if (!region) return "—";
  return (
    REGION_OPTIONS.find((option) => option.value === region)?.label ?? region
  );
}

function resolveSexLabel(sex: string | null | undefined): string {
  if (!sex) return "—";
  return SEX_OPTIONS.find((option) => option.value === sex)?.label ?? sex;
}

function formatIncome(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const digits = value.replace(/\D/g, "");
  const amount = Number(digits);
  if (!Number.isFinite(amount) || amount <= 0) return value;

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatBeneficiaries(quote: QuoteRecord): string {
  const parts: string[] = [];

  if (quote.contributorAge != null) {
    parts.push(`Titular ${quote.contributorAge} años`);
  }

  if ((quote.dependentsCount ?? 0) > 0) {
    const ages =
      quote.dependentAges && quote.dependentAges.length > 0
        ? ` (${quote.dependentAges.join(", ")} años)`
        : "";
    parts.push(`${quote.dependentsCount} carga${quote.dependentsCount === 1 ? "" : "s"}${ages}`);
  }

  if (quote.beneficiaryCount != null && quote.beneficiaryCount > 0) {
    parts.push(`${quote.beneficiaryCount} beneficiario${quote.beneficiaryCount === 1 ? "" : "s"}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "—";
}

function normalizePhoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return phone;
  return digits.startsWith("56") ? `+${digits}` : `+56${digits}`;
}

export function QuotesPanel({
  quotes,
  loading,
  onRefresh,
  onNotify,
}: QuotesPanelProps) {
  const [search, setSearch] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<QuoteRecord["status"] | "all">(
    "all",
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [executives, setExecutives] = useState<StaffAccountRecord[]>([]);
  const [assignmentStats, setAssignmentStats] = useState<ExecutiveAssignmentStat[]>(
    [],
  );
  const [savingQuoteId, setSavingQuoteId] = useState<string | null>(null);
  const [distributing, setDistributing] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [nextExecutives, nextStats] = await Promise.all([
          fetchExecutiveAccounts(),
          fetchExecutiveAssignmentStats(),
        ]);
        setExecutives(nextExecutives);
        setAssignmentStats(nextStats);
      } catch {
        // El panel sigue funcionando sin stats de asignación.
      }
    })();
  }, [quotes.length]);

  async function refreshAssignmentStats() {
    try {
      const [nextExecutives, nextStats] = await Promise.all([
        fetchExecutiveAccounts(),
        fetchExecutiveAssignmentStats(),
      ]);
      setExecutives(nextExecutives);
      setAssignmentStats(nextStats);
    } catch {
      // noop
    }
  }

  async function handleDistribute() {
    setDistributing(true);
    try {
      const result = await distributeUnassignedQuotes();
      onNotify?.(result.message);
      await onRefresh();
      await refreshAssignmentStats();
    } catch (error) {
      onNotify?.(
        error instanceof Error
          ? error.message
          : "No se pudieron distribuir los leads.",
        "error",
      );
    } finally {
      setDistributing(false);
    }
  }

  async function handleLeadUpdate(
    quote: QuoteRecord,
    input: { executiveAccountId?: string | null; status?: QuoteStatus },
  ) {
    setSavingQuoteId(quote.id);
    try {
      await updateQuoteLead(quote.id, input);
      await onRefresh();
      await refreshAssignmentStats();
    } catch (error) {
      onNotify?.(
        error instanceof Error ? error.message : "No se pudo actualizar el lead.",
        "error",
      );
    } finally {
      setSavingQuoteId(null);
    }
  }

  const partnerOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const quote of quotes) {
      const slug = quote.partnerEntitySlug ?? "sin-origen";
      const label = resolvePartnerLabel(quote);
      map.set(slug, label);
    }

    return [...map.entries()]
      .map(([slug, label]) => ({ slug, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [quotes]);

  const stats = useMemo(() => {
    return {
      total: quotes.length,
      unassigned: quotes.filter((quote) => !quote.executiveAccountId).length,
      prospect: quotes.filter((quote) => quote.status === "PENDING").length,
      contracting: quotes.filter((quote) => quote.status === "CONTACTED").length,
      purchased: quotes.filter((quote) => quote.status === "CONVERTED").length,
      rejected: quotes.filter((quote) => quote.status === "CANCELLED").length,
    };
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return quotes.filter((quote) => {
      const partnerSlug = quote.partnerEntitySlug ?? "sin-origen";
      if (partnerFilter !== "all" && partnerSlug !== partnerFilter) {
        return false;
      }

      if (statusFilter !== "all" && quote.status !== statusFilter) {
        return false;
      }

      if (!query) return true;

      return [
        quote.fullName,
        quote.email,
        quote.phone,
        quote.rut,
        quote.planCode,
        quote.planName,
        quote.planIsapre,
        quote.partnerEntityName,
        quote.partnerEntitySlug,
        quote.region,
        quote.notes,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [quotes, search, partnerFilter, statusFilter]);

  return (
    <AdminPanel>
      <AdminPanelHeader
        title="Cotizaciones"
        description="Leads del cotizador. Asígnalos manualmente o usa «Distribuir» para repartir los pendientes entre ejecutivos."
        actions={
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={distributing || stats.unassigned === 0}
              onClick={() => void handleDistribute()}
            >
              {distributing
                ? "Distribuyendo…"
                : `Distribuir sin asignar (${stats.unassigned})`}
            </Button>
            <AdminRefreshButton onClick={() => void onRefresh()} />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Total", value: stats.total, tone: "text-primary-dark" },
          { label: "Sin asignar", value: stats.unassigned, tone: "text-rose-700" },
          { label: "Prospectos", value: stats.prospect, tone: "text-amber-700" },
          { label: "Contratantes", value: stats.contracting, tone: "text-sky-700" },
          { label: "Compraron", value: stats.purchased, tone: "text-emerald-700" },
          { label: "Rechazaron", value: stats.rejected, tone: "text-gray-600" },
        ].map((item) => (
          <div
            key={item.label}
            className={joinClasses(
              "rounded-xl border bg-white px-4 py-3 shadow-sm",
              ui.border,
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {item.label}
            </p>
            <p className={joinClasses("mt-1 text-2xl font-bold tabular-nums", item.tone)}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {assignmentStats.length > 0 ? (
        <div
          className={joinClasses(
            "rounded-xl border bg-white px-4 py-3 text-sm shadow-sm",
            ui.border,
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Carga por ejecutivo
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {assignmentStats
              .filter((row) => row.active)
              .map((row) => (
                <span
                  key={row.executiveId}
                  className="rounded-full border border-border bg-bg-layout px-3 py-1 text-xs font-medium text-foreground"
                >
                  {row.fullName}: {row.assignedCount} lead
                  {row.assignedCount === 1 ? "" : "s"}
                </span>
              ))}
          </div>
        </div>
      ) : null}

      <AdminToolbar className="lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, RUT, correo, plan u origen…"
          className={joinClasses("h-11", ui.input)}
        />

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as QuoteRecord["status"] | "all")
          }
          className={joinClasses("h-11 rounded-xl px-3 text-sm", ui.input)}
        >
          <option value="all">Todos los estados</option>
          {(QUOTE_STATUS_OPTIONS as QuoteRecord["status"][]).map(
            (status) => (
              <option key={status} value={status}>
                {QUOTE_STATUS_LABELS[status]}
              </option>
            ),
          )}
        </select>

        <select
          value={partnerFilter}
          onChange={(event) => setPartnerFilter(event.target.value)}
          className={joinClasses("h-11 rounded-xl px-3 text-sm", ui.input)}
        >
          <option value="all">Todos los orígenes</option>
          {partnerOptions.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.label}
            </option>
          ))}
        </select>
      </AdminToolbar>

      <AdminTableCard
        loading={loading}
        empty={!loading && filteredQuotes.length === 0}
        emptyTitle="No hay cotizaciones para mostrar"
        emptyDescription='Las solicitudes aparecerán aquí cuando alguien use "Solicitar con ejecutivo" en el cotizador.'
        loadingMessage="Cargando cotizaciones…"
        footer={`Mostrando ${filteredQuotes.length} de ${quotes.length} cotizaciones.`}
      >
        <AdminTable minWidth="80rem">
          <AdminTableHead>
            <tr>
              <AdminTableHeaderCell>Fecha</AdminTableHeaderCell>
              <AdminTableHeaderCell>Solicitante</AdminTableHeaderCell>
              <AdminTableHeaderCell>Contacto</AdminTableHeaderCell>
              <AdminTableHeaderCell>Plan solicitado</AdminTableHeaderCell>
              <AdminTableHeaderCell align="right">Precio est.</AdminTableHeaderCell>
              <AdminTableHeaderCell>Origen</AdminTableHeaderCell>
              <AdminTableHeaderCell>Ejecutivo</AdminTableHeaderCell>
              <AdminTableHeaderCell>Pipeline</AdminTableHeaderCell>
              <AdminTableHeaderCell align="right">Detalle</AdminTableHeaderCell>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {filteredQuotes.map((quote) => {
              const isExpanded = expandedId === quote.id;

              return (
                <Fragment key={quote.id}>
                  <AdminTableRow>
                    <AdminTableCell className="whitespace-nowrap text-muted">
                      {formatDate(quote.createdAt)}
                    </AdminTableCell>

                    <AdminTableCell>
                      <p className="font-semibold text-foreground">
                        {quote.fullName}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        RUT: {quote.rut?.trim() || "—"}
                      </p>
                    </AdminTableCell>

                    <AdminTableCell>
                      <a
                        href={`mailto:${quote.email}`}
                        className="block text-primary-dark underline-offset-2 hover:underline"
                      >
                        {quote.email}
                      </a>
                      <a
                        href={`tel:${normalizePhoneHref(quote.phone)}`}
                        className="mt-1 block text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
                      >
                        {quote.phone}
                      </a>
                    </AdminTableCell>

                    <AdminTableCell>
                      {quote.planName || quote.planIsapre ? (
                        <>
                          {quote.planIsapre ? (
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                              {quote.planIsapre}
                            </p>
                          ) : null}
                          <p className="mt-1 font-semibold text-foreground">
                            {quote.planName ?? "Plan sin nombre"}
                          </p>
                        </>
                      ) : (
                        <p className="font-semibold text-foreground">—</p>
                      )}
                      {quote.planCode ? (
                        <p className="mt-1 font-mono text-xs text-muted">
                          {quote.planCode}
                        </p>
                      ) : null}
                    </AdminTableCell>

                    <AdminTableCell align="right" className="whitespace-nowrap">
                      {quote.finalPriceClp != null ? (
                        <>
                          <p className="font-semibold tabular-nums text-foreground">
                            {formatPlanClp(quote.finalPriceClp)}
                          </p>
                          {quote.finalPriceUf != null ? (
                            <p className="mt-1 text-xs tabular-nums text-muted">
                              {formatQuotedUf(quote.finalPriceUf)}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </AdminTableCell>

                    <AdminTableCell>
                      <p className="font-semibold text-foreground">
                        {resolvePartnerLabel(quote)}
                      </p>
                      {quote.partnerEntitySlug ? (
                        <p className="text-xs text-muted">
                          /{quote.partnerEntitySlug}
                        </p>
                      ) : null}
                    </AdminTableCell>

                    <AdminTableCell>
                      <select
                        value={quote.executiveAccountId ?? ""}
                        disabled={savingQuoteId === quote.id}
                        onChange={(event) => {
                          const value = event.target.value;
                          void handleLeadUpdate(quote, {
                            executiveAccountId: value || null,
                          });
                        }}
                        className={joinClasses(
                          "h-9 w-full min-w-[10rem] rounded-lg px-2 text-xs",
                          ui.input,
                        )}
                        aria-label="Ejecutivo asignado"
                      >
                        <option value="">Sin asignar</option>
                        {executives.map((executive) => (
                          <option key={executive.id} value={executive.id}>
                            {executive.fullName}
                          </option>
                        ))}
                      </select>
                      {quote.executiveName && !executives.length ? (
                        <p className="mt-1 text-xs text-muted">{quote.executiveName}</p>
                      ) : null}
                    </AdminTableCell>

                    <AdminTableCell>
                      <select
                        value={quote.status}
                        disabled={savingQuoteId === quote.id}
                        onChange={(event) => {
                          void handleLeadUpdate(quote, {
                            status: event.target.value as QuoteStatus,
                          });
                        }}
                        className={joinClasses(
                          "h-9 w-full min-w-[9.5rem] rounded-lg px-2 text-xs font-medium",
                          ui.input,
                        )}
                        aria-label="Estado del pipeline"
                      >
                        {QUOTE_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {QUOTE_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </AdminTableCell>

                    <AdminTableCell align="right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : quote.id)
                        }
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? "Ocultar" : "Ver"}
                      </Button>
                    </AdminTableCell>
                  </AdminTableRow>

                  {isExpanded ? (
                    <tr className="border-b bg-bg-layout/30">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <DetailBlock
                            label="Región"
                            value={resolveRegionLabel(quote.region)}
                          />
                          <DetailBlock
                            label="Perfil"
                            value={[
                              resolveSexLabel(quote.sex),
                              quote.contributorAge != null
                                ? `${quote.contributorAge} años`
                                : null,
                              formatIncome(quote.monthlyIncome),
                              formatBeneficiaries(quote),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          />
                          <DetailBlock
                            label="Motivo"
                            value={quote.quoteReason ?? "—"}
                          />
                          <DetailBlock
                            label="Notas"
                            value={quote.notes ?? "—"}
                          />
                          <DetailBlock
                            label="Preferencia de contacto"
                            value={quote.contactPreference ?? "—"}
                          />
                          <DetailBlock
                            label="Factores de riesgo"
                            value={
                              quote.totalFactors != null
                                ? String(quote.totalFactors)
                                : "—"
                            }
                          />
                          <DetailBlock
                            label="Valor UF al cotizar"
                            value={
                              quote.ufValue != null
                                ? formatPlanClp(quote.ufValue)
                                : "—"
                            }
                          />
                          <DetailBlock
                            label="ID solicitud"
                            value={quote.id}
                            mono
                          />
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </AdminTableBody>
        </AdminTable>
      </AdminTableCard>
    </AdminPanel>
  );
}

function DetailBlock({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className={joinClasses(
          "mt-1 text-sm text-foreground",
          mono ? "font-mono text-xs break-all" : "",
        )}
      >
        {value}
      </p>
    </div>
  );
}
