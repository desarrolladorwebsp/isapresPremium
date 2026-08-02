import { z } from "zod";

const MAX_PLANS = 20;
const MAX_FIELD = 2_000;
const MAX_COVERAGE = 8_000;

const planSnapshotSchema = z.object({
  isapre: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().min(1).max(80),
  type: z.string().trim().min(1).max(80),
  priceUf: z.string().trim().min(1).max(80),
  priceClp: z.string().trim().min(1).max(80),
  listPriceUf: z.string().trim().max(80).nullable(),
  listPriceClp: z.string().trim().max(80).nullable(),
  convenioLabel: z.string().trim().max(MAX_FIELD).nullable(),
  hospitalCoverage: z.string().trim().max(MAX_COVERAGE),
  ambulatoryCoverage: z.string().trim().max(MAX_COVERAGE),
  pdfUrl: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .refine(
      (value) =>
        value == null ||
        value === "" ||
        /^https?:\/\//i.test(value) ||
        value.startsWith("/"),
      "URL de PDF inválida.",
    ),
});

export const executiveSharePlansEmailSchema = z.object({
  clientId: z.string().trim().min(1).max(80),
  profileSummary: z.string().trim().max(MAX_FIELD).optional().nullable(),
  plans: z.array(planSnapshotSchema).min(1).max(MAX_PLANS),
});

export type ExecutiveSharePlansEmailInput = z.infer<
  typeof executiveSharePlansEmailSchema
>;

export function parseExecutiveSharePlansEmailInput(
  payload: unknown,
): ExecutiveSharePlansEmailInput {
  return executiveSharePlansEmailSchema.parse(payload);
}
