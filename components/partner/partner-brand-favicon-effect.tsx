"use client";

import { useEffect } from "react";
import { applyPartnerFaviconToDocument } from "@/lib/partner-entity/apply-partner-favicon";
import { resolvePartnerFaviconUrl } from "@/lib/partner-entity/resolve-partner-favicon";
import type { PartnerEntityPublic } from "@/types/partner-entity";

interface PartnerBrandFaviconEffectProps {
  entity: PartnerEntityPublic | null;
}

/** Sincroniza el favicon de la pestaña según la entidad aliada activa. */
export function PartnerBrandFaviconEffect({
  entity,
}: PartnerBrandFaviconEffectProps) {
  useEffect(() => {
    const href = resolvePartnerFaviconUrl(entity);
    return applyPartnerFaviconToDocument(href);
  }, [entity]);

  return null;
}
