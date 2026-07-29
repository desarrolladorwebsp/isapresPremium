import type { Metadata } from "next";
import { siteConfig } from "@/constants/site";
import { createPageMetadata } from "@/constants/seo";

export const metadata: Metadata = createPageMetadata("politicas");

const SECTIONS = [
  {
    title: "1. Información que recopilamos",
    body: "Recopilamos los datos que nos entregas voluntariamente a través de nuestro cotizador y formularios de contacto, tales como nombre, RUT, edad, correo electrónico, teléfono, región de residencia, previsión actual, cargas médicas y renta imponible aproximada. Esta información es necesaria para poder asesorarte y cotizar planes de salud a tu medida.",
  },
  {
    title: "2. Uso de la información",
    body: "Utilizamos tus datos exclusivamente para contactarte, evaluar alternativas de planes de salud, entregarte asesoría personalizada y dar seguimiento a tu solicitud. No vendemos ni cedemos tu información a terceros no relacionados con la prestación de este servicio.",
  },
  {
    title: "3. Protección de datos",
    body: "Adoptamos medidas de seguridad razonables, tanto técnicas como organizativas, para proteger tus datos personales frente a accesos no autorizados, pérdida o uso indebido, conforme a la Ley N.º 19.628 sobre Protección de la Vida Privada.",
  },
  {
    title: "4. Tus derechos",
    body: "Puedes solicitar en cualquier momento el acceso, rectificación, actualización o eliminación de tus datos personales, escribiéndonos directamente a nuestro correo de contacto.",
  },
  {
    title: "5. Cambios a esta política",
    body: "Esta política puede actualizarse periódicamente para reflejar mejoras en nuestros procesos o cambios normativos. Te recomendamos revisar esta página de tanto en tanto.",
  },
] as const;

export default function PoliticasPage() {
  return (
    <main className="flex-1 bg-white">
      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <p className="text-eyebrow font-semibold uppercase tracking-widest text-brand-green">
          Legal
        </p>
        <h1 className="mt-4 text-display font-heading font-bold tracking-tight text-zinc-900">
          Política de Privacidad
        </h1>
        <p className="mt-5 text-body-lg leading-relaxed text-zinc-600">
          En {siteConfig.name} valoramos tu confianza. Esta política explica
          qué datos recopilamos, cómo los usamos y cuáles son tus derechos
          como titular de la información.
        </p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-h3 font-heading font-bold tracking-tight text-zinc-900">
                {section.title}
              </h2>
              <p className="mt-2 text-base leading-relaxed text-zinc-600">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-zinc-50 p-6 sm:p-8">
          <h2 className="text-h3 font-heading font-bold tracking-tight text-zinc-900">
            ¿Tienes dudas sobre tus datos?
          </h2>
          <p className="mt-2 text-base leading-relaxed text-zinc-600">
            Escríbenos a{" "}
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className="font-semibold text-brand-teal hover:underline"
            >
              {siteConfig.contact.email}
            </a>{" "}
            y con gusto resolveremos cualquier consulta.
          </p>
        </div>
      </section>
    </main>
  );
}
