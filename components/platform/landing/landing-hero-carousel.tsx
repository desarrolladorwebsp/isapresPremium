"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  HERO_CAROUSEL_SLIDES,
  type HeroCarouselSlide,
} from "./landing-hero-screenshots";

const AUTOPLAY_MS = 8000;

const fadeVariants = {
  enter: { opacity: 0, scale: 1.015 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.985 },
};

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      {direction === "left" ? (
        <path d="M12 4l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M8 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function BrowserFrame({ children }: { children: ReactNode }) {
  return (
    <div className="landing-hero-showcase landing-hero-browser overflow-hidden rounded-2xl border border-border/80 bg-background sm:rounded-3xl">
      <div className="flex items-center gap-3 border-b border-border/70 bg-secondary-muted/50 px-4 py-3 sm:px-5">
        <div className="flex shrink-0 gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="min-w-0 flex-1 rounded-lg border border-border/60 bg-background/90 px-3 py-1.5 shadow-sm">
          <p className="truncate text-center text-[11px] font-medium text-muted sm:text-xs">
            cotizadorpremium.cl/cotizador
          </p>
        </div>
        <div className="hidden w-[52px] shrink-0 sm:block" aria-hidden />
      </div>
      {children}
    </div>
  );
}

function SlideProgress({
  active,
  durationMs,
  resetKey,
}: {
  active: boolean;
  durationMs: number;
  resetKey: number;
}) {
  const reducedMotion = useReducedMotion();

  if (!active) {
    return <span className="block h-0.5 w-full rounded-full bg-border/80" />;
  }

  if (reducedMotion) {
    return <span className="block h-0.5 w-full rounded-full bg-primary" />;
  }

  return (
    <span className="relative block h-0.5 w-full overflow-hidden rounded-full bg-border/80">
      <motion.span
        key={resetKey}
        className="absolute inset-y-0 left-0 rounded-full bg-primary"
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{
          duration: durationMs / 1000,
          ease: "linear",
        }}
      />
    </span>
  );
}

export function LandingHeroCarousel() {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  const slideCount = HERO_CAROUSEL_SLIDES.length;
  const activeSlide = HERO_CAROUSEL_SLIDES[index];

  const goTo = useCallback(
    (nextIndex: number, nextDirection: number) => {
      setDirection(nextDirection);
      setIndex((nextIndex + slideCount) % slideCount);
      setProgressKey((key) => key + 1);
    },
    [slideCount],
  );

  const paginate = useCallback(
    (step: number) => {
      goTo(index + step, step);
    },
    [goTo, index],
  );

  useEffect(() => {
    if (reducedMotion || paused) return;

    const timer = window.setInterval(() => {
      setDirection(1);
      setIndex((current) => (current + 1) % slideCount);
      setProgressKey((key) => key + 1);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [reducedMotion, paused, slideCount]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        paginate(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        paginate(1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paginate]);

  return (
    <div
      className="landing-hero-stage relative mx-auto w-full max-w-6xl lg:max-w-none"
      role="region"
      aria-roledescription="carrusel"
      aria-label="Capturas del cotizador en acción"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="landing-hero-stage-glow pointer-events-none absolute -inset-x-6 -bottom-8 top-1/4 rounded-full blur-3xl" aria-hidden />

      <BrowserFrame>
        <div
          className="relative aspect-[16/9] min-h-[220px] overflow-hidden bg-secondary-muted/30 sm:min-h-[300px] lg:min-h-[360px] xl:min-h-[400px]"
          aria-live="polite"
        >
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={activeSlide.id}
              custom={direction}
              variants={fadeVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                opacity: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
                scale: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
              }}
              className="absolute inset-0"
            >
              <Image
                src={activeSlide.src}
                alt={activeSlide.alt}
                fill
                priority={index === 0}
                className="object-cover object-top"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1152px"
                quality={92}
              />
            </motion.div>
          </AnimatePresence>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/40 to-transparent" />

          <div className="absolute inset-y-0 left-0 flex items-center pl-2 sm:pl-3">
            <motion.button
              type="button"
              aria-label="Captura anterior"
              onClick={() => paginate(-1)}
              whileHover={reducedMotion ? undefined : { scale: 1.06 }}
              whileTap={reducedMotion ? undefined : { scale: 0.96 }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/90 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-10 sm:w-10"
            >
              <ChevronIcon direction="left" />
            </motion.button>
          </div>

          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3">
            <motion.button
              type="button"
              aria-label="Captura siguiente"
              onClick={() => paginate(1)}
              whileHover={reducedMotion ? undefined : { scale: 1.06 }}
              whileTap={reducedMotion ? undefined : { scale: 0.96 }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/90 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-10 sm:w-10"
            >
              <ChevronIcon direction="right" />
            </motion.button>
          </div>
        </div>

        <SlideInfo slide={activeSlide} index={index} total={slideCount} />
      </BrowserFrame>

      <div
        className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] xl:grid xl:grid-cols-5 xl:overflow-visible xl:pb-0 [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Navegación de capturas"
      >
        {HERO_CAROUSEL_SLIDES.map((slide, slideIndex) => {
          const isActive = slideIndex === index;
          return (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Ver: ${slide.label}`}
              onClick={() => goTo(slideIndex, slideIndex > index ? 1 : -1)}
              className={`group min-w-[140px] shrink-0 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 sm:min-w-0 ${
                isActive
                  ? "bg-primary/8 ring-1 ring-primary/20"
                  : "bg-background/60 hover:bg-surface-hover"
              }`}
            >
              <SlideProgress
                active={isActive}
                durationMs={AUTOPLAY_MS}
                resetKey={progressKey}
              />
              <p
                className={`mt-2 text-xs font-semibold leading-tight sm:text-sm ${
                  isActive ? "text-foreground" : "text-muted group-hover:text-foreground"
                }`}
              >
                {slide.label}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SlideInfo({
  slide,
  index,
  total,
}: {
  slide: HeroCarouselSlide;
  index: number;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-1 border-t border-border/70 bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
      <div>
        <p className="text-sm font-semibold text-foreground sm:text-base">{slide.label}</p>
        <p className="mt-0.5 text-xs leading-relaxed premium-text-secondary sm:text-sm">
          {slide.description}
        </p>
      </div>
      <p className="mt-2 shrink-0 text-[11px] font-medium text-muted sm:mt-0">
        {index + 1} / {total} · Captura real
      </p>
    </div>
  );
}
