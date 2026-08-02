import { NextResponse, type NextRequest } from "next/server";
import {
  EMBED_DOCUMENT_HEADER,
  isEmbedDocumentRequest,
} from "@/lib/embed/is-embed-request";

/** Continúa la petición propagando el flag de documento embebido al layout SSR. */
export function forwardRequest(request: NextRequest): NextResponse {
  if (
    !isEmbedDocumentRequest(
      request.nextUrl.pathname,
      request.nextUrl.searchParams.get("embed"),
    )
  ) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(EMBED_DOCUMENT_HEADER, "1");
  return NextResponse.next({ request: { headers: requestHeaders } });
}
