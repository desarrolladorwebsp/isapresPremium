"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminBadge,
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
  fetchCompanyAgreementsAdmin,
  importCompanyAgreementsAdmin,
} from "@/lib/api/admin-client";
import {
  COMPANY_AGREEMENT_DISCOUNT_BY_ISAPRE,
  resolveCompanyAgreementDiscountPercent,
} from "@/lib/company-agreements/constants";
import {
  executiveStatCardClass,
  type ExecutiveStatTone,
} from "@/lib/executive/action-styles";
import { ISAPRE_CATALOG } from "@/lib/isapre-catalog";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";
import type { CompanyAgreementAdminListResult } from "@/types/company-agreement";

export interface CompanyAgreementsPanelProps {
  onNotify: (message: string, tone?: "success" | "error") => void;
}

const AGREEMENT_ISAPRES = ISAPRE_CATALOG.filter((item) =>
  Object.prototype.hasOwnProperty.call(
    COMPANY_AGREEMENT_DISCOUNT_BY_ISAPRE,
    item.id,
  ),
);

function formatUpdatedAt(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatDiscount(value: number | null): string {
  if (value == null) return "—";
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("es-CL", { maximumFractionDigits: 2 });
  return `${formatted}%`;
}

export function CompanyAgreementsPanel({
  onNotify,
}: CompanyAgreementsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<CompanyAgreementAdminListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isapreFilter, setIsapreFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">(
    "active",
  );
  const [page, setPage] = useState(1);
  const [importIsapreId, setImportIsapreId] = useState(
    AGREEMENT_ISAPRES[0]?.id ?? "colmena",
  );
  const [importDiscount, setImportDiscount] = useState(
    String(resolveCompanyAgreementDiscountPercent(AGREEMENT_ISAPRES[0]?.id ?? "colmena")),
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  async function loadAgreements(nextPage = page) {
    setLoading(true);
    try {
      const result = await fetchCompanyAgreementsAdmin({
        q: debouncedSearch || undefined,
        isapreId: isapreFilter === "all" ? undefined : isapreFilter,
        active:
          activeFilter === "all"
            ? undefined
            : activeFilter === "active"
              ? true
              : false,
        page: nextPage,
        pageSize: 50,
      });
      setData(result);
      setPage(result.page);
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los convenios.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAgreements(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional reload on filters
  }, [debouncedSearch, isapreFilter, activeFilter]);

  const statCards = useMemo(() => {
    if (!data) return [];

    const cards: Array<{
      label: string;
      value: string;
      hint?: string;
      tone: ExecutiveStatTone;
    }> = [
      {
        label: "Total convenios",
        value: data.totals.all.toLocaleString("es-CL"),
        tone: "primary",
      },
      {
        label: "Activos",
        value: data.totals.active.toLocaleString("es-CL"),
        tone: "success",
      },
      {
        label: "Inactivos",
        value: data.totals.inactive.toLocaleString("es-CL"),
        tone: data.totals.inactive > 0 ? "warning" : "info",
      },
      {
        label: "Isapres",
        value: data.byIsapre.length.toLocaleString("es-CL"),
        tone: "info",
      },
    ];

    return cards;
  }, [data]);

  function handleImportIsapreChange(nextIsapreId: string) {
    setImportIsapreId(nextIsapreId);
    setImportDiscount(
      String(resolveCompanyAgreementDiscountPercent(nextIsapreId)),
    );
  }

  async function handleImport(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls") && !lower.endsWith(".csv")) {
      onNotify("Solo se permiten archivos Excel (.xlsx / .xls) o CSV.", "error");
      return;
    }

    const discountValue = Number(importDiscount);
    if (
      !Number.isFinite(discountValue) ||
      discountValue <= 0 ||
      discountValue > 100
    ) {
      onNotify("El descuento debe ser un número entre 1 y 100.", "error");
      return;
    }

    setImporting(true);
    try {
      const result = await importCompanyAgreementsAdmin({
        file,
        isapreId: importIsapreId,
        discountPercent: discountValue,
      });

      onNotify(
        `${result.imported} convenios de ${result.isapreName}: ${result.created} nuevos · ${result.updated} actualizados (${result.discountPercent}%).`,
        "success",
      );
      await loadAgreements(1);
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo importar el archivo de convenios.",
        "error",
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <AdminPanel>
      <AdminPanelHeader
        title="Convenios empresa"
        description="Lista de RUTs con convenio activo y carga masiva desde Excel. El descuento aplica a la isapre indicada al importar."
        actions={
          <AdminRefreshButton onClick={() => void loadAgreements(page)} />
        }
      />

      {statCards.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={joinClasses(
                executiveStatCardClass(card.tone),
                "rounded-2xl border px-4 py-3",
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-primary-dark">
                {card.value}
              </p>
              {card.hint ? (
                <p className="mt-1 text-xs text-muted">{card.hint}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div
        className={joinClasses(
          "rounded-2xl border bg-white p-4 shadow-sm sm:p-5",
          ui.border,
        )}
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-primary-dark">
              Cargar convenios
            </h3>
            <p className="mt-1 text-xs text-muted">
              Sube un Excel con columnas de RUT y razón social (o nombre filial).
              Si el archivo no trae descuento, se usa el porcentaje por isapre.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_8rem_auto]">
          <label className="block text-xs font-medium text-muted">
            Isapre del convenio
            <select
              value={importIsapreId}
              onChange={(event) => handleImportIsapreChange(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm text-foreground"
            >
              {AGREEMENT_ISAPRES.map((isapre) => (
                <option key={isapre.id} value={isapre.id}>
                  {isapre.name} (
                  {resolveCompanyAgreementDiscountPercent(isapre.id)}%)
                </option>
              ))}
              {ISAPRE_CATALOG.filter(
                (isapre) =>
                  !AGREEMENT_ISAPRES.some((item) => item.id === isapre.id),
              ).map((isapre) => (
                <option key={isapre.id} value={isapre.id}>
                  {isapre.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-muted">
            Descuento %
            <Input
              type="number"
              min={1}
              max={100}
              step={0.5}
              value={importDiscount}
              onChange={(event) => setImportDiscount(event.target.value)}
              className="mt-1"
            />
          </label>

          <div className="flex items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={(event) => void handleImport(event.target.files)}
            />
            <Button
              type="button"
              className={joinClasses("h-10 w-full sm:w-auto", ui.cta)}
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              {importing ? "Importando…" : "Seleccionar Excel"}
            </Button>
          </div>
        </div>
      </div>

      <AdminToolbar className="sm:grid-cols-[1fr_12rem_10rem]">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por RUT o empresa…"
        />
        <select
          value={isapreFilter}
          onChange={(event) => {
            setIsapreFilter(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border bg-white px-3 text-sm"
        >
          <option value="all">Todas las isapres</option>
          {(data?.byIsapre ?? AGREEMENT_ISAPRES.map((item) => ({
            isapreId: item.id,
            isapreName: item.name,
          }))).map((item) => (
            <option key={item.isapreId} value={item.isapreId}>
              {item.isapreName}
            </option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(event) => {
            setActiveFilter(
              event.target.value as "all" | "active" | "inactive",
            );
            setPage(1);
          }}
          className="h-10 rounded-lg border bg-white px-3 text-sm"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Solo activos</option>
          <option value="inactive">Solo inactivos</option>
        </select>
      </AdminToolbar>

      <AdminTableCard
        loading={loading}
        empty={!loading && (data?.items.length ?? 0) === 0}
        emptyTitle="Sin convenios"
        emptyDescription="No hay convenios con estos filtros. Carga un Excel para comenzar."
        footer={
          data ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                Mostrando {(data.page - 1) * data.pageSize + 1}–
                {Math.min(data.page * data.pageSize, data.total)} de{" "}
                {data.total.toLocaleString("es-CL")}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => void loadAgreements(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={page >= data.totalPages || loading}
                  onClick={() => void loadAgreements(page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        <AdminTable minWidth="56rem">
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell>Empresa</AdminTableHeaderCell>
              <AdminTableHeaderCell>RUT</AdminTableHeaderCell>
              <AdminTableHeaderCell>Isapre</AdminTableHeaderCell>
              <AdminTableHeaderCell>Descuento</AdminTableHeaderCell>
              <AdminTableHeaderCell>Estado</AdminTableHeaderCell>
              <AdminTableHeaderCell>Origen</AdminTableHeaderCell>
              <AdminTableHeaderCell>Actualizado</AdminTableHeaderCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {(data?.items ?? []).map((item) => (
              <AdminTableRow key={item.id}>
                <AdminTableCell>
                  <span className="font-medium text-foreground">
                    {item.companyName}
                  </span>
                </AdminTableCell>
                <AdminTableCell>
                  <span className="font-mono text-xs">
                    {item.companyRutRaw ?? item.companyRut}
                  </span>
                </AdminTableCell>
                <AdminTableCell>{item.isapreName ?? "—"}</AdminTableCell>
                <AdminTableCell>
                  {formatDiscount(item.discountPercent)}
                </AdminTableCell>
                <AdminTableCell>
                  {item.active ? (
                    <AdminBadge tone="success">Activo</AdminBadge>
                  ) : (
                    <AdminBadge tone="neutral">Inactivo</AdminBadge>
                  )}
                </AdminTableCell>
                <AdminTableCell>
                  <span className="text-xs text-muted">
                    {item.sourceFile ?? "—"}
                  </span>
                </AdminTableCell>
                <AdminTableCell>
                  <span className="text-xs text-muted">
                    {formatUpdatedAt(item.updatedAt)}
                  </span>
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminTable>
      </AdminTableCard>
    </AdminPanel>
  );
}
