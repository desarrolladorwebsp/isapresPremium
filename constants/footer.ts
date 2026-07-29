import {
  Building2,
  Calculator,
  Home,
  MessageCircle,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { siteConfig } from "./site";

export type FooterSitemapLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const FOOTER_SITEMAP_LINKS: FooterSitemapLink[] = [
  { label: "Inicio", href: "/", icon: Home },
  { label: "Empresas", href: "/empresas", icon: Building2 },
  { label: "Cotiza", href: siteConfig.cotizadorUrl, icon: Calculator },
  { label: "Chatbot", href: "/#chatbot", icon: MessageCircle },
  { label: "Políticas", href: "/politicas", icon: ShieldCheck },
];

export const FOOTER_MARKET_INDICATORS = [
  { label: "UF", value: "CLP$ 40.845" },
  { label: "UTM", value: "CLP$ 71.649" },
] as const;
