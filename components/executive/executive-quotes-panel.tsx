"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  TableCellStack,
} from "@/components/admin/admin-data-table";
import {
  QuoteLeadActions,
  QuoteLeadActionsHint,
  QuoteStatusBadge,
} from "@/components/lead/quote-lead-actions";
import { CotizadorSourceBadge } from "@/components/executive/cotizador-source-badge";
import { useStaffSession } from "@/hooks/use-auth-session";
import {
  assignQuoteToExecutive,
  updateQuoteLead,
} from "@/lib/api/admin-client";
import { useExecutiveAccountsQuery } from "@/hooks/query/use-executive-accounts-query";
import { useExecutiveQuotesQuery } from "@/hooks/query/use-executive-quotes-query";
import {
  invalidateExecutiveQuotes,
  upsertExecutiveQuoteCache,
} from "@/lib/query/executive-cache";
import { getPlanPdfDownloadUrl } from "@/lib/plan-pdf";
import { resolveCotizadorSourceFromQuote } from "@/lib/partner-entity/source-label";
import { formatPlanClp, formatQuotedUf } from "@/lib/plan-format";
import { formatConvenioDiscountLabel } from "@/lib/company-agreements/cotizacion-notify-convenio";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_OPTIONS,
} from "@/lib/quote-status";
import { executiveStatToneClass } from "@/lib/executive/action-styles";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { QuoteRecord, QuoteStatus } from "@/types/quote";

export interface ExecutiveQuotesPanelProps {
  onNotify: (message: string, tone?: "success" | "error") => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ExecutiveQuotesPanel({ onNotify }: ExecutiveQuotesPanelProps) {
  const queryClient = useQueryClient();
  const { isAdmin, user } = useStaffSession();
  const quotesQuery = useExecutiveQuotesQuery();
  const executivesQuery = useExecutiveAccountsQuery({ enabled: isAdmin });

  const quotes = quotesQuery.data;
  const executives = executivesQuery.data ?? [];
  const loading =
    (quotesQuery.isLoading && !quotes) ||
    (isAdmin && executivesQuery.isLoading && !executivesQuery.data);
  const isFetching = quotesQuery.isFetching || executivesQuery.isFetching;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");
  const [executiveFilter, setExecutiveFilter] = useState<string>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingExecutiveByQuoteId, setPendingExecutiveByQuoteId] = useState<
    Record<string, string>
  >({});

  const outreachName = isAdmin
    ? null
    : (user?.fullName ?? null);

  useEffect(() => {
    if (quotesQuery.isError) {
      onNotify(
        quotesQuery.error instanceof Error
          ? quotesQuery.error.message
          : "No se pudieron cargar cotizaciones.",
        "error",
      );
    }
  }, [quotesQuery.isError, quotesQuery.error, onNotify]);

  async function handleRefresh() {
    await Promise.all([
      quotesQuery.refetch(),
      isAdmin ? executivesQuery.refetch() : Promise.resolve(),
    ]);
  }

