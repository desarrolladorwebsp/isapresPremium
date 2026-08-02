import { DEEP_LINK_PARAMS } from "@/lib/deep-link/params";

/** Tiempo antes de mostrar la vista normal si el deep link de solicitud no abre el plan. */
export const SOLICITAR_DEEP_LINK_RECOVERY_MS = 12_000;

export const SOLICITAR_RECOVERY_NOTICE =
  "Te mostramos los mejores planes para tu perfil. Elige el que más te convenga.";

export function stripSolicitarParamsFromBrowserUrl(planCode?: string) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete(DEEP_LINK_PARAMS.plan);
  url.searchParams.delete(DEEP_LINK_PARAMS.vista);

  const q = url.searchParams.get(DEEP_LINK_PARAMS.q);
  if (planCode && q === planCode) {
    url.searchParams.delete(DEEP_LINK_PARAMS.q);
  }

  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}
