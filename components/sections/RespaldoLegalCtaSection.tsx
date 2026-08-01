"use client";

import { Mail } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { RESPALDO_LEGAL_CTA } from "@/constants/respaldo-legal";
import { getWhatsAppUrl, siteConfig } from "@/constants/site";

export function RespaldoLegalCtaSection() {
  const reducedMotion = useReducedMotion();
  const whatsappUrl = getWhatsAppUrl(RESPALDO_LEGAL_CTA.whatsappMessage);

  return (
    <section
      className="relative overflow-hidden bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24"
      aria-labelledby="respaldo-legal-cta-heading"
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-green/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-brand-teal/5 blur-3xl"
        aria-hidden="true"
      />

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 24 }}
        whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <p className="text-eyebrow font-bold uppercase tracking-widest text-brand-teal">
          {RESPALDO_LEGAL_CTA.eyebrow}
        </p>
        <h2
          id="respaldo-legal-cta-heading"
          className="mt-3 text-h2 text-balance font-heading font-bold tracking-tight text-zinc-900"
        >
          {RESPALDO_LEGAL_CTA.heading}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-body-lg leading-relaxed text-zinc-500">
          {RESPALDO_LEGAL_CTA.description}
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <motion.a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={reducedMotion ? undefined : { scale: 1.05 }}
            whileTap={reducedMotion ? undefined : { scale: 0.97 }}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-shadow hover:shadow-xl sm:w-auto sm:text-base"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Escríbenos por WhatsApp
          </motion.a>

          <motion.a
            href={`mailto:${siteConfig.contact.email}`}
            whileHover={reducedMotion ? undefined : { scale: 1.05 }}
            whileTap={reducedMotion ? undefined : { scale: 0.97 }}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-brand-teal/25 bg-white px-8 py-3.5 text-sm font-semibold text-brand-teal-dark shadow-sm transition-colors hover:border-brand-teal/40 hover:bg-brand-green/5 sm:w-auto sm:text-base"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Envíanos un correo
          </motion.a>
        </div>

        <p className="mt-6 text-sm text-zinc-500">
          ¿Aún no tienes plan con nosotros?{" "}
          <a
            href={siteConfig.cotizadorUrl}
            className="font-semibold text-brand-teal underline underline-offset-4 transition-colors hover:text-brand-teal-dark"
          >
            Cotiza tu Isapre
          </a>{" "}
          y activa tu respaldo legal.
        </p>
      </motion.div>
    </section>
  );
}
