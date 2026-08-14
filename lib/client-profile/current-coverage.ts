import { CURRENT_COVERAGE_OPTIONS } from "@/lib/filter-options";

function normalizeCoverageKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/^isapre\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Aliases from lead form / catalog names → CURRENT_COVERAGE_OPTIONS ids. */
const COVERAGE_ALIASES: Record<string, string> = {
  "nueva-mas-vida": "nueva-masvida",
  "nueva-masvida": "nueva-masvida",
  masvida: "nueva-masvida",
  "nueva-mas-vida-isapre": "nueva-masvida",
};

const COVERAGE_BY_KEY = new Map<string, string>();
for (const option of CURRENT_COVERAGE_OPTIONS) {
  COVERAGE_BY_KEY.set(option.id, option.id);
  COVERAGE_BY_KEY.set(normalizeCoverageKey(option.id), option.id);
  COVERAGE_BY_KEY.set(normalizeCoverageKey(option.label), option.id);
}

/**
 * Canonical id for “previsión actual” (never the quoted/chosen plan).
 * Accepts option ids, labels (“Banmédica”), and lead values (“Isapre Banmédica”).
 */
export function resolveCurrentCoverageId(
  raw: string | null | undefined,
): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "";

  const aliased = COVERAGE_ALIASES[normalizeCoverageKey(trimmed)];
  if (aliased) return aliased;

  return COVERAGE_BY_KEY.get(trimmed) ?? COVERAGE_BY_KEY.get(normalizeCoverageKey(trimmed)) ?? "";
}

export function resolveCurrentCoverageLabel(
  raw: string | null | undefined,
  emptyLabel = "Sin previsión",
): string {
  const id = resolveCurrentCoverageId(raw);
  if (id) {
    return CURRENT_COVERAGE_OPTIONS.find((option) => option.id === id)?.label ?? id;
  }
  const trimmed = raw?.trim() ?? "";
  return trimmed || emptyLabel;
}

/** Lead notes: `previsión actual: consalud` */
export function extractCurrentCoverageFromNotes(
  pipelineNotes: string | null | undefined,
): string {
  if (!pipelineNotes) return "";
  const match = pipelineNotes.match(/previsi[oó]n actual:\s*([^\n]+)/i);
  return resolveCurrentCoverageId(match?.[1]);
}

/**
 * Previsión vigente del titular.
 * No usa el plan cotizado/elegido; si el valor guardado coincide con ese plan
 * y las notas del lead traen otra previsión, ganan las notas.
 */
export function resolveTitularCurrentCoverageId(input: {
  stored?: string | null;
  pipelineNotes?: string | null;
  chosenPlanIsapre?: string | null;
}): string {
  const storedId = resolveCurrentCoverageId(input.stored);
  const notesId = extractCurrentCoverageFromNotes(input.pipelineNotes);
  const planId = resolveCurrentCoverageId(input.chosenPlanIsapre);

  if (storedId && planId && storedId === planId && notesId && notesId !== planId) {
    return notesId;
  }
  if (storedId) return storedId;
  return notesId;
}
