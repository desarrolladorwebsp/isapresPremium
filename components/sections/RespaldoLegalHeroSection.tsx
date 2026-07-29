"use client";

import { Check, Mail, ShieldCheck, Star } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { BackgroundSlideshow } from "@/components/ui/BackgroundSlideshow";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import {
  RESPALDO_LEGAL_CTA,
  RESPALDO_LEGAL_HERO,
  RESPALDO_LEGAL_HERO_VIDEOS,
  RESPALDO_LEGAL_HERO_VIDEOS_MOBILE,
} from "@/constants/respaldo-legal";
import { getWhatsAppUrl, siteConfig } from "@/constants/site";

export function RespaldoLegalHeroSection() {
  const reducedMotion = useReducedMotion();
  const whatsappUrl = getWhatsAppUrl(RESPALDO_LEGAL_CTA.whatsappMessage);

  return (
    <section
      className="relative flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden"
      aria-labelledby="respaldo-legal-hero-heading"
    >
      <BackgroundSlideshow
        videos={RESPALDO_LEGAL_HERO_VIDEOS}
        mobileVideos={RESPALDO_LEGAL_HERO_VIDEOS_MOBILE}
        overlayClassName="bg-transparent"
      />

      {/* Mobile: soft white wash · Desktop: left panel for copy, video visible on the right */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 via-white/80 to-white/65 md:hidden"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-white via-white/92 to-transparent md:block"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 hidden bg-gradient-to-l from-brand-teal-dark/35 via-transparent to-transparent md:block"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-1 items-center px-5 py-16 sm:px-8 sm:py-20 lg:px-10 xl:px-16">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:gap-12 xl:gap-16">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-xl"
          >
            <div className="inline-flex items-center gap-2 rounded-md border border-amber-500/70 bg-white/80 px-3 py-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-brand-teal-dark shadow-sm backdrop-blur-sm sm:text-xs">
              <Star
                className="h-3.5 w-3.5 fill-amber-500 text-amber-500"
                aria-hidden="true"
              />
              {RESPALDO_LEGAL_HERO.badge}
            </div>

            <h1
              id="respaldo-legal-hero-heading"
              className="mt-5 text-hero text-balance font-heading font-extrabold tracking-tight text-brand-teal-dark"
            >
              <span className="block">{RESPALDO_LEGAL_HERO.headingLead}</span>
              <span className="mt-1 block text-brand-green">
                {RESPALDO_LEGAL_HERO.headingAccent}
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-body-lg leading-relaxed text-zinc-600">
              {RESPALDO_LEGAL_HERO.description}
            </p>

            <div className="mt-7 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-teal text-white shadow-md">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-brand-teal-dark sm:text-[0.9375rem]">
                  {RESPALDO_LEGAL_HERO.highlightTitle}
                </p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {RESPALDO_LEGAL_HERO.highlightSubtitle}
                </p>
              </div>
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <motion.a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={reducedMotion ? undefined : { scale: 1.04 }}
                whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-shadow hover:shadow-xl sm:text-base"
              >
                <WhatsAppIcon className="h-5 w-5" />
                WhatsApp
              </motion.a>

              <motion.a
                href={`mailto:${siteConfig.contact.email}`}
                whileHover={reducedMotion ? undefined : { scale: 1.04 }}
                whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-brand-teal/30 bg-white/80 px-7 py-3.5 text-sm font-semibold text-brand-teal-dark backdrop-blur-sm transition-colors hover:bg-white sm:text-base"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Escríbenos
              </motion.a>
            </div>
          </motion.div>

          <motion.aside
            initial={reducedMotion ? false : { opacity: 0, x: 28 }}
            animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
            transition={{ duration: 0.65, ease: "easeOut", delay: 0.15 }}
            className="lg:justify-self-end"
          >
            <div className="relative mx-auto max-w-md rounded-2xl bg-brand-teal-dark/95 p-6 text-white shadow-2xl backdrop-blur-md sm:p-8 lg:mx-0 lg:max-w-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
                <Check className="h-6 w-6 text-brand-green" strokeWidth={2.5} aria-hidden="true" />
              </div>

              <h2 className="mt-5 text-lg font-heading font-bold uppercase leading-snug tracking-wide sm:text-xl">
                {RESPALDO_LEGAL_HERO.cardTitle}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-[0.9375rem]">
                {RESPALDO_LEGAL_HERO.cardDescription}
              </p>
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}
