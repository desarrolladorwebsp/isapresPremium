import {
  ISAPRE_CATALOG,
  resolveIsapreIdFromName,
  resolveIsapreNameFromId,
} from "@/lib/isapre-catalog";
import {
  DEFAULT_GES_PREMIUM_UF,
  ISAPRE_GES_DEFAULTS,
} from "@/lib/isapre-ges-defaults";
import { prisma } from "@/lib/prisma";
import { invalidatePlanCatalogCache } from "@/lib/api/plan-catalog-cache";
import type { IsapreRecord, UpdateIsapreGesInput } from "@/types/isapre";
import { ApiError } from "@/lib/api/api-error";

function mapDbIsapre(isapre: {
  id: string;
  name: string;
  active: boolean;
  gesPremiumUf: number;
  gesPremiumUfLegacy: number | null;
  createdAt: Date;
  updatedAt: Date;
}): IsapreRecord {
  return {
    id: isapre.id,
    name: isapre.name,
    active: isapre.active,
    gesPremiumUf: isapre.gesPremiumUf,
    gesPremiumUfLegacy: isapre.gesPremiumUfLegacy,
    createdAt: isapre.createdAt.toISOString(),
    updatedAt: isapre.updatedAt.toISOString(),
  };
}

function resolveGesDefaultsForId(isapreId: string) {
  return (
    ISAPRE_GES_DEFAULTS[isapreId] ?? {
      gesPremiumUf: DEFAULT_GES_PREMIUM_UF,
      gesPremiumUfLegacy: null,
    }
  );
}

export async function ensureIsapreExists(isapreName: string): Promise<string> {
  const id = resolveIsapreIdFromName(isapreName);
  const name =
    ISAPRE_CATALOG.find((item) => item.id === id)?.name ?? isapreName.trim();
  const defaults = resolveGesDefaultsForId(id);

  await prisma.isapre.upsert({
    where: { id },
    create: {
      id,
      name,
      gesPremiumUf: defaults.gesPremiumUf,
      gesPremiumUfLegacy: defaults.gesPremiumUfLegacy,
    },
    update: { name },
  });

  return id;
}

export async function readIsapres(): Promise<IsapreRecord[]> {
  const isapres = await prisma.isapre.findMany({
    orderBy: { name: "asc" },
  });

  return isapres.map(mapDbIsapre);
}

export async function updateIsapreGes(
  id: string,
  input: UpdateIsapreGesInput,
): Promise<IsapreRecord> {
  if (
    input.gesPremiumUf !== undefined &&
    (!Number.isFinite(input.gesPremiumUf) || input.gesPremiumUf <= 0)
  ) {
    throw new ApiError(
      "El valor GES vigente debe ser un número mayor que cero.",
      400,
      "INVALID_GES",
    );
  }

  if (
    input.gesPremiumUfLegacy !== undefined &&
    input.gesPremiumUfLegacy !== null &&
    (!Number.isFinite(input.gesPremiumUfLegacy) || input.gesPremiumUfLegacy <= 0)
  ) {
    throw new ApiError(
      "El valor GES de referencia debe ser un número mayor que cero.",
      400,
      "INVALID_GES",
    );
  }

  const isapre = await prisma.isapre.update({
    where: { id },
    data: {
      gesPremiumUf: input.gesPremiumUf,
      gesPremiumUfLegacy: input.gesPremiumUfLegacy,
    },
  });

  invalidatePlanCatalogCache();

  return mapDbIsapre(isapre);
}

export async function seedIsapreCatalog(): Promise<void> {
  await Promise.all(
    ISAPRE_CATALOG.map((item) => {
      const defaults = resolveGesDefaultsForId(item.id);
      return prisma.isapre.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          name: item.name,
          gesPremiumUf: defaults.gesPremiumUf,
          gesPremiumUfLegacy: defaults.gesPremiumUfLegacy,
        },
        update: {
          name: item.name,
          active: true,
          gesPremiumUf: defaults.gesPremiumUf,
          gesPremiumUfLegacy: defaults.gesPremiumUfLegacy,
        },
      });
    }),
  );
}

export function getIsapreNameById(isapreId: string): string {
  return resolveIsapreNameFromId(isapreId);
}
