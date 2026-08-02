"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { landing } from "./landing-tokens";
import { LandingLogo } from "./landing-logo";
import {
  LANDING_FOOTER_CONTACT,
  LANDING_FOOTER_DESCRIPTION,
  LANDING_FOOTER_NAV,
  LANDING_FOOTER_SMARTPRO_LABEL,
  LANDING_FOOTER_SMARTPRO_LOGO,
  LANDING_FOOTER_SMARTPRO_URL,
  LANDING_FOOTER_SOCIAL,
} from "./landing-social-data";
import { LandingSocialNetworkIcon } from "./landing-social-icons";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 280, damping: 30, delay },
  }),
};

function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 8l9 6 9-6M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 21s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}

function FooterSectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary sm:text-xs">
      {children}
    </p>
  );
}

function FooterNavLink({
  href,
  label,
  reducedMotion,
}: {
  href: string;
  label: string;
  reducedMotion: boolean;
}) {
  return (
    <motion.li whileHover={reducedMotion ? undefined : { x: 4 }}>
      <a
        href={href}
        className="group inline-flex min-h-9 w-full items-center gap-2 rounded-lg px-1 py-1.5 text-sm premium-text-secondary transition-colors hover:bg-secondary-muted/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:min-h-0 sm:w-auto sm:px-0 sm:py-0 sm:hover:bg-transparent"
      >
        <span className="h-1 w-1 shrink-0 rounded-full bg-primary/40 transition-all group-hover:w-2 group-hover:bg-primary" aria-hidden />
        {label}
      </a>
    </motion.li>
  );
}

