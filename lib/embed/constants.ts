/** Clave sessionStorage: cotizador completo cargando tras salir del widget. */
export const EMBED_EXIT_SEARCH_SESSION_KEY = "cotizador-premium:exit-search";

export const EMBED_MESSAGE_SOURCE = "cotizador-premium" as const;
export const EMBED_RESIZE_MESSAGE = "cotizador-premium:resize" as const;
export const EMBED_READY_MESSAGE = "cotizador-premium:ready" as const;
export const EMBED_EXIT_NAVIGATE_MESSAGE =
  "cotizador-premium:exit-navigate" as const;
export const EMBED_WHEEL_MESSAGE = "cotizador-premium:wheel" as const;
export const EMBED_REQUEST_RESIZE_MESSAGE =
  "cotizador-premium:request-resize" as const;

export const EMBED_EXIT_LOADING_TITLE =
  "Buscando el mejor plan para ti…" as const;

/** Margen extra al reportar altura (evita recorte por subpíxeles y barras del navegador). */
export const EMBED_HEIGHT_BUFFER_PX = 48;
