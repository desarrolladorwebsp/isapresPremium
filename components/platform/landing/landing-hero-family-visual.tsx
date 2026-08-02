"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  LANDING_FAMILY_HERO_ALT,
  LANDING_FAMILY_HERO_IMAGE,
  LANDING_FAMILY_HERO_VIDEO,
} from "./landing-visual-config";

/** Visual principal del Hero — video vertical que llena el marco (sin huecos). */
export function LandingHeroFamilyVisual() {
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (reducedMotion) {
      video.pause();
      video.removeAttribute("autoplay");
      return;
    }

    video.muted = true;
    const playAttempt = video.play();
    if (playAttempt !== undefined) {
      void playAttempt.catch(() => {
        /* Autoplay bloqueado: queda el poster. */
      });
    }
  }, [reducedMotion]);

  return (
    <div className="landing-hero-family relative mx-auto w-full max-w-[22rem] sm:max-w-[24rem] lg:ml-auto lg:mr-0 lg:max-w-[26rem] xl:max-w-[28rem]">
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, x: 28, scale: 0.97 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 28,
          delay: 0.15,
        }}
        className="landing-hero-family-frame relative aspect-[9/16] w-full overflow-hidden rounded-3xl border border-white/60 shadow-card"
      >
        <video
          ref={videoRef}
          className="landing-hero-video absolute inset-0 h-full w-full object-cover object-center"
          src={LANDING_FAMILY_HERO_VIDEO}
          poster={LANDING_FAMILY_HERO_IMAGE}
          muted
          loop
          playsInline
          preload="metadata"
          autoPlay={!reducedMotion}
          aria-label={LANDING_FAMILY_HERO_ALT}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary-dark/40 via-transparent to-transparent"
          aria-hidden
        />

        <div className="landing-hero-family-caption absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <div className="landing-glass-panel-strong rounded-2xl px-3.5 py-3 sm:px-4 sm:py-3.5">
            <p className="text-sm font-semibold text-foreground sm:text-base">
              Salud que protege a quienes más quieres
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted sm:text-sm">
              Tranquilidad para tu familia, con el respaldo de asesores
              certificados.
            </p>
          </div>
        </div>
      </motion.div>

      <div
        className="landing-hero-family-glow pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] blur-2xl"
        aria-hidden
      />
    </div>
  );
}
