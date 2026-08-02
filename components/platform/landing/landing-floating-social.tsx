"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  buildLandingWhatsAppHref,
  LANDING_SOCIAL_NETWORKS,
  LANDING_WHATSAPP,
} from "./landing-social-data";
import {
  LandingSocialNetworkIcon,
  LandingWhatsAppIcon,
} from "./landing-social-icons";

/**
 * Barra flotante de redes (estilo captura de referencia).
 * Se oculta mientras la sección del cotizador embebido (#cotizar) está visible.
 */
export function LandingFloatingSocial() {
  const reducedMotion = useReducedMotion();
  const [hideNearWidget, setHideNearWidget] = useState(false);

  useEffect(() => {
    const widgetSection = document.getElementById("cotizar");
    if (!widgetSection) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setHideNearWidget(entry.isIntersecting);
      },
      {
        threshold: 0.12,
        rootMargin: "-8% 0px -8% 0px",
      },
    );

    observer.observe(widgetSection);
    return () => observer.disconnect();
  }, []);

  if (hideNearWidget) return null;

  const whatsappHref = buildLandingWhatsAppHref();

  return (
    <aside
      className="landing-floating-social pointer-events-none fixed right-0 z-40 bottom-6 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
      aria-label="Redes sociales"
    >
      <div className="pointer-events-auto flex flex-col items-end gap-2 pr-0 sm:gap-2.5">
        <motion.nav
          initial={reducedMotion ? false : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28, delay: 0.2 }}
          aria-label="Síguenos en redes sociales"
          className="flex flex-col gap-0.5 rounded-l-[1.5rem] bg-[#3a3a3a] py-2 pl-2 pr-1 shadow-[0_8px_32px_-8px_rgb(0_0_0_/_0.45)] sm:rounded-l-[1.75rem] sm:py-2.5 sm:pl-2.5 sm:pr-1.5"
        >
          {LANDING_SOCIAL_NETWORKS.map((social) => (
            <a
              key={social.id}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              title={social.label}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:h-10 sm:w-10"
            >
              <LandingSocialNetworkIcon id={social.id} className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </a>
          ))}
        </motion.nav>

        <motion.a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Escríbenos por WhatsApp al ${LANDING_WHATSAPP.display}`}
          title="WhatsApp"
          initial={reducedMotion ? false : { opacity: 0, x: 16, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 26, delay: 0.32 }}
          whileHover={reducedMotion ? undefined : { scale: 1.06 }}
          whileTap={reducedMotion ? undefined : { scale: 0.96 }}
          className="mr-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_-6px_rgb(37_211_102_/_0.55)] transition-[filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/60 focus-visible:ring-offset-2 sm:mr-1.5 sm:h-11 sm:w-11"
        >
          <LandingWhatsAppIcon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
        </motion.a>
      </div>
    </aside>
  );
}
