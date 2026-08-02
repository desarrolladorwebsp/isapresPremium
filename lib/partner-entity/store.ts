import {
  COTIZALO_ANTES_THEME,
  DEFAULT_PARTNER_ENTITY_SLUG,
  DESDETU7_THEME,
  getFallbackPartnerEntity,
} from "@/lib/partner-entity/fallback-entities";
import { RESERVED_ROOT_SEGMENTS } from "@/lib/partner-entity/constants";
import {
  isDatabaseConnectivityError,
  isPartnerEntityDbUnavailable,
  isPartnerEntitySchemaError,
  logPartnerEntitySchemaWarning,
  markPartnerEntityDbCooldown,
  markPartnerEntityDbUnavailable,
} from "@/lib/partner-entity/db-guard";
import {
  PLATFORM_AGENT_KEY,
  PLATFORM_AGENT_LOGO_URL,
  COTIZADOR_PREMIUM_THEME,
} from "@/lib/partner-entity/platform-agent";
import {
  ISAPRE_PREMIUM_THEME,
  isIsaprePremiumAgentKey,
} from "@/lib/partner-entity/isapre-premium-agent";
import { prisma } from "@/lib/prisma";
import type {
  PartnerEntityPublic,
  PartnerEntityRecord,
  PartnerEntityTheme,
} from "@/types/partner-entity";
import type { PartnerEntity as DbPartnerEntity } from "@prisma/client";

function parseTheme(raw: unknown): PartnerEntityTheme {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  return raw as PartnerEntityTheme;
}

function isAgentKey(
  entity: PartnerEntityRecord,
  key: string,
): boolean {
  return entity.slug === key || entity.embedKey === key;
}

/** Tokens de marca canónicos en código (criterios / convenio) sobre theme de BD. */
function resolvePublicTheme(entity: PartnerEntityRecord): PartnerEntityTheme {
  const isPlatform =
    entity.slug === PLATFORM_AGENT_KEY ||
    entity.embedKey === PLATFORM_AGENT_KEY;

  if (isPlatform) {
    return { ...entity.theme, ...COTIZADOR_PREMIUM_THEME };
  }

  if (
    isIsaprePremiumAgentKey(entity.slug) ||
    isIsaprePremiumAgentKey(entity.embedKey)
  ) {
    return { ...entity.theme, ...ISAPRE_PREMIUM_THEME };
  }

  if (isAgentKey(entity, "desdetu7")) {
    return { ...entity.theme, ...DESDETU7_THEME };
  }

  if (isAgentKey(entity, "cotizaloantes")) {
    return { ...entity.theme, ...COTIZALO_ANTES_THEME };
  }

  return entity.theme;
}

