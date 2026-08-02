import { z } from "zod";
import {
  buildCotizadorUrl,
  type BuildCotizadorUrlInput,
} from "@/lib/deep-link/build-cotizador-url";
import { VALID_REGIONS, VALID_SEX_VALUES } from "@/lib/deep-link/params";

export const buildCotizadorUrlRequestSchema = z.object({
  entidad: z.string().trim().min(1).optional(),
  agent: z.string().trim().min(1).optional(),
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
  /** Legacy: aplica la misma lista a hospitalario y ambulatorio si no envías clinicaH/clinicaA */
  clinica: z.array(z.string().trim().min(1)).optional(),
  coberturaH: z.number().int().optional(),
  coberturaA: z.number().int().optional(),
  orden: z.enum(["price_asc", "price_desc", "coverage"]).optional(),
  moneda: z.enum(["clp", "uf"]).optional(),
  auto: z.boolean().optional(),
  email: z.string().trim().email().optional(),
  baseUrl: z.string().url().optional(),
});

export type BuildCotizadorUrlRequest = z.infer<
  typeof buildCotizadorUrlRequestSchema
>;

export function buildCotizadorUrlFromRequest(
  input: BuildCotizadorUrlRequest,
  defaultBaseUrl: string,
) {
  const url = buildCotizadorUrl({
    baseUrl: input.baseUrl ?? defaultBaseUrl,
    agent: input.agent ?? input.entidad,
    entidad: input.entidad,
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
    auto: input.auto ?? true,
    email: input.email,
  } satisfies BuildCotizadorUrlInput, { forcePremiumPath: true });

  return {
    url,
    agent: input.agent ?? input.entidad ?? null,
    has_quote_criteria: Boolean(
      input.region || input.edad !== undefined || input.sexo || input.ingreso,
    ),
    instructions:
      "Redirige al usuario a url con window.location.href, un enlace <a>, o HTTP 302. El cotizador abrirá con los parámetros prellenados y auto=1 ejecutará la búsqueda.",
  };
}
