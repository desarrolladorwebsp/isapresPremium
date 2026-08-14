"use client";

import { useEffect, useMemo, useState } from "react";
import { ClientFichaCapsule } from "@/components/executive/client-ficha-capsule";
import type { ClientProfileFormValue } from "@/components/executive/client-profile-form";
import { isValidRut } from "@/lib/auth/rut";
import { resolveClientChecklist } from "@/lib/client-pipeline/constants";
import {
  clientNoteDisplayText,
  listClientNoteLines,
} from "@/lib/client-pipeline/note-stamp";
import { resolveCurrentCoverageLabel } from "@/lib/client-profile/current-coverage";
import { contributorTypeLabel } from "@/lib/quote-criteria-options";
import type { CompanyAgreementLookupResult } from "@/types/company-agreement";
import type { UserRecord } from "@/types/user";

export type PremiumFichaModal =
  | "employer"
  | "family"
  | "plan"
  | "personal"
  | "prevision"
  | "complementaria"
  | "notas"
  | "docs";

function IconBuilding({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path
        d="M4 21V5a1 1 0 011-1h8a1 1 0 011 1v16M14 9h5a1 1 0 011 1v11M9 8h.01M9 12h.01M9 16h.01M17 13h.01M17 17h.01"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconFamily({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="8" r="2.5" />
      <path
        d="M3 20v-1a5 5 0 0110 0v1M14.5 20v-.8a4 4 0 013.5-3.95"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPlan({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
        strokeLinecap="round"
      />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" strokeLinecap="round" />
    </svg>
  );
}

function IconUser({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.5" />
      <path
        d="M5 20v-.8c0-3 2.8-5.4 7-5.4s7 2.4 7 5.4V20"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPrevision({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path
        d="M12 3l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12.5l1.8 1.8 3.7-3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconComplementaria({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path
        d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

function IconNotes({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path
        d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
    </svg>
  );
}

function IconDocs({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path
        d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
      <path d="M12 11v6M9 14h6" strokeLinecap="round" />
    </svg>
  );
}

export interface ClientPremiumCapsulesProps {
  client: UserRecord;
  profileForm: ClientProfileFormValue;
  canEdit: boolean;
  onOpenModal: (modal: PremiumFichaModal) => void;
}

/**
 * Cápsulas Empleador / Grupo familiar / Plan elegido (hub Ejecutivo Isapre).
 */
export function ClientPremiumCapsules({
  client,
  profileForm,
  canEdit,
  onOpenModal,
}: ClientPremiumCapsulesProps) {
  const employerRut = profileForm.employerRut.trim();
  const [convenioLabel, setConvenioLabel] = useState("Sin RUT empleador");

  useEffect(() => {
    if (!employerRut) {
      setConvenioLabel("Sin RUT empleador");
      return;
    }
    if (!isValidRut(employerRut)) {
      setConvenioLabel("RUT empleador inválido");
      return;
    }

    let cancelled = false;
    setConvenioLabel("Verificando convenio…");
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ rut: employerRut });
          const response = await fetch(
            `/api/company-agreements/lookup?${params}`,
          );
          const payload = (await response.json().catch(() => null)) as
            | (CompanyAgreementLookupResult & { error?: string })
            | null;
          if (cancelled) return;
          if (!response.ok) {
            setConvenioLabel("No se pudo verificar convenio");
            return;
          }
          const match = payload?.matches[0] ?? null;
          if (!match) {
            setConvenioLabel("Sin convenio");
            return;
          }
          const name = match.companyName.trim() || "Empresa con convenio";
          const discount =
            match.discountPercent == null
              ? null
              : Number.isInteger(match.discountPercent)
                ? `${match.discountPercent}%`
                : `${match.discountPercent.toLocaleString("es-CL", {
                    maximumFractionDigits: 2,
                  })}%`;
          setConvenioLabel(
            discount
              ? `En convenio · ${name} · ${discount}`
              : `En convenio · ${name}`,
          );
        } catch {
          if (!cancelled) setConvenioLabel("No se pudo verificar convenio");
        }
      })();
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [employerRut]);

  const fields = useMemo(() => {
    const titulares = 1 + profileForm.additionalTitulares.length;
    const cargas = profileForm.dependents.length;
    const plan = client.advisedPlan ?? client.requestedPlan;
    const assignedCount = client.assignedPlans?.length ?? 0;
    const titularName =
      [profileForm.firstNames, profileForm.lastNames]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(" ") || client.fullName;

    return {
      employer: [
        {
          label: "Calidad",
          value:
            contributorTypeLabel(profileForm.contributorType) ||
            "Sin calidad de cliente",
        },
        {
          label: "RUT empleador",
          value: employerRut || "Sin RUT empleador",
        },
        {
          label: "Renta",
          value: profileForm.rentaImponible.trim() || "Sin renta imponible",
        },
        { label: "Convenio", value: convenioLabel },
      ],
      family: [
        {
          label: "Titular",
          value: titularName || "Sin nombre",
        },
        {
          label: "Titulares",
          value: `${titulares} titular${titulares === 1 ? "" : "es"}`,
        },
        {
          label: "Cargas",
          value: `${cargas} carga${cargas === 1 ? "" : "s"}`,
        },
      ],
      plan: [
        {
          label: "Isapre",
          value: plan?.isapre?.trim() || "Sin isapre",
        },
        {
          label: "Plan",
          value: plan?.planName?.trim() || "Sin plan elegido",
        },
        {
          label: "Valor",
          value:
            plan?.basePriceUf != null
              ? `UF ${plan.basePriceUf}`
              : plan?.finalPriceUf != null
                ? `UF ${plan.finalPriceUf}`
                : "Sin precio UF",
        },
        {
          label: "Propuesta",
          value:
            assignedCount === 0
              ? "Sin planes asignados"
              : `${assignedCount} plan${assignedCount === 1 ? "" : "es"} en propuesta`,
        },
      ],
    };
  }, [client, convenioLabel, employerRut, profileForm]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <ClientFichaCapsule
        icon={<IconBuilding />}
        title="Empleador"
        description="Calidad de cliente, RUT empleador, convenio y renta."
        fields={fields.employer}
        ctaLabel={canEdit ? "Editar empleador" : "Ver empleador"}
        onClick={() => onOpenModal("employer")}
      />
      <ClientFichaCapsule
        icon={<IconFamily />}
        title="Grupo familiar"
        description="Titulares y cargas del grupo familiar."
        fields={fields.family}
        ctaLabel={canEdit ? "Editar grupo familiar" : "Ver grupo familiar"}
        onClick={() => onOpenModal("family")}
      />
      <ClientFichaCapsule
        icon={<IconPlan />}
        title="Plan elegido"
        description="Puedes asignar varios planes y marcar uno como elegido."
        fields={fields.plan}
        ctaLabel={canEdit ? "Gestionar planes" : "Ver planes"}
        onClick={() => onOpenModal("plan")}
      />
    </div>
  );
}

export interface ClientPremiumExecutiveCapsulesProps {
  client: UserRecord;
  profileForm: ClientProfileFormValue;
  canEdit: boolean;
  meetingNote?: string;
  onOpenModal: (modal: PremiumFichaModal) => void;
}

/**
 * Cápsulas del hub Ejecutivo Premium.
 */
export function ClientPremiumExecutiveCapsules({
  client,
  profileForm,
  canEdit,
  meetingNote = "",
  onOpenModal,
}: ClientPremiumExecutiveCapsulesProps) {
  const employerRut = profileForm.employerRut.trim();
  const [convenioLabel, setConvenioLabel] = useState("Sin RUT empleador");

  useEffect(() => {
    if (!employerRut) {
      setConvenioLabel("Sin RUT empleador");
      return;
    }
    if (!isValidRut(employerRut)) {
      setConvenioLabel("RUT empleador inválido");
      return;
    }

    let cancelled = false;
    setConvenioLabel("Verificando convenio…");
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ rut: employerRut });
          const response = await fetch(
            `/api/company-agreements/lookup?${params}`,
          );
          const payload = (await response.json().catch(() => null)) as
            | (CompanyAgreementLookupResult & { error?: string })
            | null;
          if (cancelled) return;
          if (!response.ok) {
            setConvenioLabel("No se pudo verificar convenio");
            return;
          }
          const match = payload?.matches[0] ?? null;
          if (!match) {
            setConvenioLabel("Sin convenio");
            return;
          }
          const name = match.companyName.trim() || "Empresa con convenio";
          const discount =
            match.discountPercent == null
              ? null
              : Number.isInteger(match.discountPercent)
                ? `${match.discountPercent}%`
                : `${match.discountPercent.toLocaleString("es-CL", {
                    maximumFractionDigits: 2,
                  })}%`;
          setConvenioLabel(
            discount
              ? `En convenio · ${name} · ${discount}`
              : `En convenio · ${name}`,
          );
        } catch {
          if (!cancelled) setConvenioLabel("No se pudo verificar convenio");
        }
      })();
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [employerRut]);

  const fields = useMemo(() => {
    const name =
      [profileForm.firstNames, profileForm.lastNames]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(" ") || client.fullName;
    const previsionLabel = resolveCurrentCoverageLabel(
      profileForm.currentIsapre,
      "Sin previsión registrada",
    );
    const planPrice = profileForm.currentPlanPrice.trim();
    const planPriceLabel = planPrice
      ? `${planPrice} ${profileForm.currentPlanPriceCurrency === "CLP" ? "CLP" : "UF"}`
      : "Sin precio del plan";
    const voluntario = profileForm.voluntaryAdditional.trim();
    const voluntarioLabel = voluntario
      ? `${voluntario} ${profileForm.voluntaryAdditionalCurrency === "CLP" ? "CLP" : "UF"}`
      : "Sin adicional voluntario";
    const checklist = resolveClientChecklist(client.checklist);
    const docsDone = checklist.items.filter((item) => item.checked).length;
    const docsTotal = checklist.items.length;
    const noteLines = listClientNoteLines(client.pipelineNotes);
    const lastNote = noteLines[0];
    const lastNotePreview = lastNote
      ? clientNoteDisplayText(lastNote)
      : meetingNote.trim() || null;
    const chosenPlan = client.advisedPlan ?? client.requestedPlan;
    const assignedCount = client.assignedPlans?.length ?? 0;

    return {
      personal: [
        { label: "Nombre", value: name || "Sin nombre" },
        {
          label: "RUT",
          value: profileForm.rut.trim() || client.rut || "Sin RUT",
        },
        {
          label: "Edad",
          value: profileForm.age.trim()
            ? `${profileForm.age.trim()} años`
            : "Sin edad",
        },
        {
          label: "Teléfono",
          value: profileForm.phone.trim() || "Sin teléfono",
        },
      ],
      employer: [
        {
          label: "Calidad",
          value:
            contributorTypeLabel(profileForm.contributorType) ||
            "Sin calidad de cliente",
        },
        {
          label: "RUT empleador",
          value: employerRut || "Sin RUT empleador",
        },
        {
          label: "Renta",
          value: profileForm.rentaImponible.trim() || "Sin renta imponible",
        },
        { label: "Convenio", value: convenioLabel },
      ],
      prevision: [
        { label: "Previsión", value: previsionLabel },
        { label: "Valor plan", value: planPriceLabel },
        { label: "Adicional", value: voluntarioLabel },
        {
          label: "Anualidad",
          value: profileForm.anualidad ? "Con anualidad" : "Sin anualidad",
        },
      ],
      plan: [
        {
          label: "Isapre",
          value: chosenPlan?.isapre?.trim() || "Sin isapre",
        },
        {
          label: "Plan",
          value: chosenPlan?.planName?.trim() || "Sin plan elegido",
        },
        {
          label: "Valor",
          value:
            chosenPlan?.basePriceUf != null
              ? `UF ${chosenPlan.basePriceUf}`
              : chosenPlan?.finalPriceUf != null
                ? `UF ${chosenPlan.finalPriceUf}`
                : "Sin precio UF",
        },
        {
          label: "Propuesta",
          value:
            assignedCount === 0
              ? "Sin planes asignados"
              : `${assignedCount} plan${assignedCount === 1 ? "" : "es"} en propuesta`,
        },
      ],
      complementaria: [
        {
          label: "Seguro",
          value:
            profileForm.segurosComplementarios.trim() ||
            "Sin seguro complementario",
        },
        {
          label: "Clínicas",
          value:
            profileForm.preferredClinics.trim() ||
            "Sin clínicas de preferencia",
        },
        {
          label: "Preexistencias",
          value:
            profileForm.preexistenciasMedicas.trim() || "Sin preexistencias",
        },
      ],
      anotaciones: [
        {
          label: "Total",
          value:
            noteLines.length === 0 && !meetingNote.trim()
              ? "Sin anotaciones aún"
              : `${Math.max(noteLines.length, meetingNote.trim() ? 1 : 0)} anotación${noteLines.length === 1 && !meetingNote.trim() ? "" : "es"}`,
        },
        {
          label: "Última",
          value: lastNotePreview
            ? lastNotePreview.length > 42
              ? `${lastNotePreview.slice(0, 42)}…`
              : lastNotePreview
            : "Agrega comentarios del ejecutivo",
        },
        {
          label: "Tipo",
          value: "Distintas del historial de sistema",
        },
      ],
      docs: [
        {
          label: "Checklist",
          value: `${docsDone}/${docsTotal} documentos`,
        },
        {
          label: "Incluye",
          value: "RUT, liquidación, plan u otros",
        },
        {
          label: "Vista",
          value: "Vista previa en la ficha",
        },
      ],
    };
  }, [client, convenioLabel, employerRut, meetingNote, profileForm]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <ClientFichaCapsule
        icon={<IconUser />}
        title="Información personal"
        description="Nombre, RUT, edad, teléfono y email del titular."
        fields={fields.personal}
        ctaLabel={
          canEdit ? "Editar información personal" : "Ver información personal"
        }
        onClick={() => onOpenModal("personal")}
      />
      <ClientFichaCapsule
        icon={<IconBuilding />}
        title="Empleador"
        description="Calidad de cliente, RUT empleador, convenio y renta."
        fields={fields.employer}
        ctaLabel={canEdit ? "Editar empleador" : "Ver empleador"}
        onClick={() => onOpenModal("employer")}
      />
      <ClientFichaCapsule
        icon={<IconPrevision />}
        title="Previsión actual"
        description="Isapre, Fonasa o sin previsión, costo y anualidad."
        fields={fields.prevision}
        ctaLabel={canEdit ? "Editar previsión" : "Ver previsión"}
        onClick={() => onOpenModal("prevision")}
      />
      <ClientFichaCapsule
        icon={<IconPlan />}
        title="Plan elegido"
        description="Puedes asignar varios planes y marcar uno como elegido."
        fields={fields.plan}
        ctaLabel={canEdit ? "Gestionar planes" : "Ver planes"}
        onClick={() => onOpenModal("plan")}
      />
      <ClientFichaCapsule
        icon={<IconComplementaria />}
        title="Información complementaria"
        description="Seguro, clínicas de preferencia y preexistencias."
        fields={fields.complementaria}
        ctaLabel={
          canEdit
            ? "Editar información complementaria"
            : "Ver información complementaria"
        }
        onClick={() => onOpenModal("complementaria")}
      />
      <ClientFichaCapsule
        icon={<IconNotes />}
        title="Anotaciones"
        description="Anotaciones libres del ejecutivo sobre el cliente."
        fields={fields.anotaciones}
        ctaLabel={canEdit ? "Editar anotaciones" : "Ver anotaciones"}
        onClick={() => onOpenModal("notas")}
      />
      <ClientFichaCapsule
        icon={<IconDocs />}
        title="Archivos adjuntos"
        description="Checklist y archivos adjuntos de la ficha."
        fields={fields.docs}
        ctaLabel={canEdit ? "Gestionar archivos" : "Ver archivos"}
        onClick={() => onOpenModal("docs")}
      />
    </div>
  );
}
