import { z } from "zod";
import {
  buildSolicitarUrl,
  type BuildCotizadorUrlInput,
} from "@/lib/deep-link/build-cotizador-url";
import { VALID_REGIONS, VALID_SEX_VALUES } from "@/lib/deep-link/params";

const modalViewSchema = z.enum([
  "overview",
  "general",
  "vista-general",
  "price",
  "precio",
  "request",
  "solicitar",
]);

export const buildSolicitarUrlRequestSchema = z.object({
  plan: z.string().trim().min(1, "El campo plan (unique_code) es obligatorio."),
  entidad: z.string().trim().min(1).optional(),
  vista: modalViewSchema.optional(),
  region: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => VALID_REGIONS.has(value), {
      message: "region inválida.",
    })
    .optional(),
  edad: z.number().int().min(0).max(120).optional(),
  sexo: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => VALID_SEX_VALUES.has(value), {
      message: "sexo debe ser m o f.",
    })
    .optional(),
  ingreso: z.string().trim().min(1).optional(),
  cargas: z.array(z.number().int().min(0).max(120)).optional(),
  q: z.string().trim().min(1).optional(),
  precioMin: z.number().min(0).optional(),
  precioMax: z.number().min(0).optional(),
  isapres: z.array(z.string().trim().min(1)).optional(),
  zonas: z.array(z.string().trim().min(1)).optional(),
  tipoPlan: z.array(z.string().trim().min(1)).optional(),
  clinicaH: z.array(z.string().trim().min(1)).optional(),
  clinicaA: z.array(z.string().trim().min(1)).optional(),
  clinica: z.array(z.string().trim().min(1)).optional(),
  coberturaH: z.number().int().optional(),
  coberturaA: z.number().int().optional(),
  orden: z.enum(["price_asc", "price_desc", "coverage"]).optional(),
  moneda: z.enum(["clp", "uf"]).optional(),
  auto: z.boolean().optional(),
  nombre: z.string().trim().min(1).optional(),
  rut: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  telefono: z.string().trim().min(1).optional(),
  baseUrl: z.string().url().optional(),
});

export type BuildSolicitarUrlRequest = z.infer<
  typeof buildSolicitarUrlRequestSchema
>;

function mapVistaToBuildInput(
  vista: BuildSolicitarUrlRequest["vista"],
): BuildCotizadorUrlInput["vista"] {
  if (!vista) return "solicitar";
  if (vista === "precio" || vista === "price") return "precio";
  if (vista === "solicitar" || vista === "request") return "solicitar";
  return "overview";
}

export function buildSolicitarUrlFromRequest(
  input: BuildSolicitarUrlRequest,
  defaultBaseUrl: string,
) {
  const url = buildSolicitarUrl({
    baseUrl: input.baseUrl ?? defaultBaseUrl,
    entidad: input.entidad,
    plan: input.plan,
    vista: mapVistaToBuildInput(input.vista),
    region: input.region,
    edad: input.edad,
    sexo: input.sexo,
    ingreso: input.ingreso,
    cargas: input.cargas,
    q: input.q,
    precioMin: input.precioMin,
    precioMax: input.precioMax,
    isapres: input.isapres,
    zonas: input.zonas,
    tipoPlan: input.tipoPlan,
    clinicaH: input.clinicaH,
    clinicaA: input.clinicaA,
    clinica: input.clinica,
    coberturaH: input.coberturaH,
    coberturaA: input.coberturaA,
    orden: input.orden,
    moneda: input.moneda,
    auto: input.auto,
    nombre: input.nombre,
    rut: input.rut,
    email: input.email,
    telefono: input.telefono,
  });

  return {
    url,
    plan: input.plan,
    vista: mapVistaToBuildInput(input.vista),
    entidad: input.entidad ?? null,
    has_quote_criteria: Boolean(
      input.region || input.edad !== undefined || input.sexo || input.ingreso,
    ),
    has_contact_prefill: Boolean(
      input.nombre || input.rut || input.email || input.telefono,
    ),
    instructions:
      "Redirige al usuario a url con window.location.href, un enlace <a>, o HTTP 302. El cotizador abrirá el modal de solicitud del plan indicado.",
  };
}
