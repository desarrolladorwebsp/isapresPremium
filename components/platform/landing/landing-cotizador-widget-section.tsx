"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { landing } from "./landing-tokens";
import {
  LANDING_WIDGET_AGENT_KEY,
  LANDING_WIDGET_MIN_HEIGHT,
  LANDING_WIDGET_SCRIPT_URL,
  resolveLandingWidgetBaseUrl,
} from "./landing-widget-config";
import { LandingSectionBackdrop } from "./landing-section-backdrop";
import { LANDING_SECTION_BACKGROUNDS, LANDING_SECTION_BACKGROUND_ALTS } from "./landing-visual-config";

declare global {
  interface Window {
    CotizadorWidget?: {
      mount: (
        element: HTMLElement,
        options?: {
          partner?: string;
          baseUrl?: string;
          minHeight?: number;
          title?: string;
          query?: Record<string, string>;
        },
      ) => { destroy: () => void };
    };
  }
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 280, damping: 28 },
  },
};

function SparkIcon({ className }: { className?: string }) {
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
        d="M10 2l1.2 4.2L15.5 7.5 11.2 8.7 10 13l-1.2-4.3L4.5 7.5l4.3-1.3L10 2zM4 14l.6 2.1L6.7 17l-2.1.6L4 20l-.6-2.4L1.3 17l2.1-.6L4 14zM16 12l.5 1.7L18.2 14l-1.7.5L16 16l-.5-1.5-1.7-.5 1.7-.5L16 12z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingCotizadorWidgetSection() {
  const containerRef = useRef<HTMLElement>(null);
  const mountedRef = useRef(false);
  const scriptReadyRef = useRef(false);
  const reducedMotion = useReducedMotion();
  const [baseUrl, setBaseUrl] = useState<string | null>(null);

  useEffect(() => {
    setBaseUrl(resolveLandingWidgetBaseUrl());
  }, []);

  const mountWidget = useCallback(() => {
    const container = containerRef.current;
    const resolvedBaseUrl = baseUrl ?? resolveLandingWidgetBaseUrl();
    if (!container || mountedRef.current || !resolvedBaseUrl) return;

    if (container.dataset.cvMounted === "true") {
      mountedRef.current = true;
      return;
    }

    if (window.CotizadorWidget?.mount) {
      window.CotizadorWidget.mount(container, {
        partner: LANDING_WIDGET_AGENT_KEY,
        baseUrl: resolvedBaseUrl,
        minHeight: LANDING_WIDGET_MIN_HEIGHT,
        title: "Cotizador de planes Isapre — Cotizador Premium",
      });
      mountedRef.current = true;
    }
  }, [baseUrl]);

  useEffect(() => {
    if (!baseUrl || !scriptReadyRef.current) return;
    mountWidget();
  }, [baseUrl, mountWidget]);

  const handleScriptReady = useCallback(() => {
    scriptReadyRef.current = true;
    mountWidget();
  }, [mountWidget]);

  return (
    <section
      id="cotizar"
      className={`${landing.sectionSurface} landing-section-with-photo relative overflow-visible`}
      aria-labelledby="landing-widget-title"
    >
      <LandingSectionBackdrop
        imageSrc={LANDING_SECTION_BACKGROUNDS.widget}
        imageAlt={LANDING_SECTION_BACKGROUND_ALTS.widget}
        variant="widget"
      />
      <div className={`${landing.container} relative py-20 sm:py-24 lg:py-28`}>
        <motion.div
          initial={reducedMotion ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
          }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.span variants={fadeUp} className={landing.badge}>
            <SparkIcon className="h-3.5 w-3.5 text-primary" />
            Cotizador en vivo
          </motion.span>
          <motion.h2
            id="landing-widget-title"
            variants={fadeUp}
            className="landing-text-gradient mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Compara planes Isapre ahora mismo
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed premium-text-secondary sm:text-lg"
          >
            Ingresa tus datos, revisa opciones reales y avanza al cotizador
            completo cuando quieras profundizar — con la misma experiencia de
            asesoría que usamos en todo Cotizador Premium.
          </motion.p>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 32, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ type: "spring", stiffness: 240, damping: 28, delay: 0.12 }}
          className="landing-widget-shell relative mt-12 sm:mt-14"
        >
          <div className="landing-glass-panel-strong landing-widget-frame mx-auto w-full overflow-visible rounded-[1.75rem] p-2 sm:p-3">
            <section
              ref={containerRef}
              data-cotizador-widget
              data-agent-key={LANDING_WIDGET_AGENT_KEY}
              data-partner={LANDING_WIDGET_AGENT_KEY}
              data-base-url={baseUrl ?? undefined}
              data-full-width="false"
              data-min-height={String(LANDING_WIDGET_MIN_HEIGHT)}
              data-title="Cotizador de planes Isapre — Cotizador Premium"
              className="landing-widget-mount min-h-[720px] w-full overflow-visible rounded-[1.35rem] bg-background"
            />
          </div>

          <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-relaxed text-muted sm:text-sm">
            Al continuar, tus criterios de búsqueda se transfieren al cotizador
            completo para que retomes exactamente donde lo dejaste.
          </p>
        </motion.div>
      </div>

      <Script
        src={LANDING_WIDGET_SCRIPT_URL}
        strategy="afterInteractive"
        onLoad={handleScriptReady}
        onReady={handleScriptReady}
      />
    </section>
  );
}
