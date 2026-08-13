import { headers } from "next/headers";
import {
  isLegacySeoHostname,
  normalizeHostname,
} from "@/lib/seo/request-host";

/** Lee el host del request (App Router). No usar desde middleware. */
export async function readRequestHostname(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-host");
  const host = headerList.get("host");
  return normalizeHostname(forwarded ?? host);
}

/**
 * true cuando el request llega por el dominio legacy
 * (cotizador.cotizaloantes.cl). Ese host no debe indexarse
 * con la marca Cotizador Premium.
 */
export async function isLegacySeoRequest(): Promise<boolean> {
  return isLegacySeoHostname(await readRequestHostname());
}
