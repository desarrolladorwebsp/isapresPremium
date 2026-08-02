"use client";

import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

import { landing } from "@/components/platform/landing/landing-tokens";
import { PrivacyPolicyContactCta } from "@/components/platform/privacy-policy/privacy-policy-contact-cta";
import {
  CookieIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  LockIcon,
  RefreshIcon,
  ScaleIcon,
  ShareIcon,
  ShieldCheckIcon,
  ShieldIcon,
  TargetIcon,
  UserCheckIcon,
} from "@/components/platform/privacy-policy/privacy-policy-icons";
import { PrivacyPolicySectionCard } from "@/components/platform/privacy-policy/privacy-policy-section-card";
import {
  privacyPolicyContactCta,
  privacyPolicyMeta,
  privacyPolicySections,
} from "@/constants/privacy-policy";
import { SITE_CONTACT_EMAIL, SITE_NAME } from "@/lib/seo/site-config";

const sectionIcons = {
  "ley-21719": ScaleIcon,
  responsable: ShieldIcon,
  "datos-recopilados": DatabaseIcon,
  finalidades: TargetIcon,
  principios: ShieldCheckIcon,
  derechos: UserCheckIcon,
  cesion: ShareIcon,
  conservacion: LockIcon,
  cookies: CookieIcon,
  actualizaciones: RefreshIcon,
} as const;

export function PoliticaPrivacidadView() {
  const pageRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(pageRef, { once: true, margin: "-8%" });
  const reducedMotion = useReducedMotion();

  return (
    <div ref={pageRef} className="relative overflow-hidden">
      <div className="landing-grid-pattern pointer-events-none absolute inset-0 opacity-20" aria-hidden />

      <section className={`${landing.container} relative py-12 sm:py-16 lg:py-20`}>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)] lg:gap-14 xl:gap-16">
          <motion.aside
            className="lg:sticky lg:top-28 lg:self-start"
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={isInView && !reducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            <nav
              aria-label="Contenido de la política de privacidad"
              className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm backdrop-blur-sm sm:p-5"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
                En esta página
              </p>
              <ul className="space-y-1.5" role="list">
                {privacyPolicySections.map((section, index) => (
                  <motion.li
                    key={section.id}
                    initial={false}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 280,
                      damping: 30,
                      delay: reducedMotion ? 0 : 0.04 * index,
                    }}
                  >
                    <a
                      href={`#${section.id}`}
                      className="block rounded-xl px-3 py-2 text-sm leading-snug text-muted transition-colors duration-200 hover:bg-primary/5 hover:text-primary"
                    >
                      {section.title}
                    </a>
                  </motion.li>
                ))}
                <motion.li
                  initial={false}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 30,
                    delay: reducedMotion ? 0 : 0.04 * privacyPolicySections.length,
                  }}
                >
                  <a
                    href={`#${privacyPolicyContactCta.id}`}
                    className="block rounded-xl px-3 py-2 text-sm leading-snug text-muted transition-colors duration-200 hover:bg-primary/5 hover:text-primary"
                  >
                    {privacyPolicyContactCta.eyebrow}
                  </a>
                </motion.li>
              </ul>
            </nav>
          </motion.aside>

          <div className="min-w-0">
            <motion.header
              className="mb-8 max-w-3xl space-y-5 sm:mb-10"
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={isInView && !reducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 30, delay: 0.05 }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Transparencia y cumplimiento legal
              </p>

              <h1 className={`${landing.headline} text-3xl sm:text-4xl lg:text-[2.5rem]`}>
                {privacyPolicyMeta.title}
              </h1>

              <div className="flex flex-wrap gap-2.5">
                <span className={landing.badge}>{privacyPolicyMeta.lawReference}</span>
                <span className="inline-flex items-center rounded-full border border-border/80 bg-background/70 px-3.5 py-1.5 text-xs font-semibold text-muted">
                  Vigencia plena: {privacyPolicyMeta.lawFullVigencyDate}
                </span>
              </div>

              <p className="text-base leading-relaxed premium-text-secondary sm:text-lg">
                En {SITE_NAME} tratamos sus datos personales conforme a la normativa chilena. Esta
                política explica cómo recopilamos, usamos y protegemos su información al cotizar y
                comparar planes en Chile.
              </p>

              <p className="text-sm premium-text-secondary">
                Última actualización:{" "}
                <time dateTime={privacyPolicyMeta.lastUpdated}>{privacyPolicyMeta.lastUpdated}</time>
              </p>
            </motion.header>

            <div className="space-y-5 sm:space-y-6">
              {privacyPolicySections.map((section, index) => {
                const Icon = sectionIcons[section.id as keyof typeof sectionIcons] ?? ShieldIcon;

                return (
                  <PrivacyPolicySectionCard
                    key={section.id}
                    section={section}
                    icon={Icon}
                    index={index}
                  />
                );
              })}
            </div>

            <div className="mt-5 sm:mt-6">
              <PrivacyPolicyContactCta />
            </div>

            <motion.footer
              className="mt-10 rounded-2xl border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur-sm sm:p-7"
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
            >
              <p className="text-sm leading-relaxed premium-text-secondary sm:text-base">
                Si tiene dudas sobre el tratamiento de sus datos, contáctenos en{" "}
                <a
                  href={`mailto:${SITE_CONTACT_EMAIL}`}
                  className="font-semibold text-primary transition-colors hover:underline"
                >
                  {SITE_CONTACT_EMAIL}
                </a>
                . También puede consultar el texto oficial de la norma en el{" "}
                <a
                  href="https://www.bcn.cl/leychile/navegar?idNorma=1203407"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-primary transition-colors hover:underline"
                >
                  Biblioteca del Congreso Nacional de Chile
                  <ExternalLinkIcon className="h-3.5 w-3.5" />
                </a>
                .
              </p>
              <p className="mt-5 text-sm premium-text-secondary">
                <Link
                  href="/inicio"
                  className="inline-flex items-center font-semibold text-primary transition-opacity hover:opacity-80"
                >
                  ← Volver al inicio
                </Link>
              </p>
            </motion.footer>
          </div>
        </div>
      </section>
    </div>
  );
}
