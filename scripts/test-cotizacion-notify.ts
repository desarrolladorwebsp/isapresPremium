import path from "path";
import { config } from "dotenv";
import { parseCotizacionNotifyInput } from "../lib/email/cotizacion-notify-schema";
import { sendCotizacionNotifyEmails } from "../lib/email/send-cotizacion-notify";
import { buildMiCotizacionShareUrl } from "../lib/cotizacion-notify/mi-cotizacion-share";
import {
  buildIsaprePremiumPartnerRecord,
  ISAPRE_PREMIUM_AGENT_KEY,
} from "../lib/partner-entity/isapre-premium-agent";
import { resolveAppBaseUrl } from "../lib/platform/routing";

config({ path: path.join(process.cwd(), ".env.local") });

const email = process.argv[2] ?? "usuario@correo.cl";
const partner = buildIsaprePremiumPartnerRecord();
const planCode = "13-CORE101-26";

const basePayload = {
  email,
  region: "Región Metropolitana",
  edad: 35,
  sexo: "Masculino",
  ingreso: "1500000",
  cargas: [8, 12],
  busqueda: planCode,
  orden: "Menor precio",
  moneda: "clp" as const,
  isapres: ["Consalud", "Banmédica"],
  plan: {
    codigo: planCode,
    id: "13-core101-26",
    nombre: "CORE 101",
    isapre: "Consalud",
    tipoPlan: "Libre Elección",
    precioUf: "1,160 UF",
    precioClp: "$47.314",
    precioBaseUf: "0,95 UF",
    gesPremiumUf: "0,73 UF",
    tieneTop: false,
    coberturaHospitalaria: 40,
    coberturaAmbulatoria: 60,
    clinicas: 28,
    totalBeneficiarios: 3,
    factoresRiesgo: 2.4,
  },
  solicitante: {
    nombre: "Alfredo Hurtado",
    rut: "12.345.678-9",
    telefono: "+56912345678",
    isapreActual: "Fonasa",
    notas: "Solicitud de asesoría de prueba — Isapres Premium",
  },
  cotizadorUrl: `${resolveAppBaseUrl()}/cotizador/mi-cotizacion`,
  partnerEntitySlug: ISAPRE_PREMIUM_AGENT_KEY,
  partnerEntityName: partner.name,
  partnerEntityTheme: partner.theme,
  partnerEntityLogoUrl: `${resolveAppBaseUrl()}${partner.logoUrl}`,
};

async function main() {
  const draft = parseCotizacionNotifyInput(basePayload);
  const data = parseCotizacionNotifyInput({
    ...draft,
    cotizadorUrl: buildMiCotizacionShareUrl(draft),
  });

  console.log("CTA Ver mi cotización:", data.cotizadorUrl);
  const result = await sendCotizacionNotifyEmails(data);

  console.log("Correos enviados:");
  console.log(`  - Usuario (${data.email}): ${result.userId}`);
  console.log(`  - Equipo: ${result.adminId}`);
}

main().catch((error) => {
  console.error("Error en prueba de cotización:", error);
  process.exit(1);
});
