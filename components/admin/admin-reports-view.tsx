"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import {
  AdminFormModal,
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
} from "@/components/admin/admin-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useStaffSession } from "@/hooks/use-auth-session";
import { useExecutiveAccountsQuery } from "@/hooks/query/use-executive-accounts-query";
import { useExecutiveClientsQuery } from "@/hooks/query/use-executive-clients-query";
import {
  CLIENT_PIPELINE_STATUS_LABELS,
  CLIENT_PIPELINE_STATUS_OPTIONS,
} from "@/lib/client-pipeline/constants";
import { buildAgendaMonthOptions } from "@/lib/client-pipeline/agenda-stats";
import { santiagoDateKey, santiagoMonthKey } from "@/lib/client-pipeline/agenda-urgency";
import {
  buildAdminReports,
  isValidReportPeriod,
  type AdminReportPeriod,
} from "@/lib/executive/admin-reports";
import {
  ADMIN_EXECUTIVE_FILTER_UNASSIGNED,
  buildAdminExecutiveFilterOptions,
} from "@/lib/executive/dashboard-executive-filter";
import { joinClasses } from "@/lib/utils";

const MONTH_OPTIONS = buildAgendaMonthOptions(11);
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function isoDayToDisplay(iso: string): string {
  if (!ISO_DAY.test(iso)) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function maskDdMmYyyy(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  if (digits.length <= 2) return day;
  if (digits.length <= 4) return `${day}/${month}`;
  return `${day}/${month}/${year}`;
}

function parseDdMmYyyy(raw: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return iso;
}

function ChileanDateInput({
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (isoDay: string) => void;
  "aria-label": string;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => isoDayToDisplay(value));

  useEffect(() => {
    setText(isoDayToDisplay(value));
  }, [value]);

  return (
    <div className="relative min-w-0">
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        aria-label={ariaLabel}
        value={text}
        onChange={(event) => {
          const next = maskDdMmYyyy(event.target.value);
          setText(next);
          const iso = parseDdMmYyyy(next);
          if (iso) onChange(iso);
        }}
        onBlur={(event) => {
          const iso = parseDdMmYyyy(event.target.value);
          if (iso) {
            onChange(iso);
            setText(isoDayToDisplay(iso));
            return;
          }
          setText(isoDayToDisplay(value));
        }}
        className="h-9 pr-9"
      />
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        value={value}
        aria-hidden
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value);
        }}
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted hover:text-primary-dark"
        aria-label={`Elegir fecha ${ariaLabel}`}
        onClick={() => {
          const node = pickerRef.current;
          if (!node) return;
          try {
            node.showPicker();
          } catch {
            node.click();
          }
        }}
      >
        <Calendar className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function periodFromState(input: {
  mode: "month" | "range";
  monthKey: string;
  fromDay: string;
  toDay: string;
}): AdminReportPeriod {
  if (input.mode === "range") {
    return { kind: "range", fromDay: input.fromDay, toDay: input.toDay };
  }
  return { kind: "month", monthKey: input.monthKey };
}

function percentLabel(value: number, total: number): string {
  if (total <= 0) return "—";
  return `${value}%`;
}

function ReportSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-primary-dark">{title}</h2>
        <p className="mt-0.5 text-xs text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function AdminReportsView() {
  const { isAdmin } = useStaffSession();
  const clientsQuery = useExecutiveClientsQuery({ enabled: isAdmin });
  const executivesQuery = useExecutiveAccountsQuery({ enabled: isAdmin });

  const todayKey = santiagoDateKey(new Date()) ?? "";
  const [dateMode, setDateMode] = useState<"month" | "range">("month");
  const [selectedMonth, setSelectedMonth] = useState(
    () => santiagoMonthKey(new Date()) ?? MONTH_OPTIONS[0]?.value ?? "",
  );
  const [fromDay, setFromDay] = useState(todayKey);
  const [toDay, setToDay] = useState(todayKey);
  const [selectedExecutiveIds, setSelectedExecutiveIds] = useState<string[]>(
    [],
  );
  const [executivePickerOpen, setExecutivePickerOpen] = useState(false);
  const [executiveQuery, setExecutiveQuery] = useState("");

  const executiveOptions = useMemo(() => {
    const options = buildAdminExecutiveFilterOptions({
      accounts: executivesQuery.data ?? [],
      clients: clientsQuery.data ?? [],
    }).filter(
      (option) =>
        option.value !== "" &&
        option.value !== ADMIN_EXECUTIVE_FILTER_UNASSIGNED,
    );
    return [
      {
        value: ADMIN_EXECUTIVE_FILTER_UNASSIGNED,
        label: "Sin asignar",
        sortName: "Sin asignar",
      },
      ...options,
    ];
  }, [executivesQuery.data, clientsQuery.data]);

  const executiveNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of executiveOptions) {
      map.set(option.value, option.label);
    }
    return map;
  }, [executiveOptions]);

  const reports = useMemo(() => {
    if (!clientsQuery.data) return null;
    const nextPeriod = periodFromState({
      mode: dateMode,
      monthKey: selectedMonth,
      fromDay,
      toDay,
    });
    if (!isValidReportPeriod(nextPeriod)) return null;
    return buildAdminReports({
      clients: clientsQuery.data,
      period: nextPeriod,
      selectedExecutiveIds,
      executiveNames,
    });
  }, [
    clientsQuery.data,
    dateMode,
    selectedMonth,
    fromDay,
    toDay,
    selectedExecutiveIds,
    executiveNames,
  ]);

  const periodOk = isValidReportPeriod(
    periodFromState({
      mode: dateMode,
      monthKey: selectedMonth,
      fromDay,
      toDay,
    }),
  );
  const loading = clientsQuery.isLoading && !clientsQuery.data;
  const allSelected = selectedExecutiveIds.length === 0;
  const selectedLabel = allSelected
    ? "Todos los ejecutivos"
    : selectedExecutiveIds.length === 1
      ? executiveNames.get(selectedExecutiveIds[0]) ?? "1 ejecutivo"
      : `${selectedExecutiveIds.length} ejecutivos`;
  const filteredExecutiveOptions = useMemo(() => {
    const query = executiveQuery.trim().toLowerCase();
    if (!query) return executiveOptions;
    return executiveOptions.filter((option) =>
      option.label.toLowerCase().includes(query),
    );
  }, [executiveOptions, executiveQuery]);
  const selectedChips = allSelected
    ? []
    : selectedExecutiveIds
        .map((id) => ({
          id,
          label: executiveNames.get(id) ?? id,
        }))
        .slice(0, 4);

  function toggleExecutive(id: string) {
    setSelectedExecutiveIds((current) => {
      if (current.includes(id)) {
        return current.filter((value) => value !== id);
      }
      return [...current, id];
    });
  }

  function closeExecutivePicker() {
    setExecutivePickerOpen(false);
    setExecutiveQuery("");
  }

  if (!isAdmin) return null;

  return (
    <AdminPanel>
      <AdminPanelHeader
        compactMobile
        title="Reportes"
        actions={
          <AdminRefreshButton
            compactMobile
            loading={clientsQuery.isFetching || executivesQuery.isFetching}
            onClick={() => {
              void clientsQuery.refetch();
              void executivesQuery.refetch();
            }}
          />
        }
      />

      <div className="grid gap-3 rounded-2xl border border-border/80 bg-white p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted">
            Período
          </legend>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={dateMode === "month" ? "primary" : "ghost"}
                onClick={() => setDateMode("month")}
              >
                Mes
              </Button>
              <Button
                type="button"
                size="sm"
                variant={dateMode === "range" ? "primary" : "ghost"}
                onClick={() => setDateMode("range")}
              >
                Rango
              </Button>
            </div>
            {dateMode === "month" ? (
              <Select
                aria-label="Mes"
                value={selectedMonth}
                options={MONTH_OPTIONS}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="h-9 min-w-0 flex-1"
              />
            ) : (
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                <ChileanDateInput
                  aria-label="Desde"
                  value={fromDay}
                  onChange={setFromDay}
                />
                <ChileanDateInput
                  aria-label="Hasta"
                  value={toDay}
                  onChange={setToDay}
                />
              </div>
            )}
          </div>
          {!periodOk ? (
            <p className="text-xs text-danger">Revisa el rango de fechas.</p>
          ) : null}
        </fieldset>

        <fieldset className="min-w-0 space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted">
            Ejecutivos
          </legend>
          <button
            type="button"
            onClick={() => setExecutivePickerOpen(true)}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border/80 bg-bg-layout/40 px-3 py-2 text-left transition hover:border-primary/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-haspopup="dialog"
            aria-expanded={executivePickerOpen}
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-primary-dark">
                {selectedLabel}
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                {allSelected
                  ? `${executiveOptions.length} en el reporte`
                  : "Toca para cambiar la selección"}
              </span>
            </span>
            <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-primary-dark shadow-sm">
              Elegir
            </span>
          </button>
          {selectedChips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedChips.map((chip) => (
                <span
                  key={chip.id}
                  className="max-w-full truncate rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary-dark"
                >
                  {chip.label}
                </span>
              ))}
              {selectedExecutiveIds.length > selectedChips.length ? (
                <span className="rounded-full bg-bg-layout px-2.5 py-1 text-xs font-medium text-muted">
                  +{selectedExecutiveIds.length - selectedChips.length}
                </span>
              ) : null}
            </div>
          ) : null}
        </fieldset>
      </div>

      <AdminFormModal
        open={executivePickerOpen}
        title="Elegir ejecutivos"
        description="Uno, varios o todos. El filtro aplica a los tres reportes."
        onClose={closeExecutivePicker}
        size="md"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={allSelected ? "primary" : "ghost"}
              onClick={() => setSelectedExecutiveIds([])}
            >
              Todos
            </Button>
            <p className="text-xs text-muted">{selectedLabel}</p>
          </div>
          <Input
            type="search"
            value={executiveQuery}
            onChange={(event) => setExecutiveQuery(event.target.value)}
            placeholder="Buscar por nombre…"
            aria-label="Buscar ejecutivo"
          />
          <ul className="max-h-[min(22rem,50vh)] space-y-1 overflow-y-auto overscroll-y-contain rounded-xl border border-border/70 p-1.5">
            {filteredExecutiveOptions.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-muted">
                Sin coincidencias.
              </li>
            ) : (
              filteredExecutiveOptions.map((option) => {
                const checked = selectedExecutiveIds.includes(option.value);
                return (
                  <li key={option.value}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-bg-layout/80">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-primary"
                        checked={allSelected || checked}
                        onChange={() => {
                          if (allSelected) {
                            setSelectedExecutiveIds([option.value]);
                            return;
                          }
                          toggleExecutive(option.value);
                        }}
                      />
                      <span className="min-w-0 leading-snug text-primary-dark">
                        {option.label}
                      </span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>
          <div className="flex justify-end pt-1">
            <Button type="button" variant="primary" onClick={closeExecutivePicker}>
              Listo
            </Button>
          </div>
        </div>
      </AdminFormModal>

      <ReportSection
        title="Pipeline del ejecutivo"
        description="Clientes que ingresaron en el período, según su estado actual. Cuenta quien los tiene asignados ahora."
      >
        <AdminTableCard
          loading={loading}
          empty={!loading && periodOk && (reports?.rows.length ?? 0) === 0}
          emptyTitle="Sin clientes en este período"
          emptyDescription="Prueba otro mes, rango o ejecutivo."
          loadingMessage="Cargando reportes…"
          footer={
            reports
              ? `${reports.totals.pipelineTotal} clientes ingresados en el período.`
              : undefined
          }
        >
          <AdminTable minWidth="56rem">
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableHeaderCell>Ejecutivo</AdminTableHeaderCell>
                {CLIENT_PIPELINE_STATUS_OPTIONS.map((status) => (
                  <AdminTableHeaderCell key={status} align="right">
                    {CLIENT_PIPELINE_STATUS_LABELS[status]}
                  </AdminTableHeaderCell>
                ))}
                <AdminTableHeaderCell align="right">Total</AdminTableHeaderCell>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {(reports?.rows ?? []).map((row) => (
                <AdminTableRow
                  key={row.executiveId ?? ADMIN_EXECUTIVE_FILTER_UNASSIGNED}
                >
                  <AdminTableCell>{row.executiveName}</AdminTableCell>
                  {CLIENT_PIPELINE_STATUS_OPTIONS.map((status) => (
                    <AdminTableCell key={status} align="right">
                      {row.pipeline[status]}
                    </AdminTableCell>
                  ))}
                  <AdminTableCell align="right">{row.pipelineTotal}</AdminTableCell>
                </AdminTableRow>
              ))}
              {reports && reports.rows.length > 0 ? (
                <AdminTableRow className="bg-bg-layout/60 font-semibold">
                  <AdminTableCell>Total</AdminTableCell>
                  {CLIENT_PIPELINE_STATUS_OPTIONS.map((status) => (
                    <AdminTableCell key={status} align="right">
                      {reports.totals.pipeline[status]}
                    </AdminTableCell>
                  ))}
                  <AdminTableCell align="right">
                    {reports.totals.pipelineTotal}
                  </AdminTableCell>
                </AdminTableRow>
              ) : null}
            </AdminTableBody>
          </AdminTable>
        </AdminTableCard>
      </ReportSection>

      <ReportSection
        title="Velocidad de primer contacto"
        description="De los clientes que ingresaron en el período, cuántos ya tienen alguna gestión (incluido No contesta) y cuántos siguen en Nuevo sin agenda."
      >
        <AdminTableCard
          loading={loading}
          empty={!loading && periodOk && (reports?.rows.length ?? 0) === 0}
          emptyTitle="Sin ingresos en este período"
          emptyDescription="No hay clientes nuevos que coincidan con el filtro."
          loadingMessage="Cargando reportes…"
        >
          <AdminTable minWidth="36rem">
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableHeaderCell>Ejecutivo</AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">Ingresos</AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">
                  Con gestión
                </AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">
                  Sin gestión
                </AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">
                  % contactados
                </AdminTableHeaderCell>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {(reports?.rows ?? []).map((row) => (
                <AdminTableRow
                  key={`c-${row.executiveId ?? ADMIN_EXECUTIVE_FILTER_UNASSIGNED}`}
                >
                  <AdminTableCell>{row.executiveName}</AdminTableCell>
                  <AdminTableCell align="right">
                    {row.firstContactTotal}
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    {row.firstContactDone}
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    {row.firstContactPending}
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    {percentLabel(row.firstContactRate, row.firstContactTotal)}
                  </AdminTableCell>
                </AdminTableRow>
              ))}
              {reports && reports.rows.length > 0 ? (
                <AdminTableRow className="bg-bg-layout/60 font-semibold">
                  <AdminTableCell>Total</AdminTableCell>
                  <AdminTableCell align="right">
                    {reports.totals.firstContactTotal}
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    {reports.totals.firstContactDone}
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    {reports.totals.firstContactPending}
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    {percentLabel(
                      reports.totals.firstContactRate,
                      reports.totals.firstContactTotal,
                    )}
                  </AdminTableCell>
                </AdminTableRow>
              ) : null}
            </AdminTableBody>
          </AdminTable>
        </AdminTableCard>
      </ReportSection>

      <ReportSection
        title="Cumplimiento de gestiones"
        description="Pendientes con fecha en el período: Zoom atrasado, confirmaciones y clientes nuevos sin gestión. Hoy y futuras también se listan si caen en el rango."
      >
        <AdminTableCard
          loading={loading}
          empty={!loading && periodOk && (reports?.rows.length ?? 0) === 0}
          emptyTitle="Sin gestiones en este período"
          emptyDescription="No hay agenda ni ingresos que coincidan con el filtro."
          loadingMessage="Cargando reportes…"
        >
          <AdminTable minWidth="52rem">
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableHeaderCell>Ejecutivo</AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">
                  Zoom atrasadas
                </AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">Zoom hoy</AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">
                  Zoom futuras
                </AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">
                  Confirm. atrasadas
                </AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">
                  Confirm. hoy
                </AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">
                  Confirm. futuras
                </AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">
                  Nuevos sin gestión
                </AdminTableHeaderCell>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {(reports?.rows ?? []).map((row) => (
                <AdminTableRow
                  key={`g-${row.executiveId ?? ADMIN_EXECUTIVE_FILTER_UNASSIGNED}`}
                >
                  <AdminTableCell>{row.executiveName}</AdminTableCell>
                  <AdminTableCell
                    align="right"
                    className={joinClasses(row.zoomOverdue > 0 && "text-danger")}
                  >
                    {row.zoomOverdue}
                  </AdminTableCell>
                  <AdminTableCell align="right">{row.zoomToday}</AdminTableCell>
                  <AdminTableCell align="right">{row.zoomUpcoming}</AdminTableCell>
                  <AdminTableCell
                    align="right"
                    className={joinClasses(
                      row.confirmOverdue > 0 && "text-danger",
                    )}
                  >
                    {row.confirmOverdue}
                  </AdminTableCell>
                  <AdminTableCell align="right">{row.confirmToday}</AdminTableCell>
                  <AdminTableCell align="right">
                    {row.confirmUpcoming}
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    {row.newWithoutGestion}
                  </AdminTableCell>
                </AdminTableRow>
              ))}
              {reports && reports.rows.length > 0 ? (
                <AdminTableRow className="bg-bg-layout/60 font-semibold">
                  <AdminTableCell>Total</AdminTableCell>
                  <AdminTableCell align="right">
                    {reports.totals.zoomOverdue}
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    {reports.totals.zoomToday}
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    {reports.totals.zoomUpcoming}
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    {reports.totals.confirmOverdue}
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    {reports.totals.confirmToday}
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    {reports.totals.confirmUpcoming}
                  </AdminTableCell>
                  <AdminTableCell align="right">
                    {reports.totals.newWithoutGestion}
                  </AdminTableCell>
                </AdminTableRow>
              ) : null}
            </AdminTableBody>
          </AdminTable>
        </AdminTableCard>
      </ReportSection>
    </AdminPanel>
  );
}
