"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { NOSOTROS_CTA, NOSOTROS_TRUST_BAR } from "@/constants/nosotros";

export function NosotrosCtaSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="bg-[#f4f7f6] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24 xl:px-16"
      aria-labelledby="nosotros-cta-heading"
    >
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-brand-teal-dark via-brand-teal to-[#0d8a78] shadow-2xl shadow-brand-teal/20"
        >
          <div className="grid items-stretch lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="relative min-h-[220px] sm:min-h-[280px] lg:min-h-full">
              <Image
                src={NOSOTROS_CTA.image}
                alt={NOSOTROS_CTA.imageAlt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent to-brand-teal-dark/40 lg:bg-gradient-to-l lg:from-transparent lg:to-brand-teal-dark/50"
                aria-hidden
              />
            </div>

            <div className="flex flex-col justify-center px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-12 lg:py-14">
              <h2
                id="nosotros-cta-heading"
                className="max-w-xl text-balance font-heading text-[clamp(1.6rem,1.25rem+1.2vw,2.35rem)] font-extrabold leading-tight tracking-tight"
              >
                {NOSOTROS_CTA.heading}
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
                {NOSOTROS_CTA.description}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <motion.a
                  href={NOSOTROS_CTA.primaryCta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={reducedMotion ? undefined : { scale: 1.03 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-green px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#00a383] sm:text-base"
                >
                  {NOSOTROS_CTA.primaryCta.label}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </motion.a>
                <motion.a
                  href={NOSOTROS_CTA.secondaryCta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={reducedMotion ? undefined : { scale: 1.03 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/40 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10 sm:text-base"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  {NOSOTROS_CTA.secondaryCta.label}
                </motion.a>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 grid gap-4 rounded-2xl border border-brand-teal/10 bg-white px-5 py-5 sm:grid-cols-3 sm:gap-3 sm:px-6">
          {NOSOTROS_TRUST_BAR.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 text-sm text-zinc-600"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-teal/10 text-brand-teal">
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </div>
                <span className="font-medium leading-snug">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