function SocialLink({
  id,
  label,
  href,
  reducedMotion,
}: {
  id: string;
  label: string;
  href: string;
  reducedMotion: boolean;
}) {
  const isWhatsApp = id === "whatsapp";

  return (
    <motion.a
      href={href}
      aria-label={label}
      title={label}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={
        reducedMotion
          ? undefined
          : { y: -3, scale: 1.06, transition: { type: "spring", stiffness: 400, damping: 22 } }
      }
      whileTap={reducedMotion ? undefined : { scale: 0.96 }}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-10 sm:w-10 ${
        isWhatsApp
          ? "border-[#25D366]/30 bg-[#25D366] text-white hover:brightness-105"
          : "border-border/80 bg-background/80 text-muted hover:border-primary/30 hover:bg-secondary-muted hover:text-primary"
      }`}
    >
      <LandingSocialNetworkIcon id={id} className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
    </motion.a>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
  external,
  reducedMotion,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
  reducedMotion: boolean;
}) {
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary-muted text-primary sm:h-10 sm:w-10">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium text-muted sm:text-xs">{label}</span>
        <span className="block break-words text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {value}
        </span>
      </span>
    </>
  );

  const className =
    "group flex items-center gap-2.5 rounded-xl border border-transparent p-1.5 transition-colors hover:border-border/80 hover:bg-secondary-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:gap-3 sm:rounded-2xl sm:p-2";

  if (href) {
    return (
      <motion.li whileHover={reducedMotion ? undefined : { x: 4 }}>
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className={className}
        >
          {content}
        </a>
      </motion.li>
    );
  }

  return (
    <li>
      <div className={className}>{content}</div>
    </li>
  );
}

export function LandingFooter() {
  const reducedMotion = useReducedMotion();
  const motionProps = (delay: number) =>
    reducedMotion
      ? {}
      : {
          initial: "hidden" as const,
          whileInView: "visible" as const,
          viewport: { once: true, margin: "-40px" },
          custom: delay,
          variants: fadeUp,
        };

  return (
    <footer
      id="contacto"
      className={`${landing.sectionSurface} relative overflow-hidden border-t border-border/80`}
      aria-labelledby="landing-footer-heading"
    >
      <div className="landing-footer-mesh pointer-events-none absolute inset-0" aria-hidden />
      <div className="landing-grid-pattern pointer-events-none absolute inset-0 opacity-20" aria-hidden />

      <div className={`${landing.container} relative py-10 sm:py-16 lg:py-20`}>
        <h2 id="landing-footer-heading" className="sr-only">
          Pie de página — Cotizador Premium
        </h2>

        <div className="grid gap-8 sm:gap-10 lg:grid-cols-12 lg:gap-10">
          {/* Marca + redes */}
          <motion.div {...motionProps(0)} className="lg:col-span-5">
            <div className="flex flex-col gap-4 sm:gap-5">
              <Link href="/inicio" className="inline-flex items-center gap-3">
                <LandingLogo size="lg" className="rounded-2xl" />
                <div className="min-w-0">
                  <p className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                    Cotizador Premium
                  </p>
                  <p className="text-xs text-muted">Salud prepaga en Chile</p>
                </div>
              </Link>

              <p className="max-w-md text-sm leading-relaxed premium-text-secondary">
                {LANDING_FOOTER_DESCRIPTION}
              </p>

              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {LANDING_FOOTER_SOCIAL.map((social) => (
                  <SocialLink
                    key={social.id}
                    {...social}
                    reducedMotion={!!reducedMotion}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Navegación + contacto — lado a lado en móvil para aprovechar ancho */}
          <div className="grid grid-cols-1 gap-8 min-[480px]:grid-cols-2 sm:gap-10 lg:col-span-7 lg:grid-cols-2 lg:gap-10">
            <motion.nav {...motionProps(0.08)} aria-label="Enlaces rápidos">
              <FooterSectionTitle>Navegación</FooterSectionTitle>
              <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-0.5 sm:mt-4 sm:grid-cols-1 sm:space-y-2 sm:gap-y-0 lg:space-y-3">
                {LANDING_FOOTER_NAV.map((item) => (
                  <FooterNavLink
                    key={item.href}
                    {...item}
                    reducedMotion={!!reducedMotion}
                  />
                ))}
              </ul>
            </motion.nav>

            <motion.div {...motionProps(0.16)}>
              <FooterSectionTitle>Contacto</FooterSectionTitle>
              <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
                <ContactRow
                  icon={<MailIcon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />}
                  label="Correo"
                  value={LANDING_FOOTER_CONTACT.email}
                  href={`mailto:${LANDING_FOOTER_CONTACT.email}`}
                  reducedMotion={!!reducedMotion}
                />
                <ContactRow
                  icon={
                    <LandingSocialNetworkIcon
                      id="whatsapp"
                      className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
                    />
                  }
                  label="WhatsApp"
                  value={LANDING_FOOTER_CONTACT.whatsapp}
                  href={LANDING_FOOTER_CONTACT.whatsappHref}
                  external
                  reducedMotion={!!reducedMotion}
                />
                <ContactRow
                  icon={<PinIcon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />}
                  label="Ubicación"
                  value={LANDING_FOOTER_CONTACT.location}
                  reducedMotion={!!reducedMotion}
                />
              </ul>
            </motion.div>
          </div>
        </div>

        <motion.div
          {...motionProps(0.24)}
          className="mt-8 border-t border-border/80 pt-6 sm:mt-12 sm:pt-8"
        >
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:gap-3 sm:text-left">
            <p className="text-xs text-muted sm:text-sm">
              © 2026 Cotizador Premium. Todos los derechos reservados.
            </p>
            <p className="flex flex-col items-center gap-2 text-xs text-muted min-[480px]:flex-row min-[480px]:flex-wrap min-[480px]:justify-center sm:justify-end sm:text-sm">
              <span className="shrink-0">Desarrollado por</span>
              <a
                href={LANDING_FOOTER_SMARTPRO_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={LANDING_FOOTER_SMARTPRO_LABEL}
                title={LANDING_FOOTER_SMARTPRO_LABEL}
                className="inline-flex items-center rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Image
                  src={LANDING_FOOTER_SMARTPRO_LOGO}
                  alt={LANDING_FOOTER_SMARTPRO_LABEL}
                  width={140}
                  height={40}
                  className="h-7 w-auto object-contain sm:h-9"
                />
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
