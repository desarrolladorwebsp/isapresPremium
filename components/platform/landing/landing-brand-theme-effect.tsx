"use client";

import { useEffect } from "react";
import { applyPartnerBrandToDocument } from "@/lib/partner-entity/apply-brand-theme";
import { buildCotizadorPremiumPartnerRecord } from "@/lib/partner-entity/platform-agent";

/** Landing de Cotizador Premium — aplica identidad en `<html>`. */
export function LandingBrandThemeEffect() {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-landing", "");
    const cleanupBrand = applyPartnerBrandToDocument(
      buildCotizadorPremiumPartnerRecord(),
    );

    return () => {
      root.removeAttribute("data-landing");
      cleanupBrand();
    };
  }, []);

  return null;
}
