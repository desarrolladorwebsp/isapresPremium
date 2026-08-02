"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
import { ProspectDetailDrawer } from "@/components/executive/admin/prospect-detail-drawer";
import { ExecutiveAdminLayout } from "@/components/executive/admin/executive-admin-layout";
import { QuoteStatusBadge } from "@/components/lead/quote-lead-actions";
import {
  distributeUnassignedQuotes,
  fetchExecutiveAssignmentStats,
  fetchLatestQuoteActivities,
  updateQuoteLead,
  type ExecutiveAssignmentStat,
} from "@/lib/api/admin-client";
import { useExecutiveAccountsQuery } from "@/hooks/query/use-executive-accounts-query";
import { useExecutiveQuotesQuery } from "@/hooks/query/use-executive-quotes-query";
import {
  invalidateExecutiveQuotes,
  upsertExecutiveQuoteCache,
} from "@/lib/query/executive-cache";
import { formatPlanClp, formatQuotedUf } from "@/lib/plan-format";
import { formatQuoteDate, resolvePartnerLabel } from "@/lib/quote/quote-display";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_OPTIONS,
} from "@/lib/quote-status";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { QuoteActivityRecord } from "@/types/quote-activity";
import type { QuoteRecord, QuoteStatus } from "@/types/quote";

export interface ExecutiveAdminProspectsViewProps {
  onNotify: (message: string, tone?: "success" | "error") => void;
  /** Omite el layout externo cuando se renderiza dentro de ExecutiveAdminPanel. */
  embedded?: boolean;
}

const statVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.05, duration: 0.3 },
  }),
};

