"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { SocialIcons } from "@/components/ui/SocialIcons";
import { FOOTER_MARKET_INDICATORS, FOOTER_SITEMAP_LINKS } from "@/constants/footer";
import { SOCIAL_LINKS, siteConfig } from "@/constants/site";

export function Footer() {
  const reducedMotion = useReducedMotion();
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-gradient-to-br from-brand-teal-dark via-brand-teal to-brand-teal-dark text-white">
      <div
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-green/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.8fr_1fr] lg:gap-10">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Link href="/" className="inline-flex">
              <Image
                src="/logo-isapres-premium.png"
                alt="Isapres Premium"
                width={220}
                height={78}
                className="h-14 w-auto object-contain"
              />
            </Link>

            <div className="mt-6 space-y-3">
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="flex items-center gap-2.5 text-sm text-white/85 transition-colors hover:text-white"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Mail className="h-4 w-4" />
                </span>
                {siteConfig.contact.email}
              </a>
              <a
                href={`tel:${siteConfig.contact.phone.replace(/\s+/g, "")}`}
                className="flex items-center gap-2.5 text-sm text-white/85 transition-colors hover:text-white"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Phone className="h-4 w-4" />
                </span>
                {siteConfig.contact.phone}
              </a>
            </div>

            <SocialIcons
              links={SOCIAL_LINKS}
              className="mt-5 flex items-center gap-1 text-white/90"
              iconClassName="h-5 w-5"
              linkClassName="hover:bg-white/10"
            />
          </motion.div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          >
            <h3 className="text-eyebrow font-bold uppercase tracking-wider text-brand-green">
              Mapa del sitio
            </h3>
            <ul className="mt-5 space-y-1.5">
              {FOOTER_SITEMAP_LINKS.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("http") ? (
                    <a
                      href={link.href}
                      className="group flex min-h-11 items-center gap-3 rounded-xl py-1.5 pr-2 transition-transform duration-200 motion-safe:hover:translate-x-1"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-brand-green transition-colors duration-200 group-hover:bg-brand-green group-hover:text-white">
                        <link.icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm text-white/85 transition-colors duration-200 group-hover:text-white">
                        {link.label}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-white/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="group flex min-h-11 items-center gap-3 rounded-xl py-1.5 pr-2 transition-transform duration-200 motion-safe:hover:translate-x-1"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-brand-green transition-colors duration-200 group-hover:bg-brand-green group-hover:text-white">
                        <link.icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm text-white/85 transition-colors duration-200 group-hover:text-white">
                        {link.label}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-white/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          >
            <p className="text-sm leading-relaxed text-white/80 sm:text-base">
              Accede a planes de salud premium en isapres con la mejor cobertura y
              beneficios exclusivos para ti y tu familia.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {FOOTER_MARKET_INDICATORS.map((indicator) => (
                <div
                  key={indicator.label}
                  className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-inset ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/15"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-green">
                    {indicator.label}
                  </p>
                  <p className="mt-1 font-heading text-lg font-bold tracking-tight text-white">
                    {indicator.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-white/50">
              Valores referenciales, revisa el valor oficial vigente en sii.cl
            </p>
          </motion.div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-white/60">
            © {year} {siteConfig.name}. Todos los derechos reservados.
          </p>
          <p className="text-xs text-white/60">
            Asesoría independiente en planes de salud Isapre en Chile.
          </p>
        </div>
      </div>
    </footer>
  );
}
