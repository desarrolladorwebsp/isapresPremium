/** Variable de entorno con la clave compartida para consumidores externos. */
export const PUBLIC_API_SECRET_ENV = "PUBLIC_API_SECRET";

/** Versión actual de la API pública. */
export const PUBLIC_API_VERSION = "v1";

export const PUBLIC_API_BASE_PATH = `/api/public/${PUBLIC_API_VERSION}`;

/** Cabecera alternativa a Authorization Bearer. */
export const PUBLIC_API_KEY_HEADER = "x-api-key";

/** Máximo de planes en GET /plans/preview (respuesta ligera para integradores). */
export const PUBLIC_API_PLANS_PREVIEW_LIMIT = 6;