export function ExecutiveAdminProspectsView({
  onNotify,
  embedded = false,
}: ExecutiveAdminProspectsViewProps) {
  const queryClient = useQueryClient();
  const quotesQuery = useExecutiveQuotesQuery();
  const executivesQuery = useExecutiveAccountsQuery();

  const quotes = quotesQuery.data;
  const executives = executivesQuery.data ?? [];
  const loading = quotesQuery.isLoading && !quotes;
  const isFetching = quotesQuery.isFetching;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");
  const [executiveFilter, setExecutiveFilter] = useState<string>("all");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [assignmentStats, setAssignmentStats] = useState<ExecutiveAssignmentStat[]>(
    [],
  );
  const [latestActivities, setLatestActivities] = useState<
    Record<string, QuoteActivityRecord>
  >({});
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [savingQuoteId, setSavingQuoteId] = useState<string | null>(null);
  const [distributing, setDistributing] = useState(false);

  useEffect(() => {
    if (quotesQuery.isError) {
      onNotify(
        quotesQuery.error instanceof Error
          ? quotesQuery.error.message
          : "No se pudieron cargar los prospectos.",
        "error",
      );
    }
  }, [quotesQuery.isError, quotesQuery.error, onNotify]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!quotesQuery.data || quotesQuery.data.length === 0) {
        if (!cancelled) setLatestActivities({});
        return;
      }
      try {
        const latest = await fetchLatestQuoteActivities(
          quotesQuery.data.map((quote) => quote.id),
        );
        if (!cancelled) setLatestActivities(latest);
      } catch {
        // Actividades son complementarias; la tabla sigue usable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quotesQuery.dataUpdatedAt, quotesQuery.data]);

  useEffect(() => {
    // Stats de asignación son complementarias al caché de cotizaciones.
    void (async () => {
      try {
        const nextStats = await fetchExecutiveAssignmentStats();
        setAssignmentStats(nextStats);
        await executivesQuery.refetch();
      } catch {
        // El panel sigue operativo sin stats.
      }
    })();
    // Solo al montar el panel de prospectos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshAssignmentStats() {
    try {
      const nextStats = await fetchExecutiveAssignmentStats();
      setAssignmentStats(nextStats);
      await executivesQuery.refetch();
    } catch {
      // El panel sigue operativo sin stats.
    }
  }

  async function handleRefresh() {
    await Promise.all([quotesQuery.refetch(), refreshAssignmentStats()]);
  }

  const stats = useMemo(() => {
    const rows = quotes ?? [];
    return {
      total: rows.length,
      unassigned: rows.filter((quote) => !quote.executiveAccountId).length,
      prospect: rows.filter((quote) => quote.status === "PENDING").length,
      contracting: rows.filter((quote) => quote.status === "CONTACTED").length,
      purchased: rows.filter((quote) => quote.status === "CONVERTED").length,
      rejected: rows.filter((quote) => quote.status === "CANCELLED").length,
    };
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    const rows = quotes ?? [];
    const query = search.trim().toLowerCase();

    return rows.filter((quote) => {
      if (unassignedOnly && quote.executiveAccountId) return false;
      if (statusFilter !== "all" && quote.status !== statusFilter) return false;
      if (executiveFilter === "unassigned") {
        if (quote.executiveAccountId) return false;
      } else if (
        executiveFilter !== "all" &&
        quote.executiveAccountId !== executiveFilter
      ) {
        return false;
      }

      if (!query) return true;

      return [
        quote.fullName,
        quote.email,
        quote.phone,
        quote.rut,
        quote.planName,
        quote.executiveName,
        quote.partnerEntityName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [quotes, search, statusFilter, executiveFilter, unassignedOnly]);

  const selectedQuote = useMemo(
    () => (quotes ?? []).find((quote) => quote.id === selectedQuoteId) ?? null,
    [quotes, selectedQuoteId],
  );

  async function handleLeadUpdate(
    quote: QuoteRecord,
    input: { executiveAccountId?: string | null; status?: QuoteStatus },
  ) {
    setSavingQuoteId(quote.id);
    try {
      const updated = await updateQuoteLead(quote.id, input);
      upsertExecutiveQuoteCache(queryClient, updated);
      void invalidateExecutiveQuotes(queryClient);
      const latest = await fetchLatestQuoteActivities([updated.id]);
      setLatestActivities((current) => ({ ...current, ...latest }));
      await refreshAssignmentStats();
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo actualizar el prospecto.",
        "error",
      );
    } finally {
      setSavingQuoteId(null);
    }
  }

  async function handleDistribute() {
    setDistributing(true);
    try {
      const result = await distributeUnassignedQuotes();
      onNotify(result.message);
      await invalidateExecutiveQuotes(queryClient);
      await refreshAssignmentStats();
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudieron distribuir los prospectos.",
        "error",
      );
    } finally {
      setDistributing(false);
    }
  }

  function handleQuoteUpdated(updated: QuoteRecord) {
    upsertExecutiveQuoteCache(queryClient, updated);
    void invalidateExecutiveQuotes(queryClient);
  }

  const panel = (
    <AdminPanel>
          <AdminPanelHeader
            title="Listado de prospectos"
            description="Asignación, reasignación, estados e historial de seguimiento."
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
              <AdminRefreshButton
                loading={isFetching && !loading}
                onClick={() => void handleRefresh()}
              />
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
          ].map((item, index) => (
            <motion.div
              key={item.label}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={statVariants}
              className={joinClasses(
                "rounded-xl border bg-white px-4 py-3 shadow-sm",
                ui.border,
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {item.label}
              </p>
              <p
                className={joinClasses(
                  "mt-1 text-2xl font-bold tabular-nums",
                  item.tone,
                )}
              >
                {item.value}
              </p>
            </motion.div>
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
                    {row.fullName}: {row.assignedCount}
                  </span>
                ))}
            </div>
          </div>
        ) : null}

        <AdminToolbar className="lg:grid-cols-[minmax(0,1fr)_11rem_11rem_auto]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, correo, RUT, plan o ejecutivo…"
            className={joinClasses("h-11", ui.input)}
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as QuoteStatus | "all")
            }
            className={joinClasses("h-11 rounded-xl px-3 text-sm", ui.input)}
          >
            <option value="all">Todos los estados</option>
            {QUOTE_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {QUOTE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>

          <select
            value={executiveFilter}
            onChange={(event) => setExecutiveFilter(event.target.value)}
            className={joinClasses("h-11 rounded-xl px-3 text-sm", ui.input)}
          >
            <option value="all">Todos los ejecutivos</option>
            <option value="unassigned">Sin asignar</option>
            {executives.map((executive) => (
              <option key={executive.id} value={executive.id}>
                {executive.fullName}
              </option>
            ))}
          </select>

          <label
            className={joinClasses(
              "inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium",
              ui.border,
              unassignedOnly ? "bg-primary/5 text-primary-dark" : "text-muted",
            )}
          >
            <input
              type="checkbox"
              checked={unassignedOnly}
              onChange={(event) => setUnassignedOnly(event.target.checked)}
              className="size-4 accent-primary"
            />
            Solo sin asignar
          </label>
        </AdminToolbar>

        <AdminTableCard
          loading={loading}
          empty={!loading && filteredQuotes.length === 0}
          emptyTitle="No hay prospectos para mostrar"
          emptyDescription="Los prospectos aparecerán aquí cuando ingresen solicitudes desde el cotizador."
          loadingMessage="Cargando prospectos…"
          footer={`Mostrando ${filteredQuotes.length} de ${(quotes ?? []).length} prospectos.`}
        >
          <AdminTable minWidth="72rem">
            <AdminTableHead>
              <tr>
                <AdminTableHeaderCell>Prospecto</AdminTableHeaderCell>
                <AdminTableHeaderCell>Estado</AdminTableHeaderCell>
                <AdminTableHeaderCell>Ejecutivo</AdminTableHeaderCell>
                <AdminTableHeaderCell>Creación</AdminTableHeaderCell>
                <AdminTableHeaderCell>Última gestión</AdminTableHeaderCell>
                <AdminTableHeaderCell>Actualización</AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">Acciones</AdminTableHeaderCell>
              </tr>
            </AdminTableHead>
            <AdminTableBody>
              {filteredQuotes.map((quote) => {
                const lastActivity = latestActivities[quote.id];

                return (
                  <AdminTableRow key={quote.id}>
                    <AdminTableCell>
                      <p className="font-semibold text-foreground">{quote.fullName}</p>
                      <p className="mt-1 text-xs text-muted">{quote.email}</p>
                      <p className="mt-1 text-xs text-muted">
                        {quote.planName ?? resolvePartnerLabel(quote)}
                      </p>
                      {quote.finalPriceClp != null ? (
                        <p className="mt-1 text-xs tabular-nums text-muted">
                          {formatPlanClp(quote.finalPriceClp)}
                          {quote.finalPriceUf != null
                            ? ` · ${formatQuotedUf(quote.finalPriceUf)}`
                            : null}
                        </p>
                      ) : null}
                    </AdminTableCell>

                    <AdminTableCell>
                      <QuoteStatusBadge status={quote.status} />
                      <select
                        value={quote.status}
                        disabled={savingQuoteId === quote.id}
                        onChange={(event) => {
                          void handleLeadUpdate(quote, {
                            status: event.target.value as QuoteStatus,
                          });
                        }}
                        className={joinClasses(
                          "mt-2 h-9 w-full min-w-[9rem] rounded-lg px-2 text-xs",
                          ui.input,
                        )}
                        aria-label="Cambiar estado"
                      >
                        {QUOTE_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {QUOTE_STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
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
                        aria-label="Asignar ejecutivo"
                      >
                        <option value="">Sin asignar</option>
                        {executives.map((executive) => (
                          <option key={executive.id} value={executive.id}>
                            {executive.fullName}
                          </option>
                        ))}
                      </select>
                    </AdminTableCell>

                    <AdminTableCell className="whitespace-nowrap text-xs text-muted">
                      {formatQuoteDate(quote.createdAt)}
                    </AdminTableCell>

                    <AdminTableCell className="whitespace-nowrap text-xs text-muted">
                      {lastActivity
                        ? formatQuoteDate(lastActivity.createdAt)
                        : "—"}
                    </AdminTableCell>

                    <AdminTableCell className="whitespace-nowrap text-xs text-muted">
                      {formatQuoteDate(quote.updatedAt)}
                    </AdminTableCell>

                    <AdminTableCell align="right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedQuoteId(quote.id)}
                      >
                        Ver detalle
                      </Button>
                    </AdminTableCell>
                  </AdminTableRow>
                );
              })}
            </AdminTableBody>
          </AdminTable>
        </AdminTableCard>
    </AdminPanel>
  );

  return (
    <>
      {embedded ? panel : (
        <ExecutiveAdminLayout activeModule="prospectos">{panel}</ExecutiveAdminLayout>
      )}

      <ProspectDetailDrawer
        quote={selectedQuote}
        executives={executives}
        lastActivityAt={selectedQuote ? latestActivities[selectedQuote.id]?.createdAt : null}
        open={Boolean(selectedQuote)}
        onClose={() => setSelectedQuoteId(null)}
        onUpdated={handleQuoteUpdated}
        onNotify={onNotify}
      />
    </>
  );
}
