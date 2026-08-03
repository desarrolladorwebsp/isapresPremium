"use client";

import { useEffect } from "react";
import { applyPartnerBrandToDocument } from "@/lib/partner-entity/apply-brand-theme";
import { buildIsaprePremiumPartnerRecord } from "@/lib/partner-entity/isapre-premium-agent";

/** Acceso staff — aplica identidad Isapres Premium en `<html>`. */
export function StaffAccessBrandThemeEffect() {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-landing", "");
    const cleanupBrand = applyPartnerBrandToDocument(
      buildIsaprePremiumPartnerRecord(),
    );

    return () => {
      root.removeAttribute("data-landing");
      cleanupBrand();
    };
  }, []);

  return null;
}
