/** Cookie que persiste la entidad aliada entre visitas. */
export const PARTNER_ENTITY_COOKIE = "ci_partner_entity";

export const PARTNER_ENTITY_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

/** Query param principal en Cotizador Premium: ?agent=cotizaloantes */
export const AGENT_QUERY_PARAM = "agent";

/** Query param legacy: ?entidad=cotizaloantes */
export const PARTNER_ENTITY_QUERY_PARAM = "entidad";

/** Segmentos de ruta raíz reservados (no son slugs de entidad). */
export const RESERVED_ROOT_SEGMENTS = new Set([
  "admin",
  "api",
  "cotizador",
  "embed",
  "empresas",
  "index",
  "inicio",
  "isapres",
  "login",
  "ejecutivos",
  "nosotros",
  "politica-privacidad",
  "politicas",
  "respaldo-legal",
  "_next",
  "images",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "opengraph-image",
]);

export const DEFAULT_PARTNER_ENTITY_ENV = "DEFAULT_PARTNER_ENTITY_SLUG";

export { DEFAULT_PARTNER_ENTITY_SLUG } from "@/lib/partner-entity/fallback-entities";
