import { ISAPRE_GES_DEFAULTS } from "@/lib/isapre-ges-defaults";

export interface LandingIsapreItem {
  id: string;
  title: string;
  gesUf: number;
  description: string;
  logoSrc: string;
}

const ISAPRE_LOGO_BY_ID: Record<string, string> = {
  consalud: "/images/isapres/isapre-consalud.png",
  banmedica: "/images/isapres/isapre-banmedica.png",
  colmena: "/images/isapres/isapre-colmena.png",
  "cruz-blanca": "/images/isapres/isapre-cruz-blanca.jpeg",
  "vida-tres": "/images/isapres/isapre-vida-tres.png",
  "nueva-masvida": "/images/isapres/isapre-nueva-masvida.png",
  esencial: "/images/isapres/isapre-esencial.png",
};

const ISAPRE_DESCRIPTIONS: Record<string, string> = {
  "cruz-blanca":
    "Cruz Blanca, parte del grupo internacional Bupa desde 2014, es una de las principales Isapres del país con más de 700.000 afiliados y amplia trayectoria en el sistema privado de salud chileno.",
  consalud:
    "Respaldada por Inversiones La Construcción (ILC), cuenta con más de 40 años de trayectoria en el sistema de salud chileno y el programa Camina Contigo, que acompaña integralmente a afiliados con enfermedades graves.",
  colmena:
    "Colmena, constituida en 1983, cuenta con amplia trayectoria en el sistema privado chileno y respaldo de grupos económicos nacionales e internacionales, con red preferente de clínicas de alta complejidad.",
  banmedica:
    "Banmédica, con más de 30 años de trayectoria en Chile, forma parte de Empresas Banmédica, grupo integrado con red propia de clínicas y presencia internacional en Latinoamérica.",
  "nueva-masvida":
    "Nueva Masvida, creada en 2017 y perteneciente a Nexus Chile Health SpA, opera con cobertura nacional, amplia red de prestadores y compromiso de estabilidad en sus planes.",
  "vida-tres":
    "Vida Tres, fundada en 1986 y parte del Grupo Empresas Banmédica, nace desde clínicas de alto prestigio en Chile. Ofrece planes de alta cobertura y amplia red nacional de prestadores.",
  esencial:
    "Isapre Esencial, parte del Grupo Alemana (Corporación Chilena Alemana de Beneficencia), opera desde 2022 con enfoque digital, cobertura nacional y red de prestadores de primer nivel.",
};

const ISAPRE_DISPLAY_NAMES: Record<string, string> = {
  "cruz-blanca": "ISAPRE CRUZ BLANCA",
  consalud: "ISAPRE CONSALUD",
  colmena: "ISAPRE COLMENA",
  banmedica: "ISAPRE BANMÉDICA",
  "nueva-masvida": "ISAPRE NUEVA MASVIDA",
  "vida-tres": "ISAPRE VIDA TRES",
  esencial: "ISAPRE ESENCIAL",
};

const ISAPRE_ORDER = [
  "cruz-blanca",
  "consalud",
  "colmena",
  "banmedica",
  "nueva-masvida",
  "vida-tres",
  "esencial",
] as const;

function formatGesUf(id: string): number {
  return ISAPRE_GES_DEFAULTS[id]?.gesPremiumUf ?? 0.731;
}

export const LANDING_ISAPRES: LandingIsapreItem[] = ISAPRE_ORDER.map((id) => ({
  id,
  title: ISAPRE_DISPLAY_NAMES[id] ?? id,
  gesUf: formatGesUf(id),
  description: ISAPRE_DESCRIPTIONS[id] ?? "",
  logoSrc: ISAPRE_LOGO_BY_ID[id] ?? "",
}));

export function formatGesLabel(uf: number): string {
  return `${uf.toFixed(3)} UF`;
}
