import { PLATFORM_AGENT_KEY } from "@/lib/partner-entity/platform-agent";
import { PROD_APP_BASE_URL, resolveAppBaseUrl } from "@/lib/platform/routing";

/** Agente / partner key de Cotizador Premium en la Landing. */
export const LANDING_WIDGET_AGENT_KEY =
  process.env.NEXT_PUBLIC_LANDING_AGENT_KEY?.trim() ||
  process.env.NEXT_PUBLIC_COTIZADOR_AGENT_KEY?.trim() ||
  PLATFORM_AGENT_KEY;

export const LANDING_WIDGET_SCRIPT_URL =
  process.env.NEXT_PUBLIC_COTIZADOR_WIDGET_URL?.trim() ||
  "/cotizador-widget.js";

export const LANDING_WIDGET_MIN_HEIGHT = 720;

function isLocalHostUrl(value: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(value);
}

/**
 * Base URL del cotizador embebido en la landing.
 * En el navegador usa siempre el origen actual (evita localhost en producción).
 */
export function resolveLandingWidgetBaseUrl(): string {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (!isLocalHostUrl(origin)) return origin;
  }

  const configured = resolveAppBaseUrl();
  if (!isLocalHostUrl(configured)) return configured;

  return PROD_APP_BASE_URL;
}
