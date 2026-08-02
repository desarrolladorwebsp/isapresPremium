import { z } from "zod";
import { isValidRut } from "@/lib/auth/rut";

function isValidRequestEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeRequestPhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

const optionalRutSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || isValidRut(value), {
    message: "RUT no válido.",
  });

const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || isValidRequestEmail(value), {
    message: "Correo no válido.",
  });

const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || normalizeRequestPhoneDigits(value).length >= 8,
    { message: "Teléfono no válido." },
  );

export const companyAgreementInquirySchema = z
  .object({
    userRut: optionalRutSchema,
    email: optionalEmailSchema,
    phone: optionalPhoneSchema,
    companyRut: optionalRutSchema,
    source: z.enum(["public", "executive", "embed"]),
    cotizadorUrl: z.string().trim().url().optional(),
    partnerEntitySlug: z.string().trim().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    const hasAny =
      Boolean(data.userRut?.trim()) ||
      Boolean(data.email?.trim()) ||
      Boolean(data.phone?.trim()) ||
      Boolean(data.companyRut?.trim());

    if (!hasAny) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa al menos un dato para enviar la consulta.",
        path: ["userRut"],
      });
    }
  });

export type CompanyAgreementInquiryInput = z.infer<
  typeof companyAgreementInquirySchema
>;

export function parseCompanyAgreementInquiryInput(
  payload: unknown,
): CompanyAgreementInquiryInput {
  const result = companyAgreementInquirySchema.safeParse(payload);

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ");
    throw new Error(message);
  }

  return result.data;
}

export function hasCompanyAgreementInquiryData(input: {
  userRut: string;
  email: string;
  phone: string;
  companyRut: string;
}): boolean {
  return (
    Boolean(input.userRut.trim()) ||
    Boolean(input.email.trim()) ||
    Boolean(input.phone.trim()) ||
    Boolean(input.companyRut.trim())
  );
}

export function validateCompanyAgreementFields(input: {
  userRut: string;
  email: string;
  phone: string;
  companyRut: string;
}): Partial<Record<"userRut" | "email" | "phone" | "companyRut", string>> {
  const result = companyAgreementInquirySchema.safeParse({
    ...input,
    source: "public",
  });

  if (result.success) return {};

  const errors: Partial<
    Record<"userRut" | "email" | "phone" | "companyRut", string>
  > = {};

  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (
      field === "userRut" ||
      field === "email" ||
      field === "phone" ||
      field === "companyRut"
    ) {
      if (!errors[field]) errors[field] = issue.message;
    }
  }

  return errors;
}
