"use client";

import { useEffect, useMemo, useState } from "react";
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
import { fetchPlanPdfReport, uploadPlanPdfsAdmin } from "@/lib/api/admin-client";
import {
  PlanPdfRowUploadButton,
  PlanPdfUploadSection,
} from "@/components/admin/plan-pdf-upload-section";
import {
  executiveStatCardClass,
  type ExecutiveStatTone,
} from "@/lib/executive/action-styles";
import { formatQuotedUf } from "@/lib/plan-format";
import { joinClasses } from "@/lib/utils";
import type {
  IsaprePdfSummaryRow,
  MissingPlanPdfRow,
  PlanPdfReport,
} from "@/types/plan-pdf-report";

export interface PlanPdfReportPanelProps {
  onNotify: (message: string, tone?: "success" | "error") => void;
}

function summaryStatusBadge(row: IsaprePdfSummaryRow) {
  if (row.totalPlanes === 0) {
    return <AdminBadge tone="neutral">Sin planes</AdminBadge>;
  }
  if (row.sinPdf === 0) {
    return <AdminBadge tone="success">Completo</AdminBadge>;
  }
  if (row.pctPdf >= 90) {
    return (
      <AdminBadge tone="info">
        Faltan {row.sinPdf} PDF{row.sinPdf === 1 ? "" : "s"}
      </AdminBadge>
    );
  }
  return (
    <AdminBadge tone="warning">
      Faltan {row.sinPdf} PDF{row.sinPdf === 1 ? "" : "s"}
    </AdminBadge>
  );
}

