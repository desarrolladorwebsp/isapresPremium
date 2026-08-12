import {
  CLIENT_MOTIVO_COTIZACION_OPTIONS,
  motivoCotizacionIncludes,
  motivoCotizacionIncludesOtros,
  parseMotivoCotizacionIds,
} from "@/lib/client-profile/constants";
import { formatPersonDisplayName } from "@/lib/format-person-name";
import type { UserRecord } from "@/types/user";

export interface ProtocoloZoomQuoteRow {
  isapre: string;
  planName: string;
  valorUf: string;
}

export interface ProtocoloZoomData {
  fechaMes: string;
  ejecutiva: string;
  nombre: string;
  celular: string;
  correo: string;
  edad: string;
  rut: string;
  rutEmpleador: string;
  cargasEdades: string;
  clinicaPref: string;
  preexistencia: string;
  rentaImponible: string;
  isapreActual: string;
  costoUf: string;
  anualidadSi: boolean;
  anualidadNo: boolean;
  seguroComplSi: boolean;
  seguroComplNo: boolean;
  motivoBajarCostos: boolean;
  motivoMalaExperiencia: boolean;
  motivoCoberturas: boolean;
  otrosMotivos: string;
  zoomIp1: string;
  zoomIp2: string;
  zoomIpAuxiliar: string;
  zoomIsapre: string;
  diaReunion: string;
  horaReunion: string;
  cotizaciones: ProtocoloZoomQuoteRow[];
  notas: string[];
  seguimiento1Dia: string;
  seguimiento1Hora: string;
  seguimiento2Dia: string;
  seguimiento2Hora: string;
}

function formatShortDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
  }).format(date);
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    timeStyle: "short",
  }).format(date);
}

function formatMoneyLine(
  amount: string | null | undefined,
  currency: string | null | undefined,
): string {
  const trimmed = amount?.trim() ?? "";
  if (!trimmed) return "";
  if (currency === "UF") return `${trimmed} UF`;
  if (currency === "CLP") return `$ ${trimmed}`;
  return trimmed;
}