function mapDbPartnerEntity(entity: DbPartnerEntity): PartnerEntityRecord {
  return {
    id: entity.id,
    slug: entity.slug,
    embedKey: entity.embedKey,
    name: entity.name,
    logoUrl: entity.logoUrl,
    websiteUrl: entity.websiteUrl,
    whatsappNumber: entity.whatsappNumber,
    whatsappMessage: entity.whatsappMessage,
    exitLabel: entity.exitLabel,
    brandKey: entity.brandKey,
    theme: parseTheme(entity.theme),
    active: entity.active,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

function mapFallbackToRecord(entity: PartnerEntityPublic): PartnerEntityRecord {
  return {
    id: `fallback-${entity.slug}`,
    ...entity,
    active: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

/** Logo canónico en código; evita rutas viejas en BD (p. ej. .jpeg inexistente). */
function resolvePublicLogoUrl(entity: PartnerEntityRecord): string {
  const isPlatform =
    entity.slug === PLATFORM_AGENT_KEY ||
    entity.embedKey === PLATFORM_AGENT_KEY;

  if (isPlatform) {
    return PLATFORM_AGENT_LOGO_URL;
  }

  const logo = entity.logoUrl?.trim() ?? "";
  if (
    /\/images\/logo-cotizador-premium\.(jpe?g|png)$/i.test(logo) ||
    /\/images\/icono-logo-cotizador-premium\.png$/i.test(logo)
  ) {
    return PLATFORM_AGENT_LOGO_URL;
  }

  return logo || PLATFORM_AGENT_LOGO_URL;
}

export function toPublicPartnerEntity(
  entity: PartnerEntityRecord,
): PartnerEntityPublic {
  return {
    slug: entity.slug,
    embedKey: entity.embedKey,
    name: entity.name,
    logoUrl: resolvePublicLogoUrl(entity),
    websiteUrl: entity.websiteUrl,
    whatsappNumber: entity.whatsappNumber,
    whatsappMessage: entity.whatsappMessage,
    exitLabel: entity.exitLabel,
    brandKey: entity.brandKey,
    theme: resolvePublicTheme(entity),
  };
}

export async function readPartnerEntityBySlug(
  slug: string,
): Promise<PartnerEntityRecord | null> {
  const normalized = slug.trim().toLowerCase();

  if (
    !isPartnerEntityDbUnavailable() &&
    typeof prisma.partnerEntity?.findFirst === "function"
  ) {
    try {
      const entity = await prisma.partnerEntity.findFirst({
        where: { slug: normalized, active: true },
      });

      if (entity) {
        return mapDbPartnerEntity(entity);
      }
    } catch (error) {
      if (isPartnerEntitySchemaError(error)) {
        markPartnerEntityDbUnavailable();
        logPartnerEntitySchemaWarning();
      } else if (isDatabaseConnectivityError(error)) {
        markPartnerEntityDbCooldown();
        console.error("readPartnerEntityBySlug: base de datos no disponible", error);
      } else {
        console.error("readPartnerEntityBySlug: error de base de datos", error);
      }
    }
  }

  const fallback = getFallbackPartnerEntity(normalized);
  return fallback ? mapFallbackToRecord(fallback) : null;
}

export async function readPartnerEntityByEmbedKey(
  embedKey: string,
): Promise<PartnerEntityRecord | null> {
  const normalized = embedKey.trim().toLowerCase();

  if (
    !isPartnerEntityDbUnavailable() &&
    typeof prisma.partnerEntity?.findFirst === "function"
  ) {
    try {
      const entity = await prisma.partnerEntity.findFirst({
        where: { embedKey: normalized, active: true },
      });

      if (entity) {
        return mapDbPartnerEntity(entity);
      }
    } catch (error) {
      if (isPartnerEntitySchemaError(error)) {
        markPartnerEntityDbUnavailable();
        logPartnerEntitySchemaWarning();
      } else if (isDatabaseConnectivityError(error)) {
        markPartnerEntityDbCooldown();
        console.error("readPartnerEntityByEmbedKey: base de datos no disponible", error);
      } else {
        console.error("readPartnerEntityByEmbedKey: error de base de datos", error);
      }
    }
  }

  const fallback = getFallbackPartnerEntity(normalized);
  if (fallback && fallback.embedKey === normalized) {
    return mapFallbackToRecord(fallback);
  }

  return readPartnerEntityBySlug(normalized);
}

/** Resuelve agent key (embedKey o slug) hacia la entidad aliada activa. */
export async function readPartnerEntityByAgentKey(
  agentKey: string,
): Promise<PartnerEntityRecord | null> {
  const normalized = agentKey.trim().toLowerCase();
  if (!normalized) return null;

  const byEmbedKey = await readPartnerEntityByEmbedKey(normalized);
  if (byEmbedKey) return byEmbedKey;

  return readPartnerEntityBySlug(normalized);
}

export async function readActivePartnerSlugs(): Promise<string[]> {
  if (
    !isPartnerEntityDbUnavailable() &&
    typeof prisma.partnerEntity?.findMany === "function"
  ) {
    try {
      const entities = await prisma.partnerEntity.findMany({
        where: { active: true },
        select: { slug: true },
        orderBy: { name: "asc" },
      });

      if (entities.length > 0) {
        return entities.map((entity) => entity.slug);
      }
    } catch (error) {
      if (isPartnerEntitySchemaError(error)) {
        markPartnerEntityDbUnavailable();
        logPartnerEntitySchemaWarning();
      } else if (isDatabaseConnectivityError(error)) {
        markPartnerEntityDbCooldown();
        console.error("readActivePartnerSlugs: base de datos no disponible", error);
      } else {
        console.error("readActivePartnerSlugs: error de base de datos", error);
      }
    }
  }

  return [DEFAULT_PARTNER_ENTITY_SLUG];
}

export function isReservedRootSegment(segment: string): boolean {
  return RESERVED_ROOT_SEGMENTS.has(segment.toLowerCase());
}

export function isValidPartnerSlugSegment(segment: string): boolean {
  const normalized = segment.trim().toLowerCase();
  if (!normalized || normalized.includes("/")) return false;
  if (isReservedRootSegment(normalized)) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized);
}
