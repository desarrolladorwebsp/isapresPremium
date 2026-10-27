"use client";

import { useEffect, useId, useRef, useState } from "react";
import { isValidRut, sanitizeRutInput } from "@/lib/auth/rut";
import type { CompanyAgreementLookupResult, ValidatedCompanyAgreement } from "@/types/company-agreement";

interface Props {
  label: string;
  agreement: ValidatedCompanyAgreement | null | undefined;
  onChange: (agreement: ValidatedCompanyAgreement | null) => void;
}

export function ContributorAgreementField({ label, agreement, onChange }: Props) {
  const id = useId();
  const [rut, setRut] = useState(agreement?.companyRutRaw ?? agreement?.companyRut ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef<AbortController | null>(null);
  const change = useRef(onChange);
  useEffect(() => { change.current = onChange; }, [onChange]);
  useEffect(() => () => pending.current?.abort(), []);

  function cancelPending() {
    pending.current?.abort();
    pending.current = null;
    setBusy(false);
  }

  async function validate() {
    if (!isValidRut(rut)) {
      setMessage("Ingresa un RUT de empresa válido.");
      return;
    }
    cancelPending();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/company-agreements/lookup?${new URLSearchParams({ rut })}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("No se pudo validar el convenio.");
      const result: CompanyAgreementLookupResult = await response.json();
      if (controller.signal.aborted) return;
      const match = result.matches[0] ?? null;
      change.current(match);
      setMessage(match ? "Convenio validado solo para este cotizante." : "Empresa sin convenio registrado.");
    } catch (error) {
      if (!controller.signal.aborted) {
        change.current(null);
        setMessage(error instanceof Error ? error.message : "No se pudo validar el convenio.");
      }
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <div className="min-w-0 w-full space-y-1.5 border-t border-border/60 pt-2">
      <label htmlFor={id} className="block text-xs font-medium text-primary-dark">{label}</label>
      <div className="flex min-w-0 gap-2">
        <input
          id={id}
          value={rut}
          placeholder="RUT empresa"
          autoComplete="off"
          maxLength={14}
          onChange={(event) => {
            cancelPending();
            setRut(sanitizeRutInput(event.target.value));
            setMessage("");
            // Un RUT editado no conserva el beneficio del RUT anterior.
            if (agreement) change.current(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); void validate(); }
          }}
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-white px-2 text-base md:text-sm"
        />
        <button type="button" disabled={busy || !rut.trim()} onClick={() => void validate()}
          className="min-h-10 shrink-0 rounded-lg bg-primary px-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
          {busy ? "Validando…" : "Validar"}
        </button>
        {agreement ? <button type="button" aria-label={`Quitar convenio de ${label}`}
          onClick={() => { cancelPending(); setRut(""); setMessage(""); change.current(null); }}
          className="min-h-10 shrink-0 rounded-lg border border-border px-2 text-xs text-muted">Quitar</button> : null}
      </div>
      <p role="status" className="break-words text-xs text-muted">
        {message || (agreement ? `${agreement.companyName} · ${agreement.isapreName ?? "Convenio validado"}` : "Sin convenio. El beneficio no se comparte con otros cotizantes.")}
      </p>
    </div>
  );
}