  const filteredQuotes = useMemo(() => {
    const rows = quotes ?? [];
    const query = search.trim().toLowerCase();

    return rows.filter((quote) => {
      if (statusFilter !== "all" && quote.status !== statusFilter) return false;

      if (isAdmin) {
        if (executiveFilter === "unassigned" && quote.executiveAccountId) {
          return false;
        }
        if (
          executiveFilter !== "all" &&
          executiveFilter !== "unassigned" &&
          quote.executiveAccountId !== executiveFilter
        ) {
          return false;
        }
      }

      if (!query) return true;

      const values = [
        quote.fullName,
        quote.email,
        quote.phone,
        quote.planName,
        quote.rut,
        quote.executiveName,
        quote.partnerEntityName,
        quote.partnerEntitySlug,
        resolveCotizadorSourceFromQuote(quote)?.description,
      ];

      return values
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [quotes, search, statusFilter, executiveFilter, isAdmin]);

  const stats = useMemo(() => {
    const rows = quotes ?? [];
    return {
      total: rows.length,
      prospect: rows.filter((q) => q.status === "PENDING").length,
      contracting: rows.filter((q) => q.status === "CONTACTED").length,
      purchased: rows.filter((q) => q.status === "CONVERTED").length,
      rejected: rows.filter((q) => q.status === "CANCELLED").length,
      unassigned: rows.filter((q) => !q.executiveAccountId).length,
    };
  }, [quotes]);

  async function handleStatusChange(quote: QuoteRecord, status: QuoteStatus) {
    setSavingId(quote.id);
    try {
      const updated = isAdmin
        ? await updateQuoteLead(quote.id, { status })
        : await assignQuoteToExecutive(quote.id, { status });
      upsertExecutiveQuoteCache(queryClient, updated);
      void invalidateExecutiveQuotes(queryClient);
      onNotify(`Estado actualizado: ${QUOTE_STATUS_LABELS[status]}.`);
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo actualizar el estado.",
        "error",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function handleExecutiveChange(
    quote: QuoteRecord,
    executiveAccountId: string | null,
  ) {
    setSavingId(quote.id);
    try {
      const updated = await updateQuoteLead(quote.id, { executiveAccountId });
      upsertExecutiveQuoteCache(queryClient, updated);
      void invalidateExecutiveQuotes(queryClient);
      const executiveName = executives.find(
        (executive) => executive.id === executiveAccountId,
      )?.fullName;
      onNotify(
        executiveAccountId
          ? `Cotización asignada a ${executiveName ?? "el ejecutivo seleccionado"}.`
          : "Cotización sin ejecutivo asignado.",
      );
      setPendingExecutiveByQuoteId((current) => {
        const next = { ...current };
        delete next[quote.id];
        return next;
      });
    } catch (error) {
      onNotify(
        error instanceof Error ? error.message : "No se pudo reasignar el ejecutivo.",
        "error",
      );
    } finally {
      setSavingId(null);
    }
  }

  function handlePendingExecutiveChange(quoteId: string, executiveAccountId: string) {
    setPendingExecutiveByQuoteId((current) => ({
      ...current,
      [quoteId]: executiveAccountId,
    }));
  }

  function cancelPendingExecutiveChange(quoteId: string) {
    setPendingExecutiveByQuoteId((current) => {
      const next = { ...current };
      delete next[quoteId];
      return next;
    });
  }

  function resolveExecutiveLabel(executiveAccountId: string): string {
    if (!executiveAccountId) return "Sin asignar";
    return (
      executives.find((executive) => executive.id === executiveAccountId)?.fullName ??
      "ejecutivo seleccionado"
    );
  }

  return (
    <AdminPanel>
      <AdminPanelHeader
        title={isAdmin ? "Cotizaciones del sistema" : "Cotizaciones realizadas"}
        description={
          isAdmin
            ? "Todas las solicitudes de planes registradas en el cotizador. Puedes ver y reasignar el ejecutivo responsable de cada una."
            : "Cotizaciones asignadas a tu cuenta. Contacta al cliente y actualiza el estado del pipeline."
        }
        actions={
          <AdminRefreshButton
            loading={isFetching && !loading}
            onClick={() => void handleRefresh()}
          />
        }
      />

      <div
        className={joinClasses(
          "grid gap-3",
          isAdmin ? "sm:grid-cols-2 xl:grid-cols-6" : "sm:grid-cols-2 xl:grid-cols-5",
        )}
      >
        {[
          { label: "Total", value: stats.total, tone: "primary" as const },
          ...(isAdmin
            ? [
                {
                  label: "Sin asignar",
                  value: stats.unassigned,
                  tone: "warning" as const,
                },
              ]
            : []),
          { label: "Prospectos", value: stats.prospect, tone: "warning" as const },
          { label: "Contratantes", value: stats.contracting, tone: "info" as const },
          { label: "Compraron", value: stats.purchased, tone: "success" as const },
          { label: "Rechazaron", value: stats.rejected, tone: "neutral" as const },
        ].map((item) => (
          <div
            key={item.label}
            className={joinClasses(
              "rounded-xl border bg-white px-4 py-3 shadow-sm",
              ui.border,
              item.tone !== "neutral"
                ? `border-l-4 ${executiveStatToneClass[item.tone as "primary" | "info" | "warning" | "success"].border}`
                : "border-l-4 border-l-zinc-300",
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {item.label}
            </p>
            <p
              className={joinClasses(
                "mt-1 text-2xl font-bold tabular-nums",
                item.tone === "neutral"
                  ? "text-gray-600"
                  : executiveStatToneClass[item.tone as "primary" | "info" | "warning" | "success"].value,
              )}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <AdminToolbar
        className={
          isAdmin
            ? "lg:grid-cols-[minmax(0,1fr)_11rem_11rem]"
            : "lg:grid-cols-[minmax(0,1fr)_12rem]"
        }
      >
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            isAdmin
              ? "Buscar por nombre, correo, RUT, plan o ejecutivo…"
              : "Buscar por nombre, correo, RUT o plan…"
          }
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
        {isAdmin ? (
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
        ) : null}
      </AdminToolbar>

      <QuoteLeadActionsHint />

      <AdminTableCard
        loading={loading}
        empty={!loading && filteredQuotes.length === 0}
        emptyTitle={
          isAdmin
            ? "No hay cotizaciones registradas"
            : "No tienes cotizaciones asignadas"
        }
        emptyDescription={
          isAdmin
            ? "Las solicitudes aparecerán aquí cuando los clientes usen el cotizador público."
            : "Las nuevas cotizaciones aparecerán aquí cuando te sean asignadas."
        }
        loadingMessage="Cargando cotizaciones…"
        footer={`Mostrando ${filteredQuotes.length} de ${(quotes ?? []).length} cotizaciones.`}
      >
        <AdminTable minWidth={isAdmin ? "80rem" : "64rem"}>
          <AdminTableHead>
            <tr>
              <AdminTableHeaderCell>Cliente</AdminTableHeaderCell>
              {isAdmin ? (
                <AdminTableHeaderCell>Cotizador</AdminTableHeaderCell>
              ) : null}
              <AdminTableHeaderCell>Plan</AdminTableHeaderCell>
              <AdminTableHeaderCell>Precio</AdminTableHeaderCell>
              {isAdmin ? (
                <AdminTableHeaderCell>Ejecutivo asignado</AdminTableHeaderCell>
              ) : null}
              <AdminTableHeaderCell>Estado</AdminTableHeaderCell>
              <AdminTableHeaderCell>Acciones</AdminTableHeaderCell>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {filteredQuotes.map((quote) => {
              const pdfUrl = quote.planCode
                ? getPlanPdfDownloadUrl({ uniqueCode: quote.planCode })
                : null;

              return (
                <AdminTableRow key={quote.id}>
                  <AdminTableCell className="min-w-[11rem]">
                    <TableCellStack className="gap-1.5">
                      <p className="font-semibold leading-tight text-foreground">
                        {quote.fullName}
                      </p>
                      <p className="truncate text-xs leading-tight text-muted">
                        {quote.email}
                      </p>
                      <p className="text-xs leading-tight text-muted">
                        {quote.phone}
                      </p>
                      {quote.rut ? (
                        <p className="font-mono text-[11px] leading-tight text-muted">
                          RUT {quote.rut}
                        </p>
                      ) : null}
                      {quote.companyAgreementName ? (
                        <p className="text-[11px] font-medium leading-snug text-emerald-800">
                          Convenio: {quote.companyAgreementName}
                          {quote.companyAgreementRut
                            ? ` · RUT ${quote.companyAgreementRut}`
                            : ""}
                          {quote.companyAgreementDiscount != null
                            ? ` · ${formatConvenioDiscountLabel(quote.companyAgreementDiscount)}`
                            : ""}
                        </p>
                      ) : null}
                      <p className="text-[11px] leading-tight text-muted">
                        {formatDate(quote.createdAt)}
                      </p>
                    </TableCellStack>
                  </AdminTableCell>
                  {isAdmin ? (
                    <AdminTableCell className="min-w-[8rem]">
                      <CotizadorSourceBadge
                        source={resolveCotizadorSourceFromQuote(quote)}
                        compact
                      />
                    </AdminTableCell>
                  ) : null}
                  <AdminTableCell className="min-w-[10rem]">
                    <TableCellStack>
                      <p className="text-sm font-medium leading-tight">
                        {quote.planName ?? "—"}
                      </p>
                      <p className="text-xs leading-tight text-muted">
                        {quote.planIsapre ?? ""}
                      </p>
                      {pdfUrl ? (
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex text-xs font-semibold text-primary underline-offset-2 hover:underline"
                        >
                          Ver PDF del plan
                        </a>
                      ) : null}
                    </TableCellStack>
                  </AdminTableCell>
                  <AdminTableCell className="whitespace-nowrap">
                    <TableCellStack>
                      <p className="text-sm font-medium tabular-nums">
                        {quote.finalPriceUf != null
                          ? formatQuotedUf(quote.finalPriceUf)
                          : "—"}
                      </p>
                      <p className="text-xs text-muted tabular-nums">
                        {quote.finalPriceClp != null
                          ? formatPlanClp(quote.finalPriceClp)
                          : "—"}
                      </p>
                    </TableCellStack>
                  </AdminTableCell>
                  {isAdmin ? (
                    <AdminTableCell className="min-w-[11rem]">
                      {(() => {
                        const currentExecutiveId = quote.executiveAccountId ?? "";
                        const selectedExecutiveId =
                          pendingExecutiveByQuoteId[quote.id] ?? currentExecutiveId;
                        const hasPendingChange =
                          selectedExecutiveId !== currentExecutiveId;

                        return (
                          <TableCellStack className="gap-2">
                            <select
                              value={selectedExecutiveId}
                              disabled={savingId === quote.id}
                              onChange={(event) => {
                                handlePendingExecutiveChange(
                                  quote.id,
                                  event.target.value,
                                );
                              }}
                              className={joinClasses(
                                "h-9 w-full min-w-[10rem] rounded-lg px-2 text-sm",
                                ui.input,
                                hasPendingChange ? "ring-2 ring-primary/25" : "",
                              )}
                              aria-label="Seleccionar ejecutivo"
                            >
                              <option value="">Sin asignar</option>
                              {executives.map((executive) => (
                                <option key={executive.id} value={executive.id}>
                                  {executive.fullName}
                                </option>
                              ))}
                            </select>

                            {hasPendingChange ? (
                              <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                                <p className="text-[11px] leading-snug text-muted">
                                  {selectedExecutiveId
                                    ? `¿Confirmas asignar esta cotización a ${resolveExecutiveLabel(selectedExecutiveId)}?`
                                    : "¿Confirmas dejar esta cotización sin ejecutivo asignado?"}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="primary"
                                    disabled={savingId === quote.id}
                                    onClick={() => {
                                      void handleExecutiveChange(
                                        quote,
                                        selectedExecutiveId || null,
                                      );
                                    }}
                                  >
                                    Confirmar
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={savingId === quote.id}
                                    onClick={() =>
                                      cancelPendingExecutiveChange(quote.id)
                                    }
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </TableCellStack>
                        );
                      })()}
                    </AdminTableCell>
                  ) : null}
                  <AdminTableCell>
                    <TableCellStack>
                      <QuoteStatusBadge status={quote.status} />
                    </TableCellStack>
                  </AdminTableCell>
                  <AdminTableCell>
                    <QuoteLeadActions
                      quote={quote}
                      executiveName={outreachName ?? quote.executiveName}
                      canEditStatus
                      saving={savingId === quote.id}
                      onStatusChange={(status) =>
                        void handleStatusChange(quote, status)
                      }
                      compact
                    />
                  </AdminTableCell>
                </AdminTableRow>
              );
            })}
          </AdminTableBody>
        </AdminTable>
      </AdminTableCard>
    </AdminPanel>
  );
}