function formatGeneratedAt(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function PlanPdfReportPanel({ onNotify }: PlanPdfReportPanelProps) {
  const [report, setReport] = useState<PlanPdfReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isapreFilter, setIsapreFilter] = useState<string>("all");
  const [expandedIsapreId, setExpandedIsapreId] = useState<string | null>(null);
  const [uploadingCode, setUploadingCode] = useState<string | null>(null);

  async function loadReport() {
    setLoading(true);
    try {
      const next = await fetchPlanPdfReport();
      setReport(next);
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el reporte de PDFs.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();
  }, []);

  const statCards = useMemo(() => {
    if (!report) return [];

    const cards: Array<{
      label: string;
      value: string;
      hint?: string;
      tone: ExecutiveStatTone;
    }> = [
      {
        label: "Total planes",
        value: report.totals.planes.toLocaleString("es-CL"),
        tone: "primary",
      },
      {
        label: "Con PDF",
        value: report.totals.conPdf.toLocaleString("es-CL"),
        hint: `${report.totals.pctPdf}% del catálogo`,
        tone: "success",
      },
      {
        label: "Sin PDF",
        value: report.totals.sinPdf.toLocaleString("es-CL"),
        tone: report.totals.sinPdf > 0 ? "warning" : "success",
      },
      {
        label: "Isapres",
        value: report.totals.isapres.toLocaleString("es-CL"),
        tone: "info",
      },
    ];

    return cards;
  }, [report]);

  const filteredMissing = useMemo(() => {
    if (!report) return [];

    const query = search.trim().toLowerCase();

    return report.missingPlans.filter((row) => {
      if (isapreFilter !== "all" && row.isapreId !== isapreFilter) {
        return false;
      }

      if (!query) return true;

      return (
        row.uniqueCode.toLowerCase().includes(query) ||
        row.planName.toLowerCase().includes(query) ||
        row.isapre.toLowerCase().includes(query)
      );
    });
  }, [report, search, isapreFilter]);

  const isapresWithMissing = useMemo(() => {
    if (!report) return [];
    return report.summary.filter((row) => row.sinPdf > 0);
  }, [report]);

  function toggleIsapreRow(isapreId: string) {
    setExpandedIsapreId((current) => (current === isapreId ? null : isapreId));
    setIsapreFilter(isapreId);
    setSearch("");
  }

  function handleShowAllMissing() {
    setExpandedIsapreId(null);
    setIsapreFilter("all");
  }

  async function handleRowUpload(
    row: MissingPlanPdfRow,
    files: FileList | null,
  ) {
    const file = files?.[0];
    if (!file) return;

    setUploadingCode(row.uniqueCode);
    try {
      const response = await uploadPlanPdfsAdmin({
        files: [file],
        uniqueCode: row.uniqueCode,
        isapreId: row.isapreId,
        allowReplace: true,
      });

      const success = response.results.find((item) => item.ok);
      onNotify(
        success?.ok
          ? `PDF cargado para ${success.uniqueCode}.`
          : response.results[0]?.ok === false
            ? response.results[0].error
            : "No se pudo cargar el PDF.",
        success ? "success" : "error",
      );

      if (response.uploaded > 0) {
        await loadReport();
      }
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el PDF del plan.",
        "error",
      );
    } finally {
      setUploadingCode(null);
    }
  }

  return (
    <AdminPanel>
      <AdminPanelHeader
        title="Reporte PDFs por Isapre"
        description="Estado del catálogo: planes con y sin PDF cargado en la base de datos. Use este panel para identificar qué Isapre tienen documentación pendiente."
        actions={<AdminRefreshButton onClick={() => void loadReport()} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => (
          <div key={item.label} className={executiveStatCardClass(item.tone)}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {item.label}
            </p>
            <p
              className={joinClasses(
                "mt-1 text-2xl font-bold tabular-nums",
                item.tone === "primary"
                  ? "text-primary-dark"
                  : item.tone === "success"
                    ? "text-emerald-800"
                    : item.tone === "warning"
                      ? "text-amber-800"
                      : "text-sky-800",
              )}
            >
              {loading ? "—" : item.value}
            </p>
            {item.hint ? (
              <p className="mt-1 text-xs text-muted">{item.hint}</p>
            ) : null}
          </div>
        ))}
      </div>

      {report && !loading ? (
        <p className="text-xs text-muted">
          Actualizado: {formatGeneratedAt(report.generatedAt)}
        </p>
      ) : null}

      <AdminTableCard
        loading={loading}
        empty={!loading && (report?.summary.length ?? 0) === 0}
        emptyTitle="Sin datos de Isapre"
        emptyDescription="No hay registros de planes para mostrar."
        loadingMessage="Cargando reporte de PDFs…"
        footer={
          report
            ? `${report.summary.length} Isapre en catálogo · ${isapresWithMissing.length} con PDFs pendientes`
            : undefined
        }
      >
        <AdminTable minWidth="56rem">
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeaderCell>Isapre</AdminTableHeaderCell>
              <AdminTableHeaderCell>Total planes</AdminTableHeaderCell>
              <AdminTableHeaderCell>Con PDF</AdminTableHeaderCell>
              <AdminTableHeaderCell>Sin PDF</AdminTableHeaderCell>
              <AdminTableHeaderCell>% PDF</AdminTableHeaderCell>
              <AdminTableHeaderCell>Coberturas</AdminTableHeaderCell>
              <AdminTableHeaderCell>Estado</AdminTableHeaderCell>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {report?.summary.map((row) => {
              const expanded = expandedIsapreId === row.isapreId;

              return (
                <AdminTableRow
                  key={row.isapreId}
                  selected={expanded}
                  onClick={
                    row.sinPdf > 0
                      ? () => toggleIsapreRow(row.isapreId)
                      : undefined
                  }
                >
                  <AdminTableCell>
                    <span className="font-semibold text-foreground">{row.isapre}</span>
                  </AdminTableCell>
                  <AdminTableCell>{row.totalPlanes}</AdminTableCell>
                  <AdminTableCell>{row.conPdf}</AdminTableCell>
                  <AdminTableCell>
                    <span
                      className={joinClasses(
                        row.sinPdf > 0 ? "font-semibold text-amber-800" : undefined,
                      )}
                    >
                      {row.sinPdf}
                    </span>
                  </AdminTableCell>
                  <AdminTableCell>{row.pctPdf}%</AdminTableCell>
                  <AdminTableCell>
                    {row.conCobertura}/{row.totalPlanes}
                  </AdminTableCell>
                  <AdminTableCell>{summaryStatusBadge(row)}</AdminTableCell>
                </AdminTableRow>
              );
            })}
          </AdminTableBody>
        </AdminTable>
      </AdminTableCard>

      <PlanPdfUploadSection
        defaultIsapreId={isapreFilter !== "all" ? isapreFilter : undefined}
        onNotify={onNotify}
        onComplete={() => {
          void loadReport();
        }}
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-primary-dark">
              Planes sin PDF
            </h3>
            <p className="mt-1 text-sm text-muted">
              {filteredMissing.length} plan
              {filteredMissing.length === 1 ? "" : "es"} sin documento cargado
              {isapreFilter !== "all" && report
                ? ` · ${report.summary.find((row) => row.isapreId === isapreFilter)?.isapre ?? ""}`
                : ""}
            </p>
          </div>
          {isapreFilter !== "all" ? (
            <button
              type="button"
              onClick={handleShowAllMissing}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Ver todos
            </button>
          ) : null}
        </div>

        <AdminToolbar className="sm:grid-cols-[minmax(0,1fr)_12rem]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por código, plan o Isapre…"
            aria-label="Buscar planes sin PDF"
          />
          <select
            value={isapreFilter}
            onChange={(event) => {
              setIsapreFilter(event.target.value);
              setExpandedIsapreId(
                event.target.value === "all" ? null : event.target.value,
              );
            }}
            className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
            aria-label="Filtrar por Isapre"
          >
            <option value="all">Todas las Isapre</option>
            {report?.summary
              .filter((row) => row.sinPdf > 0)
              .map((row) => (
                <option key={row.isapreId} value={row.isapreId}>
                  {row.isapre} ({row.sinPdf})
                </option>
              ))}
          </select>
        </AdminToolbar>

        <AdminTableCard
          loading={loading}
          empty={!loading && filteredMissing.length === 0}
          emptyTitle="Sin planes pendientes"
          emptyDescription={
            report?.totals.sinPdf === 0
              ? "Todos los planes tienen PDF cargado."
              : "No hay resultados para los filtros aplicados."
          }
          loadingMessage="Cargando detalle…"
          footer={
            report
              ? `Mostrando ${filteredMissing.length} de ${report.missingPlans.length} planes sin PDF.`
              : undefined
          }
        >
          <AdminTable minWidth="64rem">
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableHeaderCell>Isapre</AdminTableHeaderCell>
                <AdminTableHeaderCell>Código</AdminTableHeaderCell>
                <AdminTableHeaderCell>Plan</AdminTableHeaderCell>
                <AdminTableHeaderCell>Precio base</AdminTableHeaderCell>
                <AdminTableHeaderCell>Coberturas</AdminTableHeaderCell>
                <AdminTableHeaderCell>Zonas</AdminTableHeaderCell>
                <AdminTableHeaderCell>TOP</AdminTableHeaderCell>
                <AdminTableHeaderCell>Acciones</AdminTableHeaderCell>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {filteredMissing.map((row) => (
                <AdminTableRow key={row.uniqueCode}>
                  <AdminTableCell>{row.isapre}</AdminTableCell>
                  <AdminTableCell>
                    <code className="rounded bg-bg-layout px-1.5 py-0.5 text-xs font-semibold">
                      {row.uniqueCode}
                    </code>
                  </AdminTableCell>
                  <AdminTableCell>{row.planName}</AdminTableCell>
                  <AdminTableCell>{formatQuotedUf(row.basePriceUf)}</AdminTableCell>
                  <AdminTableCell>{row.coverageCount}</AdminTableCell>
                  <AdminTableCell>{row.zones || "—"}</AdminTableCell>
                  <AdminTableCell>{row.hasTop ? "Sí" : "No"}</AdminTableCell>
                  <AdminTableCell>
                    <PlanPdfRowUploadButton
                      uniqueCode={row.uniqueCode}
                      isapreId={row.isapreId}
                      uploading={uploadingCode === row.uniqueCode}
                      onUpload={(files) => void handleRowUpload(row, files)}
                    />
                  </AdminTableCell>
                </AdminTableRow>
              ))}
            </AdminTableBody>
          </AdminTable>
        </AdminTableCard>
      </div>
    </AdminPanel>
  );
}
