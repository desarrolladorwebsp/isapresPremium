import { z } from "zod";
import { isValidPhone, isValidRut } from "@/lib/leads/validation";

const optionalTrimmed = (maxLen: number) =>
  z
    .string()
    .trim()
    .max(maxLen)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const executiveKindSchema = z.enum([
  "ISAPRES_PREMIUM",
  "ISAPRES",
  "ZOOM",
]);

const metadataValueSchema = z.union([
  z.string().max(200),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const publicRegisterClientSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Ingresa nombre y apellido")
      .max(160, "El nombre es demasiado largo"),
    email: z
      .string()
      .trim()
      .email("Ingresa un email válido")
      .max(160, "El email es demasiado largo"),
    phone: z
      .string()
      .trim()
      .min(1, "El teléfono es obligatorio")
      .max(40, "El teléfono es demasiado largo")
      .refine(isValidPhone, {
        message: "Ingresa un teléfono válido (ej: +56 9 1234 5678)",
      }),
    rut: z
      .string()
      .trim()
      .max(20)
      .optional()
      .refine((value) => !value || isValidRut(value), {
        message: "Ingresa un RUT válido",
      }),
    notes: optionalTrimmed(2000),
    source: optionalTrimmed(80),
    preferenciaContacto: optionalTrimmed(40),
    metadata: z.record(z.string().max(40), metadataValueSchema).optional(),
    executiveKind: executiveKindSchema.optional().default("ISAPRES_PREMIUM"),
    autoAssign: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.metadata && Object.keys(data.metadata).length > 20) {
      ctx.addIssue({
        code: "custom",
        path: ["metadata"],
        message: "metadata admite como máximo 20 campos.",
      });
    }
  });

export type PublicRegisterClientPayload = z.infer<
  typeof publicRegisterClientSchema
>;
