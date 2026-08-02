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
