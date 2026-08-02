import { LANDING_FOOTER_CONTACT, LANDING_WHATSAPP } from "@/components/platform/landing/landing-social-data";
import { PLATFORM_AGENT_WEBSITE } from "@/lib/partner-entity/platform-agent";
import { SITE_CONTACT_EMAIL, SITE_NAME } from "@/lib/seo/site-config";

export const privacyPolicyMeta = {
  path: "/politica-privacidad",
  title: "Política de Privacidad y Protección de Datos Personales",
  lastUpdated: "2026-07-08",
  lawReference: "Ley N° 21.719 sobre Protección de Datos Personales",
  lawFullVigencyDate: "1 de diciembre de 2026",
} as const;

export const privacyPolicySections = [
  {
    id: "ley-21719",
    title: "¿De qué trata la Ley N° 21.719?",
    paragraphs: [
      `La ${privacyPolicyMeta.lawReference} regula cómo las empresas, organismos públicos y personas que traten datos personales deben recolectar, usar, almacenar, comunicar y eliminar información relativa a personas naturales identificadas o identificables en Chile.`,
      `Su objetivo es proteger la privacidad y los derechos de las personas frente al uso de su información, exigiendo tratamientos lícitos, transparentes, seguros y responsables. La norma entrará en plena vigencia el ${privacyPolicyMeta.lawFullVigencyDate}, fecha a partir de la cual las obligaciones de cumplimiento serán exigibles en su totalidad.`,
      `${SITE_NAME} adopta de manera anticipada los principios y estándares de esta ley en sus procesos de cotización, comparación y contacto con usuarios.`,
    ],
  },
  {
    id: "responsable",
    title: "Responsable del tratamiento",
    paragraphs: [
      `El responsable del tratamiento de los datos personales recabados a través de ${PLATFORM_AGENT_WEBSITE} es ${SITE_NAME}.`,
      `Para consultas relacionadas con privacidad y protección de datos puede contactarnos en ${SITE_CONTACT_EMAIL} o al teléfono ${LANDING_WHATSAPP.display}, en horario de atención de lunes a viernes de 9:00 a 18:00 hrs.`,
    ],
  },
  {
    id: "datos-recopilados",
    title: "Datos personales que podemos tratar",
    paragraphs: [
      "Según el servicio que utilice, podemos tratar las siguientes categorías de datos:",
    ],
    list: [
      "Datos de identificación y contacto: nombre, RUT, correo electrónico, teléfono y región.",
      "Datos demográficos y de cotización: edad, sexo, ingreso, cargas familiares y preferencias de planes.",
      "Datos de navegación y uso: dirección IP, tipo de dispositivo, navegador, páginas visitadas, cookies y eventos de interacción.",
      "Datos derivados de solicitudes de cotización o contacto con asesores vinculados al cotizador.",
    ],
  },
  {
    id: "finalidades",
    title: "Finalidades del tratamiento",
    paragraphs: [
      "Tratamos datos personales para fines determinados, explícitos y legítimos, entre ellos:",
    ],
    list: [
      "Permitir la cotización, comparación y visualización de planes de salud e Isapre.",
      "Derivar solicitudes a entidades aliadas y asesores vinculados a la plataforma cuando usted lo solicite.",
      "Responder consultas, brindar asesoría y dar seguimiento comercial autorizado.",
      "Mejorar la experiencia del sitio, medir desempeño y mantener la seguridad de la plataforma.",
      "Cumplir obligaciones legales, resolver reclamos y atender requerimientos de autoridad.",
    ],
  },
  {
    id: "principios",
    title: "Principios que aplicamos",
    paragraphs: [
      "En línea con la Ley 21.719 y buenas prácticas de protección de datos, aplicamos los siguientes principios:",
    ],
    list: [
      "Licitud y lealtad: solo tratamos datos cuando existe una base legal o su consentimiento, según corresponda.",
      "Finalidad: usamos la información para los fines informados y no para propósitos incompatibles.",
      "Proporcionalidad y minimización: solicitamos únicamente los datos necesarios para cada servicio.",
      "Calidad y exactitud: procuramos mantener datos actualizados y corregir errores cuando se nos informen.",
      "Transparencia: informamos de manera clara cómo tratamos los datos personales.",
      "Seguridad y confidencialidad: adoptamos medidas técnicas y organizativas para resguardar la información.",
      "Responsabilidad y rendición de cuentas: revisamos periódicamente nuestros procesos de tratamiento.",
    ],
  },
  {
    id: "derechos",
    title: "Derechos de los titulares de datos",
    paragraphs: [
      "Usted tiene derecho a solicitar, entre otros, lo siguiente respecto de sus datos personales:",
    ],
    list: [
      "Acceso: conocer qué datos tratamos y obtener información sobre su origen y uso.",
      "Rectificación: corregir datos inexactos, incompletos o desactualizados.",
      "Supresión: solicitar la eliminación cuando corresponda conforme a la ley.",
      "Oposición: oponerse a determinados tratamientos en los casos previstos legalmente.",
      "Portabilidad y bloqueo: cuando la normativa lo habilite, solicitar la entrega o restricción del tratamiento.",
      "Revocación del consentimiento: cuando el tratamiento se base en consentimiento, sin afectar tratamientos previos lícitos.",
    ],
    paragraphsAfter: [
      `Para ejercer sus derechos, escriba a ${SITE_CONTACT_EMAIL} indicando su nombre, RUT y el derecho que desea ejercer. Responderemos dentro de los plazos que establezca la normativa vigente.`,
    ],
  },
  {
    id: "cesion",
    title: "Comunicación y encargados del tratamiento",
    paragraphs: [
      "Podemos compartir datos con proveedores y aliados que nos ayudan a operar el servicio, por ejemplo:",
    ],
    list: [
      "Plataformas de hosting, analítica, correo electrónico y herramientas de atención.",
      "Compañías de salud previsional y aseguradoras, cuando usted solicite cotizar o contratar.",
      "Asesores o partners comerciales autorizados para dar seguimiento a su solicitud.",
    ],
    paragraphsAfter: [
      "Estos terceros solo reciben la información necesaria para cumplir la finalidad solicitada y deben aplicar medidas de seguridad y confidencialidad acordes a la ley.",
    ],
  },
  {
    id: "conservacion",
    title: "Plazo de conservación y seguridad",
    paragraphs: [
      "Conservamos los datos personales solo durante el tiempo necesario para cumplir las finalidades informadas, las obligaciones legales aplicables y la resolución de eventuales controversias.",
      "Implementamos controles de acceso, cifrado en tránsito cuando corresponde, respaldos y procedimientos internos para prevenir accesos no autorizados, pérdida o alteración de la información.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies y tecnologías similares",
    paragraphs: [
      "Utilizamos cookies y tecnologías similares para recordar preferencias, medir audiencia y mejorar el funcionamiento del sitio. Puede configurar su navegador para bloquear o eliminar cookies; algunas funciones del cotizador podrían verse limitadas.",
    ],
  },
  {
    id: "actualizaciones",
    title: "Actualizaciones de esta política",
    paragraphs: [
      `Podemos actualizar esta política para reflejar cambios legales, técnicos o de nuestros servicios. Publicaremos la versión vigente en ${PLATFORM_AGENT_WEBSITE}${privacyPolicyMeta.path} indicando la fecha de última actualización.`,
      `Última actualización: ${privacyPolicyMeta.lastUpdated}.`,
    ],
  },
] as const;

export const privacyPolicyContactCta = {
  id: "contacto-dudas",
  eyebrow: "¿Tienes dudas?",
  title: "Ejerce tus derechos o contáctanos",
  description:
    "Si deseas acceder, rectificar o eliminar tus datos personales, escríbenos y responderemos conforme a los plazos de la Ley N° 21.719.",
} as const;

export function getPrivacyPolicyWhatsAppUrl(): string {
  return LANDING_FOOTER_CONTACT.whatsappHref;
}
