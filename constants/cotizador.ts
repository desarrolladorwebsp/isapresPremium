import { HERO_MOBILE_PLAYLISTS, heroVideosStartingAt } from "@/constants/hero";

export const COTIZADOR_STEPS = [
  { id: 1, label: "Datos personales", shortLabel: "Datos\npersonales" },
  { id: 2, label: "Datos para cotizar Isapres", shortLabel: "Datos para\ncotizar Isapres" },
  { id: 3, label: "Enviar Formulario", shortLabel: "Enviar\nFormulario" },
  { id: 4, label: "Enviado", shortLabel: "Enviado" },
] as const;

export const PREVISION_OPTIONS = [
  { value: "", label: "-- Seleccione --" },
  { value: "fonasa", label: "Fonasa" },
  { value: "banmedica", label: "Isapre Banmédica" },
  { value: "consalud", label: "Isapre Consalud" },
  { value: "colmena", label: "Isapre Colmena" },
  { value: "cruz-blanca", label: "Isapre Cruz Blanca" },
  { value: "nueva-mas-vida", label: "Isapre Nueva más Vida" },
  { value: "vida-tres", label: "Isapre Vida Tres" },
  { value: "otra", label: "Otra" },
  { value: "sin-prevision", label: "Sin previsión" },
] as const;

export const REGIONES_CHILE = [
  { value: "", label: "-- Seleccione --" },
  { value: "arica-parinacota", label: "Región de Arica y Parinacota" },
  { value: "tarapaca", label: "Región de Tarapacá" },
  { value: "antofagasta", label: "Región de Antofagasta" },
  { value: "atacama", label: "Región de Atacama" },
  { value: "coquimbo", label: "Región de Coquimbo" },
  { value: "valparaiso", label: "Región de Valparaíso" },
  { value: "ohiggins", label: "Región de O'Higgins" },
  { value: "maule", label: "Región del Maule" },
  { value: "nuble", label: "Región del Ñuble" },
  { value: "biobio", label: "Región del Biobío" },
  { value: "araucania", label: "Región de La Araucanía" },
  { value: "los-rios", label: "Región de Los Ríos" },
  { value: "los-lagos", label: "Región de Los Lagos" },
  { value: "aysen", label: "Región de Aysén" },
  { value: "magallanes", label: "Región de Magallanes" },
  { value: "metropolitana", label: "Región Metropolitana" },
] as const;

export const CARGAS_MEDICAS_OPTIONS = [
  { value: "", label: "-- Seleccione --" },
  { value: "sin-cargas", label: "Sin cargas" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5-o-mas", label: "5 o más" },
] as const;

export const MOTIVO_COTIZACION_OPTIONS = [
  { value: "", label: "-- Seleccione --" },
  {
    value: "aumento-excesivo",
    label: "Aumento excesivo en el valor del plan",
  },
  {
    value: "mejores-coberturas",
    label: "Mejores coberturas en otra isapre",
  },
  {
    value: "malas-experiencias",
    label: "Malas experiencias con el servicio al cliente",
  },
  {
    value: "recomendacion",
    label: "Recomendación médica o familiar",
  },
  {
    value: "sumar-cargas",
    label: "Necesidad de sumar cargas familiares",
  },
] as const;

export const CONTACTO_PREFERENCIA_OPTIONS = [
  { value: "", label: "-- Seleccione --" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telefono", label: "Teléfono" },
  { value: "email", label: "Email" },
  { value: "video-llamada", label: "Video Llamada" },
] as const;

export const TYPEWRITER_PHRASES = [
  "todas las clínicas",
  "Santiago y regiones",
] as const;

/** Home: desktop hero-01 · mobile curated vertical set starting on v03. */
export const HERO_VIDEOS = heroVideosStartingAt(0);
export const HERO_VIDEOS_MOBILE = [...HERO_MOBILE_PLAYLISTS.home];

export type CotizadorFormData = {
  nombreApellido: string;
  rut: string;
  edad: string;
  email: string;
  telefono: string;
  previsionActual: string;
  ufActuales: string;
  region: string;
  cargasMedicas: string;
  edadCargas: string;
  rentaImponible: string;
  motivoCotizacion: string;
  preferenciaContacto: string;
  autorizaDatos: boolean;
};

export const INITIAL_FORM_DATA: CotizadorFormData = {
  nombreApellido: "",
  rut: "",
  edad: "",
  email: "",
  telefono: "",
  previsionActual: "",
  ufActuales: "",
  region: "",
  cargasMedicas: "",
  edadCargas: "",
  rentaImponible: "",
  motivoCotizacion: "",
  preferenciaContacto: "",
  autorizaDatos: false,
};
