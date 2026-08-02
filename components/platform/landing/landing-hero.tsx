"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { LandingHeroFamilyVisual } from "./landing-hero-family-visual";
import { landing } from "./landing-tokens";

const TRUST_METRICS = [
  {
    id: "isapres",
    value: "7",
    label: "ISAPRES",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "asesorias",
    value: "10.000+",
    label: "asesorías",
    prefix: "Más de",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "certificados",
    value: "Asesores",
    label: "certificados",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 15l-2 5 2-1 2 1-2-5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 2a7 7 0 0 1 4 12.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26A7 7 0 0 1 12 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
      delay,
    },
  }),
};

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-5 w-5 transition-transform group-hover:translate-x-0.5"
      aria-hidden
    >
      <path
        d="M4 10h12M11 5l5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingHero({ cotizadorHref = "#cotizar" }: { cotizadorHref?: string }) {
  const reducedMotion = useReducedMotion();

  const motionProps = (delay: number) =>
    reducedMotion
      ? {}
      : {
          initial: "hidden" as const,
          animate: "visible" as const,
          custom: delay,
          variants: fadeUp,
        };

  return (
    <section
      className={`${landing.heroSection} landing-hero-with-backdrop relative min-h-0 lg:min-h-[calc(100vh-4.5rem)] lg:py-4`}
      id="inicio"
      aria-labelledby="landing-hero-title"
    >
      <div className={landing.heroInner}>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-10 xl:gap-14">
          {/* Copy — panel legible sobre el fondo ambiental */}
          <div className="relative z-10 max-w-2xl justify-self-center lg:justify-self-start">
            <div className="landing-hero-copy-panel rounded-3xl p-6 sm:p-8 lg:p-0 lg:rounded-none lg:bg-transparent lg:backdrop-blur-none">
              <motion.div {...motionProps(0)} className="flex justify-center lg:justify-start">
                <span className={landing.badge}>
                  <span className="relative flex h-2 w-2">
                    {!reducedMotion ? (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                    ) : null}
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  Asesoría Isapre · Chile
                </span>
              </motion.div>

              <motion.h1
                id="landing-hero-title"
                {...motionProps(0.08)}
                className={`${landing.headline} mt-6 text-center lg:text-left`}
              >
                El plan de salud que necesitas, con la confianza que mereces
              </motion.h1>

              <motion.p
                {...motionProps(0.16)}
                className={`${landing.subheadline} mx-auto text-center lg:mx-0 lg:text-left`}
              >
                Compara precios y coberturas de las principales Isapres en segundos.
                Nuestros expertos te acompañan para elegir la mejor opción para ti
                y tu familia.
              </motion.p>

              <motion.div
                {...motionProps(0.24)}
                className="mt-10 flex justify-center lg:justify-start"
              >
                <Link href={cotizadorHref} className={landing.ctaPrimaryHero}>
                  Cotizar mi plan gratis
                  <ArrowIcon />
                </Link>
              </motion.div>

              <motion.ul
                {...motionProps(0.32)}
                className="landing-hero-metrics mt-10 grid gap-3 sm:grid-cols-3"
                aria-label="Indicadores de confianza"
              >
                {TRUST_METRICS.map((metric) => (
                  <li
                    key={metric.id}
                    className="landing-hero-metric flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-background/85 px-3 py-4 text-center backdrop-blur-md sm:items-start sm:px-4 sm:py-5 sm:text-left"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {metric.icon}
                    </span>
                    <div>
                      {"prefix" in metric && metric.prefix ? (
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                          {metric.prefix}
                        </p>
                      ) : null}
                      <p className="text-lg font-bold tracking-tight text-foreground sm:text-xl lg:text-2xl">
                        {metric.value}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted sm:text-xs">
                        {metric.label}
                      </p>
                    </div>
                  </li>
                ))}
              </motion.ul>
            </div>
          </div>

          {/* Familia — derecha en desktop */}
          <div className="relative z-10 w-full lg:pl-2 xl:pl-4">
            <LandingHeroFamilyVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
