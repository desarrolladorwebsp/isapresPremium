import { z } from "zod";
import type { CotizacionNotifyInput } from "@/lib/email/cotizacion-notify-schema";
import { AGENT_QUERY_PARAM } from "@/lib/partner-entity/constants";
import { resolveAppBaseUrl } from "@/lib/platform/routing";

const miCotizacionPlanSchema = z.object({
  codigo: z.string().trim().min(1),
  nombre: z.string().trim().min(1),
  isapre: z.string().trim().min(1),
  tipoPlan: z.string().trim().min(1).optional(),
  precioUf: z.string().trim().min(1),
  precioClp: z.string().trim().min(1),
  precioListaUf: z.string().trim().min(1).optional(),
  precioListaClp: z.string().trim().min(1).optional(),
  precioConConvenioUf: z.string().trim().min(1).optional(),
  precioConConvenioClp: z.string().trim().min(1).optional(),
  descuentoConvenioPercent: z.number().finite().optional(),
  coberturaHospitalaria: z.number().finite().optional(),
  coberturaAmbulatoria: z.number().finite().optional(),
  clinicas: z.number().int().min(0).optional(),
});

const miCotizacionSolicitanteSchema = z.object({
  nombre: z.string().trim().min(1),
  rut: z.string().trim().min(1).optional(),
  telefono: z.string().trim().min(1).optional(),
});

const miCotizacionConvenioSchema = z.object({
  rutEmpresa: z.string().trim().min(1),
  nombreEmpresa: z.string().trim().min(1),
  descuentoPercent: z.number().finite().optional(),
  isapreName: z.string().trim().min(1).optional(),
});

export const miCotizacionSnapshotSchema = z.object({
  email: z.string().trim().email(),
  region: z.string().trim().min(1),
  edad: z.number().int().min(0).max(120),
  sexo: z.string().trim().min(1).optional(),
  ingreso: z.string().trim().optional(),
  cargas: z.array(z.number().int().min(0).max(120)).optional(),
  orden: z.string().trim().optional(),
  moneda: z.enum(["clp", "uf"]).optional(),
  solicitante: miCotizacionSolicitanteSchema.optional(),
  plan: miCotizacionPlanSchema.optional(),
  convenioEmpresa: miCotizacionConvenioSchema.optional(),
  partnerEntityName: z.string().trim().min(1).optional(),
});

export type MiCotizacionSnapshot = z.infer<typeof miCotizacionSnapshotSchema>;

export const MI_COTIZACION_DATA_PARAM = "d";
export const MI_COTIZACION_PATH = "/cotizador/mi-cotizacion";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, "base64"));
}

export function encodeMiCotizacionSnapshot(
  snapshot: MiCotizacionSnapshot,
): string {
  const json = JSON.stringify(snapshot);
  return toBase64Url(new TextEncoder().encode(json));
}

export function decodeMiCotizacionSnapshot(
  encoded: string | null | undefined,
): MiCotizacionSnapshot | null {
  if (!encoded?.trim()) return null;
  try {
    const json = new TextDecoder().decode(fromBase64Url(encoded.trim()));
    const parsed = JSON.parse(json) as unknown;
    const result = miCotizacionSnapshotSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function snapshotFromCotizacionNotify(
  data: CotizacionNotifyInput,
): MiCotizacionSnapshot {
  return miCotizacionSnapshotSchema.parse({
    email: data.email,
    region: data.region,
    edad: data.edad,
    sexo: data.sexo,
    ingreso: data.ingreso,
    cargas: data.cargas,
    orden: data.orden,
    moneda: data.moneda,
    solicitante: data.solicitante
      ? {
          nombre: data.solicitante.nombre,
          rut: data.solicitante.rut,
          telefono: data.solicitante.telefono,
        }
      : undefined,
    plan: data.plan
      ? {
          codigo: data.plan.codigo,
          nombre: data.plan.nombre,
          isapre: data.plan.isapre,
          tipoPlan: data.plan.tipoPlan,
          precioUf: data.plan.precioUf,
          precioClp: data.plan.precioClp,
          precioListaUf: data.plan.precioListaUf,
          precioListaClp: data.plan.precioListaClp,
          precioConConvenioUf: data.plan.precioConConvenioUf,
          precioConConvenioClp: data.plan.precioConConvenioClp,
          descuentoConvenioPercent: data.plan.descuentoConvenioPercent,
          coberturaHospitalaria: data.plan.coberturaHospitalaria,
          coberturaAmbulatoria: data.plan.coberturaAmbulatoria,
          clinicas: data.plan.clinicas,
        }
      : undefined,
    convenioEmpresa: data.convenioEmpresa
      ? {
          rutEmpresa: data.convenioEmpresa.rutEmpresa,
          nombreEmpresa: data.convenioEmpresa.nombreEmpresa,
          descuentoPercent: data.convenioEmpresa.descuentoPercent,
          isapreName: data.convenioEmpresa.isapreName,
        }
      : undefined,
    partnerEntityName: data.partnerEntityName,
  });
}

/** URL pública del resumen de cotización (CTA del correo). */
export function buildMiCotizacionShareUrl(
  data: CotizacionNotifyInput,
): string {
  const snapshot = snapshotFromCotizacionNotify(data);
  const encoded = encodeMiCotizacionSnapshot(snapshot);
  const agent = data.partnerEntitySlug?.trim().toLowerCase();
  const params = new URLSearchParams();
  if (agent) params.set(AGENT_QUERY_PARAM, agent);
  params.set(MI_COTIZACION_DATA_PARAM, encoded);
  return `${resolveAppBaseUrl()}${MI_COTIZACION_PATH}?${params.toString()}`;
}
