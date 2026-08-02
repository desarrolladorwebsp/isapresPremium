import { partnerThemeToCssProperties } from "@/lib/partner-entity/theme";
import type { PartnerEntityPublic } from "@/types/partner-entity";

/** Aplica tema de marca en `<html>` para que body y toda la página hereden los tokens. */
export function applyPartnerBrandToDocument(
  entity: PartnerEntityPublic,
): () => void {
  const root = document.documentElement;
  const previousBrand = root.getAttribute("data-brand");
  const themeStyle = partnerThemeToCssProperties(entity.theme);
  const previousVars: Record<string, string> = {};

  root.setAttribute("data-brand", entity.brandKey);

  for (const [key, value] of Object.entries(themeStyle)) {
    previousVars[key] = root.style.getPropertyValue(key);
    root.style.setProperty(key, value);
  }

  return () => {
    if (previousBrand) {
      root.setAttribute("data-brand", previousBrand);
    } else {
      root.removeAttribute("data-brand");
    }

    for (const [key, previous] of Object.entries(previousVars)) {
      if (previous) {
        root.style.setProperty(key, previous);
      } else {
        root.style.removeProperty(key);
      }
    }
  };
}
