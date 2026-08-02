/** Header interno: layout raíz marca el documento como iframe embebido. */
export const EMBED_DOCUMENT_HEADER = "x-cotizador-embed";

/** true cuando la vista se carga embebida en iframe (widget). */
export function isEmbedSearchParam(
  value: string | string[] | undefined,
): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1" || raw === "true";
}

/** true para rutas /embed/* o query ?embed=1 */
export function isEmbedDocumentRequest(
  pathname: string,
  embedParam: string | null | undefined,
): boolean {
  if (pathname === "/embed" || pathname.startsWith("/embed/")) {
    return true;
  }
  return isEmbedSearchParam(embedParam ?? undefined);
}
