import { z } from "zod";

function optionalThemeColor() {
  return z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional();
}

function sanitizePartnerEntityTheme(
  theme: unknown,
): z.infer<typeof partnerEntityThemeSchema> {
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) {
    return undefined;
  }

  const parsed = partnerEntityThemeSchema.safeParse(theme);
  return parsed.success ? parsed.data : undefined;
}

const partnerEntityThemeSchema = z
  .object({
    primary: optionalThemeColor(),
    primaryHover: optionalThemeColor(),
    primaryDark: optionalThemeColor(),
    primaryForeground: optionalThemeColor(),
    secondary: optionalThemeColor(),
    secondaryMuted: optionalThemeColor(),
    bgLayout: optionalThemeColor(),
    foreground: optionalThemeColor(),
    muted: optionalThemeColor(),
    border: optionalThemeColor(),
    surfaceHover: optionalThemeColor(),
    criteriaSurface: optionalThemeColor(),
    criteriaRing: optionalThemeColor(),
    accentWarning: optionalThemeColor(),
    accentWarningForeground: optionalThemeColor(),
  })
  .partial()
  .optional();

export const cotizacionNotifyPlanSchema = z.object({
  codigo: z.string().trim().min(1),
  id: z.string().trim().min(1),
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
  precioBaseUf: z.string().trim().min(1).optional(),
  gesPremiumUf: z.string().trim().min(1).optional(),
  tieneTop: z.boolean().optional(),
  coberturaHospitalaria: z.number().finite(),
  coberturaAmbulatoria: z.number().finite(),
  clinicas: z.number().int().min(0).optional(),
  notas: z.string().trim().optional(),
  pdfUrl: z.string().trim().min(1).optional(),
  totalBeneficiarios: z.number().int().min(1).optional(),
  factoresRiesgo: z.number().finite().optional(),
});

export const cotizacionNotifySolicitanteSchema = z.object({
  nombre: z.string().trim().min(1),
  rut: z.string().trim().min(1).optional(),
  telefono: z.string().trim().min(1).optional(),
  isapreActual: z.string().trim().min(1).optional(),
  notas: z.string().trim().optional(),
});

export const cotizacionNotifyConvenioSchema = z.object({
  rutEmpresa: z.string().trim().min(1),
  nombreEmpresa: z.string().trim().min(1),
  descuentoPercent: z.number().finite().optional(),
  isapreId: z.string().trim().min(1).optional(),
  isapreName: z.string().trim().min(1).optional(),
  /** Precio referencial del plan con descuento, si el plan solicitado aplica. */
  precioConDescuentoUf: z.string().trim().min(1).optional(),
  precioConDescuentoClp: z.string().trim().min(1).optional(),
  precioListaUf: z.string().trim().min(1).optional(),
  precioListaClp: z.string().trim().min(1).optional(),
  descuentoAplicadoAlPlan: z.boolean().optional(),
});

export const cotizacionNotifyInputSchema = z.object({
  email: z.string().trim().email(),
  region: z.string().trim().min(1),
  edad: z.number().int().min(0).max(120),
  sexo: z.string().trim().min(1).optional(),
  ingreso: z.string().trim().optional(),
  cargas: z.array(z.number().int().min(0).max(120)).optional(),
  busqueda: z.string().trim().optional(),
  orden: z.string().trim().optional(),
  moneda: z.enum(["clp", "uf"]).optional(),
  isapres: z.array(z.string().trim().min(1)).optional(),
  plan: cotizacionNotifyPlanSchema.optional(),
  solicitante: cotizacionNotifySolicitanteSchema.optional(),
  convenioEmpresa: cotizacionNotifyConvenioSchema.optional(),
  cotizadorUrl: z.string().trim().url(),
  partnerEntitySlug: z.string().trim().min(1).optional(),
  partnerEntityName: z.string().trim().min(1).optional(),
  partnerEntityTheme: partnerEntityThemeSchema,
  partnerEntityLogoUrl: z.string().trim().min(1).optional(),
});

export type CotizacionNotifyInput = z.infer<typeof cotizacionNotifyInputSchema>;
export type CotizacionNotifyPlan = z.infer<typeof cotizacionNotifyPlanSchema>;
export type CotizacionNotifySolicitante = z.infer<
  typeof cotizacionNotifySolicitanteSchema
>;
export type CotizacionNotifyConvenio = z.infer<
  typeof cotizacionNotifyConvenioSchema
>;

export function parseCotizacionNotifyInput(
  payload: unknown,
): CotizacionNotifyInput {
  const normalized =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? {
          ...payload,
          partnerEntityTheme: sanitizePartnerEntityTheme(
            (payload as { partnerEntityTheme?: unknown }).partnerEntityTheme,
          ),
        }
      : payload;

  const result = cotizacionNotifyInputSchema.safeParse(normalized);

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ");
    throw new Error(message);
  }

  return result.data;
}
