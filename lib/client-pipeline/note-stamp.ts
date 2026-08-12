/** Prefijo de línea en notas internas: `[fecha · Nombre]`. */
export function formatPipelineNotePrefix(actorName: string): string {
  const stamp = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
  const who = actorName.trim() || "Ejecutivo";
  return `[${stamp} · ${who}]`;
}

export function appendPipelineNoteLine(
  existing: string | null | undefined,
  lineBody: string,
  actorName: string,
): string {
  const line = `${formatPipelineNotePrefix(actorName)} ${lineBody.trim()}`;
  const prev = existing?.trim();
  return prev ? `${prev}\n${line}` : line;
}

/** Cuerpo de la línea sin el prefijo `[fecha · actor]`. */
export function stripPipelineNotePrefix(line: string): string {
  const match = line.trim().match(/^\[[^\]]+\]\s*(.*)$/s);
  return (match?.[1] ?? line).trim();
}

/** Prefijo de stamp si existe (`[fecha · actor]`). */
export function extractPipelineNoteStamp(line: string): string | null {
  const match = line.trim().match(/^(\[[^\]]+\])/);
  return match?.[1] ?? null;
}

/**
 * Notas libres del ejecutivo (distintas de movimientos automáticos).
 * Reconoce `Nota:` y el formato legado `Nota de reunión:`.
 */
const CLIENT_NOTE_BODY_RE = /^Nota(?:\s+de\s+reunión)?:\s*/i;

export function isPipelineClientNoteLine(line: string): boolean {
  return CLIENT_NOTE_BODY_RE.test(stripPipelineNotePrefix(line));
}

export function formatClientNoteLineBody(noteText: string): string {
  return `Nota: ${noteText.trim()}`;
}

export function clientNoteDisplayText(line: string): string {
  return stripPipelineNotePrefix(line).replace(CLIENT_NOTE_BODY_RE, "").trim();
}

export function splitPipelineNoteLines(
  notes: string | null | undefined,
): string[] {
  if (!notes?.trim()) return [];
  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Notas del cliente, más recientes primero. */
export function listClientNoteLines(
  notes: string | null | undefined,
): string[] {
  return splitPipelineNoteLines(notes).filter(isPipelineClientNoteLine).reverse();
}

/** Movimientos de sistema (sin notas libres), más recientes primero. */
export function listPipelineModificationLines(
  notes: string | null | undefined,
): string[] {
  return splitPipelineNoteLines(notes)
    .filter((line) => !isPipelineClientNoteLine(line))
    .reverse();
}

/** Zoom, Premium, Isapres y admin pueden ver el historial de modificaciones. */
export function canAccessInternalPipelineNotes(input: {
  isAdmin: boolean;
  executiveKind: string | null | undefined;
}): boolean {
  if (input.isAdmin) return true;
  return (
    input.executiveKind === "ZOOM" ||
    input.executiveKind === "ISAPRES_PREMIUM" ||
    input.executiveKind === "ISAPRES"
  );
}
