"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  EMPRESAS_HERO_VIDEOS,
  EMPRESAS_TYPEWRITER_PHRASES,
  EMPRESAS_WHATSAPP_MESSAGE,
} from "@/constants/empresas";
import { getWhatsAppUrl } from "@/constants/site";
import { BackgroundSlideshow } from "@/components/ui/BackgroundSlideshow";
import { TypewriterText } from "@/components/ui/TypewriterText";

export function EmpresasHeroSection() {
  const reducedMotion = useReducedMotion();
  const whatsappUrl = getWhatsAppUrl(EMPRESAS_WHATSAPP_MESSAGE);

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden">
      <BackgroundSlideshow videos={EMPRESAS_HERO_VIDEOS} intervalMs={8000} />

      <div className="relative z-10 flex flex-1 items-center px-5 py-20 sm:px-8 sm:py-16 lg:px-10 xl:px-16">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto flex w-full max-w-7xl flex-col items-center text-center text-white lg:items-start lg:text-left"
        >
          <h1 className="text-hero text-balance font-heading font-extrabold tracking-tight">
            Isapres Premium:
          </h1>
          <p className="mt-4 text-hero-sub font-heading font-semibold capitalize tracking-tight sm:mt-5">
            <TypewriterText phrases={EMPRESAS_TYPEWRITER_PHRASES} />
          </p>

          <motion.a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={reducedMotion ? undefined : { scale: 1.05 }}
            whileTap={reducedMotion ? undefined : { scale: 0.97 }}
            className="mt-10 inline-flex min-h-12 items-center justify-center rounded-full bg-brand-teal px-10 py-3.5 text-base font-semibold text-white shadow-lg transition-shadow hover:bg-brand-teal-dark hover:shadow-xl"
          >
            WhatsApp
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
