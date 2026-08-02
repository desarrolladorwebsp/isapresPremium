import {
  DEFAULT_PARTNER_ENTITY_ENV,
  DEFAULT_PARTNER_ENTITY_SLUG,
} from "@/lib/partner-entity/constants";
import {
  getDefaultPartnerEntity,
  getPlatformPartnerEntity,
} from "@/lib/partner-entity/fallback-entities";
import {
  readPartnerEntityByAgentKey,
  readPartnerEntityBySlug,
  toPublicPartnerEntity,
} from "@/lib/partner-entity/store";
import { isLegacySeoRequest } from "@/lib/seo/request-host";
import type { PartnerEntityPublic } from "@/types/partner-entity";

const LEGACY_DEFAULT_PARTNER_SLUG = "cotizaloantes";

function resolveDefaultSlug(): string {
  return (
    process.env[DEFAULT_PARTNER_ENTITY_ENV]?.trim().toLowerCase() ||
    DEFAULT_PARTNER_ENTITY_SLUG
  );
}

export async function readPartnerEntityFromCookieSlug(
  slug: string | undefined,
): Promise<PartnerEntityPublic | null> {
  if (!slug) return null;

  const entity = await readPartnerEntityByAgentKey(slug);
  return entity ? toPublicPartnerEntity(entity) : null;
}

/**
 * Resuelve entidad para /cotizador.
 * Prioridad: `?agent=` / `?entidad=` → cookie (solo host legacy o con agent) → default del host.
 *
 * En isaprespremium.cl sin agent explícito gana Isapres Premium (`DEFAULT_PARTNER_ENTITY_SLUG`).
 */
export async function resolvePartnerEntityForCotizador(
  agentKey?: string,
  cookieSlug?: string,
): Promise<PartnerEntityPublic> {
  const trimmedAgent = agentKey?.trim();
  if (trimmedAgent) {
    const entity = await readPartnerEntityByAgentKey(trimmedAgent);
    if (entity) return toPublicPartnerEntity(entity);
  }

  const legacyHost = await isLegacySeoRequest();

  if (legacyHost) {
    const trimmedCookie = cookieSlug?.trim();
    if (trimmedCookie) {
      const entity = await readPartnerEntityByAgentKey(trimmedCookie);
      if (entity) return toPublicPartnerEntity(entity);
    }

    const legacyEntity = await readPartnerEntityBySlug(
      LEGACY_DEFAULT_PARTNER_SLUG,
    );
    if (legacyEntity) return toPublicPartnerEntity(legacyEntity);
  }

  const entity = await readPartnerEntityBySlug(resolveDefaultSlug());
  if (entity) return toPublicPartnerEntity(entity);

  return getDefaultPartnerEntity();
}

/** Agente de la plataforma principal de este deploy (Isapres Premium). */
export async function readPlatformPartnerEntity(): Promise<PartnerEntityPublic> {
  const entity = await readPartnerEntityBySlug(getPlatformPartnerEntity().slug);
  if (entity) return toPublicPartnerEntity(entity);

  return getPlatformPartnerEntity();
}

export async function resolvePartnerEntityForHome(
  cookieSlug?: string,
): Promise<PartnerEntityPublic> {
  return resolvePartnerEntityForCotizador(undefined, cookieSlug);
}

export async function loadPartnerEntityPage(
  slug: string,
): Promise<PartnerEntityPublic | null> {
  const entity = await readPartnerEntityBySlug(slug);
  if (!entity) return null;

  return toPublicPartnerEntity(entity);
}

export async function loadPartnerEntityByEmbedKey(
  embedKey: string,
): Promise<PartnerEntityPublic | null> {
  const entity = await readPartnerEntityByAgentKey(embedKey);
  if (!entity) return null;

  return toPublicPartnerEntity(entity);
}
