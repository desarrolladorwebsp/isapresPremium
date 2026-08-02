"use client";

import { useEffect } from "react";
import { applyPartnerBrandToDocument } from "@/lib/partner-entity/apply-brand-theme";
import type { PartnerEntityPublic } from "@/types/partner-entity";

interface PartnerBrandThemeEffectProps {
  entity: PartnerEntityPublic | null;
}

/** Sincroniza tokens de marca en `<html>` (body hereda --bg-layout, --primary, etc.). */
export function PartnerBrandThemeEffect({
  entity,
}: PartnerBrandThemeEffectProps) {
  useEffect(() => {
    if (!entity) return;

    return applyPartnerBrandToDocument(entity);
  }, [entity]);

  return null;
}
