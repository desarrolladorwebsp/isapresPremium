import { siteConfig } from "./site";

export const NAV_LINKS = [
  { label: "Inicio", href: "/" },
  { label: "Cotizador", href: siteConfig.cotizadorUrl },
  { label: "Empresas", href: "/empresas" },
  { label: "Respaldo Legal", href: "/respaldo-legal" },
  { label: "Nosotros", href: "/nosotros" },
] as const;