function resolveMotivoLabel(id: string): string {
  return (
    CLIENT_MOTIVO_COTIZACION_OPTIONS.find((option) => option.id === id)?.label ??
    id
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function line(label: string, value: string): string {
  const safe = escapeHtml(value || "________________");
  return `<div class="row"><span class="bullet">•</span><span class="label">${escapeHtml(label)}</span><span class="dots">:</span><span class="value">${safe}</span></div>`;
}

function check(label: string, on: boolean): string {
  return `<span class="check">${on ? "☑" : "☐"} ${escapeHtml(label)}</span>`;
}

export function buildProtocoloZoomData(client: UserRecord): ProtocoloZoomData {
  const profile = client.clientProfile;
  const nameFromProfile = [profile?.firstNames, profile?.lastNames]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  const dependents = profile?.dependents ?? [];
  const cargasEdades =
    dependents.length === 0
      ? ""
      : dependents
          .map((dependent, index) => {
            const age = dependent.age?.trim() || "—";
            const rut = dependent.rut?.trim();
            return rut
              ? `Carga ${index + 1}: ${age} años (${rut})`
              : `Carga ${index + 1}: ${age} años`;
          })
          .join(" · ");

  const preexistencias = [
    profile?.preexistenciasMedicas?.trim(),
    ...dependents.map((dependent) => dependent.preexistenciasMedicas?.trim()),
    ...(profile?.additionalTitulares ?? []).map((titular) =>
      titular.preexistenciasMedicas?.trim(),
    ),
  ]
    .filter(Boolean)
    .join(" · ");

  const motivoIds = parseMotivoCotizacionIds(profile?.motivoCotizacion);
  const costoUf =
    profile?.currentPlanPriceCurrency === "UF"
      ? profile.currentPlanPrice?.trim() ?? ""
      : formatMoneyLine(
          profile?.currentPlanPrice,
          profile?.currentPlanPriceCurrency,
        );

  const quotes: ProtocoloZoomQuoteRow[] = [];
  const seenPlanCodes = new Set<string>();

  function pushQuotePlan(plan: {
    planCode?: string | null;
    isapre?: string | null;
    planName?: string | null;
    finalPriceUf?: number | null;
    basePriceUf?: number | null;
  } | null | undefined) {
    if (!plan || quotes.length >= 4) return;
    const code = plan.planCode?.trim() || "";
    if (code && seenPlanCodes.has(code)) return;
    if (code) seenPlanCodes.add(code);
    quotes.push({
      isapre: plan.isapre?.trim() || "",
      planName: plan.planName?.trim() || "",
      valorUf:
        plan.finalPriceUf != null
          ? String(plan.finalPriceUf)
          : plan.basePriceUf != null
            ? String(plan.basePriceUf)
            : "",
    });
  }

  // Elegido primero, luego el resto de la propuesta, luego solicitado.
  pushQuotePlan(client.advisedPlan);
  for (const plan of client.assignedPlans ?? []) {
    if (plan.planCode === client.advisedPlan?.planCode) continue;
    pushQuotePlan(plan);
  }
  pushQuotePlan(client.requestedPlan);

  while (quotes.length < 4) {
    quotes.push({ isapre: "", planName: "", valorUf: "" });
  }

  const noteLines =
    client.pipelineNotes
      ?.split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-3) ?? [];

  const seguros = profile?.segurosComplementarios?.trim() ?? "";
  const hasSeguro = Boolean(seguros) && !/^no$/i.test(seguros);

  return {
    fechaMes: formatShortDate(client.createdAt),
    ejecutiva: formatPersonDisplayName(
      client.assignedExecutiveName,
      "",
    ),
    nombre: nameFromProfile || client.fullName,
    celular: client.phone?.trim() || "",
    correo: client.email?.trim() || "",
    edad: profile?.age?.trim() || "",
    rut: client.rut?.trim() || "",
    rutEmpleador: profile?.employerRut?.trim() || "",
    cargasEdades,
    clinicaPref: profile?.preferredClinics?.trim() || "",
    preexistencia: preexistencias,
    rentaImponible: profile?.rentaImponible?.trim() || "",
    isapreActual: profile?.currentIsapre?.trim() || "",
    costoUf,
    anualidadSi: profile?.anualidad === true,
    anualidadNo: profile?.anualidad === false,
    seguroComplSi: hasSeguro,
    seguroComplNo: !hasSeguro && seguros.toLowerCase() === "no",
    motivoBajarCostos: motivoCotizacionIncludes(
      profile?.motivoCotizacion,
      "bajar-costo",
    ),
    motivoMalaExperiencia: motivoCotizacionIncludes(
      profile?.motivoCotizacion,
      "mala-experiencia",
    ),
    motivoCoberturas: motivoCotizacionIncludes(
      profile?.motivoCotizacion,
      "cobertura",
    ),
    otrosMotivos: [
      ...motivoIds
        .filter(
          (id) =>
            id !== "bajar-costo" &&
            id !== "mala-experiencia" &&
            id !== "cobertura" &&
            id !== "otros",
        )
        .map(resolveMotivoLabel),
      motivoCotizacionIncludesOtros(profile?.motivoCotizacion)
        ? profile?.motivoCotizacionOther?.trim() || ""
        : "",
    ]
      .filter(Boolean)
      .join(" · "),
    zoomIp1: "",
    zoomIp2: "",
    zoomIpAuxiliar: "",
    zoomIsapre: client.advisedPlan?.isapre?.trim() || profile?.currentIsapre?.trim() || "",
    diaReunion: formatShortDate(client.nextCallAt),
    horaReunion: formatTime(client.nextCallAt),
    cotizaciones: quotes.slice(0, 4),
    notas: noteLines.length > 0 ? noteLines : ["", "", ""],
    seguimiento1Dia: formatShortDate(client.confirmationCallAt),
    seguimiento1Hora: formatTime(client.confirmationCallAt),
    seguimiento2Dia: "",
    seguimiento2Hora: "",
  };
}

const PRINT_CSS = `
  @page { size: letter; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: #111;
    font-size: 12px;
    line-height: 1.35;
  }
  .sheet { max-width: 760px; margin: 0 auto; }
  h1 {
    text-align: center;
    font-size: 20px;
    letter-spacing: 0.04em;
    margin: 0 0 14px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .header .field { flex: 1; }
  .header .line {
    display: inline-block;
    min-width: 55%;
    border-bottom: 1px solid #222;
    margin-left: 6px;
    font-weight: 500;
    text-transform: none;
  }
  .section-title {
    font-weight: 700;
    text-transform: uppercase;
    margin: 10px 0 6px;
  }
  .row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin: 3px 0;
  }
  .bullet { width: 12px; flex-shrink: 0; }
  .label { font-weight: 700; text-transform: uppercase; white-space: nowrap; }
  .dots { font-weight: 700; }
  .value {
    flex: 1;
    min-width: 0;
    border-bottom: 1px solid #bbb;
    padding: 0 4px 1px;
    text-transform: none;
    font-weight: 500;
  }
  .inline-opts {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 16px;
    margin: 4px 0 4px 18px;
  }
  .check { white-space: nowrap; }
  .meta {
    margin-top: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .meta .line {
    display: inline-block;
    min-width: 72px;
    border-bottom: 1px solid #222;
    margin: 0 4px;
    font-weight: 500;
    text-transform: none;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    font-size: 11px;
  }
  th, td {
    border: 1px solid #222;
    padding: 6px 8px;
    text-align: left;
  }
  th { font-weight: 700; text-transform: uppercase; background: #f3f3f3; }
  .notes { margin-top: 12px; }
  .notes .note-line {
    border-bottom: 1px solid #222;
    min-height: 18px;
    margin: 8px 0;
    padding-bottom: 2px;
  }
  .follow {
    margin-top: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }
`;

export function buildProtocoloZoomHtml(data: ProtocoloZoomData): string {
  const quoteRows = data.cotizaciones
    .map(
      (row, index) => `
      <tr>
        <td>COTIZACIÓN ${index + 1}</td>
        <td>${escapeHtml(row.isapre)}</td>
        <td>${escapeHtml(row.planName)}</td>
        <td>${escapeHtml(row.valorUf)}</td>
      </tr>`,
    )
    .join("");

  const paddedNotes = [...data.notas, "", "", ""].slice(0, 3);
  const noteBlocks = paddedNotes
    .map((note) => `<div class="note-line">${escapeHtml(note)}</div>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Protocolo Zoom Isapre — ${escapeHtml(data.nombre)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="sheet">
    <h1>PROTOCOLO ZOOM ISAPRE</h1>
    <div class="header">
      <div class="field">FECHA/MES:<span class="line">${escapeHtml(data.fechaMes)}</span></div>
      <div class="field">EJECUTIVA:<span class="line">${escapeHtml(data.ejecutiva)}</span></div>
    </div>

    <div class="section-title">DATOS CLIENTE</div>
    ${line("NOMBRE", data.nombre)}
    ${line("CELULAR", data.celular)}
    ${line("CORREO", data.correo)}
    ${line("EDAD", data.edad)}
    ${line("RUT", data.rut)}
    ${line("RUT EMPLEADOR", data.rutEmpleador)}
    ${line("CARGAS / EDADES", data.cargasEdades)}
    ${line("CLÍNICA PREF", data.clinicaPref)}
    ${line("PREEXISTENCIA", data.preexistencia)}
    ${line("RENTA IMPONIBLE", data.rentaImponible)}
    ${line("ISAPRE ACTUAL / FONASA", data.isapreActual)}
    ${line("COSTO UF", data.costoUf)}
    <div class="row">
      <span class="bullet">•</span>
      <span class="label">ANUALIDAD</span>
      <span class="dots">:</span>
      <div class="inline-opts">
        ${check("SI", data.anualidadSi)}
        ${check("NO", data.anualidadNo)}
      </div>
    </div>
    <div class="row">
      <span class="bullet">•</span>
      <span class="label">SEGURO COMPL</span>
      <span class="dots">:</span>
      <div class="inline-opts">
        ${check("SI", data.seguroComplSi)}
        ${check("NO", data.seguroComplNo)}
      </div>
    </div>
    <div class="row">
      <span class="bullet">•</span>
      <span class="label">MOTIVO A COTIZAR?</span>
    </div>
    <div class="inline-opts">
      ${check("BAJAR COSTOS", data.motivoBajarCostos)}
      ${check("MALA EXPERIENCIA", data.motivoMalaExperiencia)}
      ${check("COBERTURAS", data.motivoCoberturas)}
    </div>
    ${line("OTROS MOTIVOS", data.otrosMotivos)}

    <div class="meta">
      ZOOM: IP1<span class="line">${escapeHtml(data.zoomIp1)}</span>
      IP2<span class="line">${escapeHtml(data.zoomIp2)}</span>
      IP AUXILIAR<span class="line">${escapeHtml(data.zoomIpAuxiliar)}</span>
      ISAPRE<span class="line">${escapeHtml(data.zoomIsapre)}</span>
    </div>
    <div class="meta">
      DÍA REUNIÓN<span class="line">${escapeHtml(data.diaReunion)}</span>
      HORA REUNIÓN<span class="line">${escapeHtml(data.horaReunion)}</span>
    </div>

    <div class="section-title" style="margin-top:14px">COTIZACIONES</div>
    <table>
      <thead>
        <tr>
          <th></th>
          <th>ISAPRE</th>
          <th>NOMBRE PLAN</th>
          <th>VALOR UF</th>
        </tr>
      </thead>
      <tbody>${quoteRows}</tbody>
    </table>

    <div class="notes">
      <div class="section-title">NOTAS</div>
      ${noteBlocks}
    </div>

    <div class="follow">
      SEGUIMIENTO 1 —
      DÍA REUNIÓN<span class="line">${escapeHtml(data.seguimiento1Dia)}</span>
      HORA REUNIÓN<span class="line">${escapeHtml(data.seguimiento1Hora)}</span>
    </div>
    <div class="follow">
      SEGUIMIENTO 2 —
      DÍA REUNIÓN<span class="line">${escapeHtml(data.seguimiento2Dia)}</span>
      HORA REUNIÓN<span class="line">${escapeHtml(data.seguimiento2Hora)}</span>
    </div>
  </div>
</body>
</html>`;
}

export function openProtocoloZoomPrint(data: ProtocoloZoomData): void {
  const html = buildProtocoloZoomHtml(data);
  // No usar `noopener`: en Chromium `window.open` devolvería null y no
  // podríamos llamar a `.print()` sobre la ventana.
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error(
      "El navegador bloqueó la ventana de impresión. Permite pop-ups e inténtalo de nuevo.",
    );
  }
  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
  }, 250);
}

/** Imprime el documento ya cargado en un iframe (sin pop-up). */
export function printProtocoloZoomIframe(
  iframe: HTMLIFrameElement | null,
): void {
  const frameWindow = iframe?.contentWindow;
  if (!frameWindow) {
    throw new Error("La vista previa del PDF aún no está lista.");
  }
  frameWindow.focus();
  frameWindow.print();
}
