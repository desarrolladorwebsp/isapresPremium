/**
 * Extrae la etiqueta de origen del formulario web desde pipelineNotes.
 * Formato escrito por registerLeadClient: `Origen formulario: {source}`
 */
export function extractWebFormSource(
  pipelineNotes?: string | null,
): string | null {
  if (!pipelineNotes) return null;
  const match = pipelineNotes.match(/Origen formulario:\s*([^\n]+)/i);
  const value = match?.[1]?.trim();
  return value || null;
}
