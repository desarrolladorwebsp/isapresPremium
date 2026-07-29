import { siteConfig } from "./site";

export const NAV_LINKS = [
  { label: "Inicio", href: "/" },
  { label: "Cotizador", href: siteConfig.cotizadorUrl },
  { label: "Empresas", href: "/empresas" },
  { label: "Nosotros", href: "/nosotros" },
] as const;
