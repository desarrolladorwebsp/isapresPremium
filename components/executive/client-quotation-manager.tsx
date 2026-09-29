"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminFormModal } from "@/components/admin/admin-data-table";
import { ClientFichaCapsule } from "@/components/executive/client-ficha-capsule";
import { Button } from "@/components/ui/button";
import type { UserRecord } from "@/types/user";
import {
  CLIENT_QUOTATION_STATUS_HELP,
  CLIENT_QUOTATION_STATUS_LABELS,
  CLIENT_QUOTATION_STATUS_OPTIONS,
  type ClientQuotationRecord,
  type ClientQuotationStatus,
} from "@/types/client-quotation";

function IconQuotation() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M7 3h8l4 4v14H7a2 2 0 01-2-2V5a2 2 0 012-2z" /><path d="M15 3v5h5M9 12h6M9 16h6" strokeLinecap="round" />
  </svg>;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error || "No se pudo completar la operación.");
  return payload as T;
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";
}

export function ClientQuotationManager({ client, canEdit }: { client: UserRecord; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [quotations, setQuotations] = useState<ClientQuotationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPlans, setSelectedPlans] = useState<string[]>(() => {
    const chosen = client.assignedPlans?.find((plan) => plan.isChosen);
    return chosen ? [chosen.planCode] : client.assignedPlans?.[0] ? [client.assignedPlans[0].planCode] : [];
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endpoint = `/api/executive/clients/${encodeURIComponent(client.id)}/quotations`;

  useEffect(() => {
    let cancelled = false;
    void fetch(endpoint, { cache: "no-store" })
      .then((response) => readJson<ClientQuotationRecord[]>(response))
      .then((rows) => {
        if (cancelled) return;
        setQuotations(rows);
        setSelectedId(rows[0]?.id ?? null);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las cotizaciones.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [endpoint]);
  const selected = quotations.find((row) => row.id === selectedId) ?? quotations[0] ?? null;
  const latest = quotations[0] ?? null;
  const assignedPlans = client.assignedPlans ?? [];
  const statusCounts = useMemo(() => ({
    accepted: quotations.filter((row) => row.status === "ACCEPTED").length,
    rejected: quotations.filter((row) => row.status === "REJECTED").length,
  }), [quotations]);

  function togglePlan(code: string) {
    setSelectedPlans((current) => current.includes(code)
      ? current.filter((item) => item !== code)
      : current.length < 3 ? [...current, code] : current);
  }

  async function createQuotation() {
    if (selectedPlans.length < 1 || selectedPlans.length > 3) return;
    setBusy(true); setError(null);
    try {
      const created = await readJson<ClientQuotationRecord>(await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planCodes: selectedPlans }),
      }));
      setQuotations((rows) => [created, ...rows]); setSelectedId(created.id);
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "No se pudo crear la cotización."); }
    finally { setBusy(false); }
  }

  async function changeStatus(status: ClientQuotationStatus) {
    if (!selected || status === selected.status) return;
    const requiresReason = status === "REJECTED" || status === "VOIDED";
    const reason = requiresReason ? window.prompt(status === "REJECTED" ? "Motivo del rechazo:" : "Motivo de la anulación:") : null;
    if (requiresReason && !reason?.trim()) return;
    setBusy(true); setError(null);
    try {
      const updated = await readJson<ClientQuotationRecord>(await fetch(`${endpoint}/${encodeURIComponent(selected.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, reason }),
      }));
      setQuotations((rows) => rows.map((row) => row.id === updated.id ? updated : row));
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "No se pudo actualizar el estado."); }
    finally { setBusy(false); }
  }

  async function send(channel: "EMAIL" | "WHATSAPP") {
    if (!selected) return;
    const whatsappWindow = channel === "WHATSAPP" ? window.open("about:blank", "_blank") : null;
    if (channel === "WHATSAPP") {
      const download = document.createElement("a");
      download.href = selected.pdfUrl;
      download.download = `${selected.number}.pdf`;
      document.body.appendChild(download);
      download.click();
      download.remove();
    }
    setBusy(true); setError(null);
    try {
      const result = await readJson<{ quotation: ClientQuotationRecord; whatsappUrl?: string }>(await fetch(`${endpoint}/${encodeURIComponent(selected.id)}/send`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel }),
      }));
      setQuotations((rows) => rows.map((row) => row.id === result.quotation.id ? result.quotation : row));
      if (result.whatsappUrl) {
        if (whatsappWindow) whatsappWindow.location.href = result.whatsappUrl;
        else window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
      }
    } catch (actionError) {
      whatsappWindow?.close();
      setError(actionError instanceof Error ? actionError.message : "No se pudo compartir la cotización.");
    }
    finally { setBusy(false); }
  }

  return <>
    <ClientFichaCapsule
      icon={<IconQuotation />}
      title="Cotización"
      description="Propuestas formales, envíos, estados e historial comercial."
      fields={[
        { label: "Última", value: latest ? latest.number : "Sin cotizaciones" },
        { label: "Estado", value: latest ? CLIENT_QUOTATION_STATUS_LABELS[latest.status] : "Pendiente de crear" },
        { label: "Aceptadas", value: String(statusCounts.accepted) },
        { label: "Rechazadas", value: String(statusCounts.rejected) },
      ]}
      ctaLabel={quotations.length ? "Gestionar cotizaciones" : "Crear cotización"}
      onClick={() => setOpen(true)}
    />

    <AdminFormModal open={open} title="Cotizaciones comerciales" description="Hasta 3 propuestas por documento, con PDF formal e historial auditable." onClose={() => setOpen(false)} size="xl" headerTone="navy">
      <div className="space-y-6">
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div> : null}
        <section className="rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h4 className="font-bold text-[color:var(--dash-navy,#092558)]">Nueva cotización</h4><p className="text-sm text-muted">Selecciona entre 1 y 3 planes ya agregados a la propuesta.</p></div>
            <Button type="button" disabled={!canEdit || busy || selectedPlans.length < 1 || selectedPlans.length > 3} onClick={() => void createQuotation()}>{busy ? "Procesando…" : "Generar cotización"}</Button>
          </div>
          {assignedPlans.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{assignedPlans.map((plan) => {
            const checked = selectedPlans.includes(plan.planCode);
            return <label key={plan.planCode} className={`cursor-pointer rounded-xl border p-3 text-sm ${checked ? "border-cyan-500 bg-cyan-50" : "border-slate-200"}`}>
              <input type="checkbox" className="mr-2" checked={checked} disabled={!checked && selectedPlans.length >= 3} onChange={() => togglePlan(plan.planCode)} />
              <span className="font-semibold">{plan.isapre}</span><span className="mt-1 block text-xs text-muted">{plan.planName} · UF {plan.finalPriceUf ?? plan.basePriceUf ?? "—"}{plan.isChosen ? " · Elegido" : ""}</span>
            </label>;
          })}</div> : <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Primero agrega al menos un plan en la cápsula “Plan elegido”.</p>}
        </section>

        <section className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <div className="space-y-2"><h4 className="font-bold text-[color:var(--dash-navy,#092558)]">Documentos emitidos</h4>{loading ? <p className="text-sm text-muted">Cargando…</p> : quotations.length ? quotations.map((row) => <button type="button" key={row.id} onClick={() => setSelectedId(row.id)} className={`w-full rounded-xl border p-3 text-left ${selected?.id === row.id ? "border-[color:var(--dash-navy,#092558)] bg-slate-50" : "border-slate-200"}`}><span className="block text-sm font-bold">{row.number}</span><span className="text-xs text-muted">{CLIENT_QUOTATION_STATUS_LABELS[row.status]} · {row.plans.length} propuesta{row.plans.length === 1 ? "" : "s"}</span></button>) : <p className="text-sm text-muted">Aún no hay cotizaciones.</p>}</div>
          {selected ? <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-lg font-bold text-[color:var(--dash-navy,#092558)]">{selected.number}</h4><p className="text-sm text-muted">Creada {formatDate(selected.createdAt)} por {selected.executiveName}</p></div><span title={CLIENT_QUOTATION_STATUS_HELP[selected.status]} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{CLIENT_QUOTATION_STATUS_LABELS[selected.status]} ⓘ</span></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">{selected.plans.map((plan, index) => <div key={plan.planCode} className="rounded-xl bg-slate-50 p-3"><span className="text-xs font-bold uppercase text-muted">Propuesta {index + 1}</span><p className="font-bold">{plan.isapre}</p><p className="text-sm">{plan.planName}</p><p className="text-sm font-semibold">UF {plan.finalPriceUf}</p></div>)}</div>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={selected.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold">Ver PDF</a>
              <Button type="button" disabled={!canEdit || busy || selected.status === "VOIDED"} onClick={() => void send("EMAIL")}>Enviar por email</Button>
              <Button type="button" variant="ghost" disabled={!canEdit || busy || selected.status === "VOIDED"} onClick={() => void send("WHATSAPP")}>WhatsApp + PDF</Button>
              <select aria-label="Estado de cotización" value={selected.status} disabled={!canEdit || busy} onChange={(event) => void changeStatus(event.target.value as ClientQuotationStatus)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold">{CLIENT_QUOTATION_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{CLIENT_QUOTATION_STATUS_LABELS[status]}</option>)}</select>
            </div>
            <details className="mt-4 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-semibold">¿Qué significa cada estado?</summary><dl className="mt-3 space-y-2">{CLIENT_QUOTATION_STATUS_OPTIONS.map((status) => <div key={status}><dt className="text-sm font-bold">{CLIENT_QUOTATION_STATUS_LABELS[status]}</dt><dd className="text-xs text-muted">{CLIENT_QUOTATION_STATUS_HELP[status]}</dd></div>)}</dl></details>
            <div className="mt-4"><h5 className="text-sm font-bold">Historial</h5><ol className="mt-2 space-y-2">{selected.activities.map((activity) => <li key={activity.id} className="border-l-2 border-cyan-500 pl-3 text-xs"><span className="font-semibold">{activity.description}</span><span className="ml-2 text-muted">{formatDate(activity.createdAt)}</span></li>)}</ol></div>
          </div> : null}
        </section>
      </div>
    </AdminFormModal>
  </>;
}
