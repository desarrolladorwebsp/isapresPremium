"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { PartnerEntityPublic } from "@/types/partner-entity";
import { LandingPartnerLogo } from "./landing-partner-logo";
import { LandingSectionBackdrop } from "./landing-section-backdrop";
import {
  LANDING_PARTNERS,
  type LandingPartner,
} from "./landing-partners-data";
import { LANDING_SECTION_BACKGROUNDS, LANDING_SECTION_BACKGROUND_ALTS } from "./landing-visual-config";
import { landing } from "./landing-tokens";

interface LandingPartnersSectionProps {
  partners?: PartnerEntityPublic[];
}

function mergePartnerLogos(
  staticPartners: LandingPartner[],
  dbPartners: PartnerEntityPublic[] = [],
): LandingPartner[] {
  return staticPartners.map((partner) => {
    const match = dbPartners.find((p) => p.slug === partner.slug);
    if (!match?.logoUrl) return partner;
    return { ...partner, logoUrl: match.logoUrl };
  });
}

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 280, damping: 28 },
  },
};

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        d="M11 3h6v6M17 3l-8.5 8.5M6 5H4a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VerifiedIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        d="M10 2.5l5.5 2.75v5.25c0 3.5-2.33 6.77-5.5 7.75-3.17-.98-5.5-4.25-5.5-7.75V5.25L10 2.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.5 10l1.75 1.75L12.5 8.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PartnerCard({
  partner,
  reducedMotion,
}: {
  partner: LandingPartner;
  reducedMotion: boolean;
}) {
  return (
    <motion.article
      variants={itemVariants}
      whileHover={
        reducedMotion
          ? undefined
          : {
              y: -6,
              transition: { type: "spring", stiffness: 400, damping: 28 },
            }
      }
      className="group landing-partner-card landing-glass-panel-strong relative flex h-full flex-col overflow-hidden rounded-3xl p-6 sm:p-7"
    >
      {/* Acento de marca */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 opacity-80 transition-opacity group-hover:opacity-100"
        style={{ background: partner.accentColor }}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-4">
        <div className="landing-partner-logo-wrap relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
          <LandingPartnerLogo partner={partner} />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-dark">
          <VerifiedIcon className="h-3 w-3 text-primary" />
          {partner.badge}
        </span>
      </div>

      <div className="mt-5 flex flex-1 flex-col">
        <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {partner.name}
        </h3>
        <p className="mt-1 text-xs font-medium text-muted">{partner.domain}</p>
        <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">
          {partner.description}
        </p>

        <motion.a
          href={partner.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={reducedMotion ? undefined : { x: 2 }}
          whileTap={reducedMotion ? undefined : { scale: 0.98 }}
          className="group/btn mt-6 inline-flex items-center gap-2 self-start rounded-xl border border-border/80 bg-background/80 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        >
          Visitar sitio
          <ExternalLinkIcon className="h-4 w-4 text-muted transition-all group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 group-hover/btn:text-primary" />
        </motion.a>
      </div>
    </motion.article>
  );
}

export function LandingPartnersSection({
  partners = [],
}: LandingPartnersSectionProps) {
  const reducedMotion = useReducedMotion();
  const items = mergePartnerLogos(LANDING_PARTNERS, partners);

  return (
    <section
      id="socios"
      className={`${landing.sectionSurface} landing-section-with-photo relative overflow-hidden`}
      aria-labelledby="landing-partners-title"
    >
      <LandingSectionBackdrop
        imageSrc={LANDING_SECTION_BACKGROUNDS.partners}
        imageAlt={LANDING_SECTION_BACKGROUND_ALTS.partners}
        variant="partners"
      />
      <div className="landing-partners-mesh pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="landing-grid-pattern pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      <div className={`${landing.container} relative py-20 sm:py-24 lg:py-28`}>
        <motion.div
          initial={reducedMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={sectionVariants}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.span variants={itemVariants} className={landing.badge}>
            Red de asesoría
          </motion.span>
          <motion.h2
            id="landing-partners-title"
            variants={itemVariants}
            className="landing-text-gradient mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Una red de expertos a tu servicio
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed premium-text-secondary sm:text-lg"
          >
            Trabajamos junto a plataformas especializadas en salud prepaga para
            entregarte una mejor experiencia, comparaciones precisas y una
            asesoría de calidad en cada paso de tu decisión.
          </motion.p>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={sectionVariants}
          className="mt-14 grid gap-6 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8"
        >
          {items.map((partner) => (
            <PartnerCard
              key={partner.slug}
              partner={partner}
              reducedMotion={!!reducedMotion}
            />
          ))}
        </motion.div>

        <motion.p
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mx-auto mt-12 max-w-xl text-center text-xs leading-relaxed text-muted sm:text-sm"
        >
          Cada plataforma asociada cuenta con equipos de asesores certificados
          que complementan nuestra red de confianza en salud prepaga.
        </motion.p>
      </div>
    </section>
  );
}
