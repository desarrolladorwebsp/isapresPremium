import { z } from "zod";
import type { CotizadorFormData } from "@/constants/cotizador";

/** Strip RUT formatting characters. */
export function cleanRut(rut: string) {
  return rut.replace(/\./g, "").replace(/-/g, "").replace(/\s/g, "").toUpperCase();
}

/** Format Chilean RUT as 12.345.678-9 while typing. */
export function formatRutInput(value: string) {
  const clean = cleanRut(value).replace(/[^0-9K]/g, "").slice(0, 9);
  if (clean.length <= 1) return clean;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}

export function isValidRut(rut: string) {
  const clean = cleanRut(rut);
  if (clean.length < 2) return false;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body) || body.length < 7) return false;

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expected = 11 - (sum % 11);
  const expectedDv =
    expected === 11 ? "0" : expected === 10 ? "K" : String(expected);

  return dv === expectedDv;
}

/** Digits only; normalizes +56 / 56 prefix. */
export function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidChileanPhone(value: string) {
  const digits = phoneDigits(value);
  if (!digits) return false;

  if (digits.startsWith("56")) {
    const local = digits.slice(2);
    return local.length >= 8 && local.length <= 9;
  }

  return digits.length >= 8 && digits.length <= 9;
}

const optionalRut = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => !value || isValidRut(value), {
    message: "Ingresa un RUT válido",
  });

const optionalEdad = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine(
    (value) => {
      if (!value) return true;
      if (!/^\d{1,3}$/.test(value)) return false;
      const age = Number(value);
      return age >= 18 && age <= 99;
    },
    { message: "Ingresa una edad válida (18–99)" },
  );

export const leadPayloadSchema = z.object({
  nombreApellido: z
    .string()
    .trim()
    .min(2, "Ingresa tu nombre y apellido")
    .max(120, "El nombre es demasiado largo"),
  rut: optionalRut,
  edad: optionalEdad,
  email: z
    .string()
    .trim()
    .min(1, "Este campo es obligatorio")
    .email("Ingresa un email válido")
    .max(160, "El email es demasiado largo"),
  telefono: z
    .string()
    .trim()
    .min(1, "Este campo es obligatorio")
    .refine(isValidChileanPhone, {
      message: "Ingresa un teléfono válido (ej: +56 9 1234 5678)",
    }),
  previsionActual: z.string().trim().min(1, "Selecciona tu previsión actual"),
  ufActuales: z.string().trim().optional().default(""),
  region: z.string().trim().min(1, "Selecciona tu región"),
  cargasMedicas: z.string().trim().min(1, "Indica tus cargas médicas"),
  edadCargas: z.string().trim().optional().default(""),
  rentaImponible: z
    .string()
    .trim()
    .min(1, "Este campo es obligatorio")
    .max(80, "El valor es demasiado largo"),
  motivoCotizacion: z.string().trim().optional().default(""),
  preferenciaContacto: z
    .string()
    .trim()
    .min(1, "Selecciona una preferencia de contacto"),
  autorizaDatos: z.literal(true, {
    error: "Debes autorizar el tratamiento de datos",
  }),
});

export type LeadPayload = z.infer<typeof leadPayloadSchema>;

export type LeadFieldErrors = Partial<
  Record<keyof CotizadorFormData, string>
>;

/** Map Zod issues to form field errors (Spanish messages from schema). */
export function zodIssuesToFieldErrors(
  error: z.ZodError,
): LeadFieldErrors {
  const fieldErrors: LeadFieldErrors = {};
  const flat = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >;

  for (const [key, messages] of Object.entries(flat)) {
    if (messages?.[0]) {
      fieldErrors[key as keyof CotizadorFormData] = messages[0];
    }
  }

  return fieldErrors;
}

const step1Schema = leadPayloadSchema.pick({
  nombreApellido: true,
  rut: true,
  edad: true,
  email: true,
  telefono: true,
});

const step2Schema = leadPayloadSchema.pick({
  previsionActual: true,
  ufActuales: true,
  region: true,
  cargasMedicas: true,
  edadCargas: true,
  rentaImponible: true,
});

const step3Schema = leadPayloadSchema.pick({
  motivoCotizacion: true,
  preferenciaContacto: true,
  autorizaDatos: true,
});

export function validateLeadStep(
  step: 1 | 2 | 3,
  data: CotizadorFormData,
): { ok: true } | { ok: false; errors: LeadFieldErrors } {
  const schema =
    step === 1 ? step1Schema : step === 2 ? step2Schema : step3Schema;
  const parsed = schema.safeParse(data);

  if (parsed.success) return { ok: true };

  return { ok: false, errors: zodIssuesToFieldErrors(parsed.error) };
}
