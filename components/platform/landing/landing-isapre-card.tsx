"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { buildIsaprePagePath } from "@/lib/isapre-pages/urls";
import { formatGesLabel, type LandingIsapreItem } from "./landing-isapres-data";

interface LandingIsapreCardProps {
  item: LandingIsapreItem;
}

export function LandingIsapreCard({ item }: LandingIsapreCardProps) {
  const reducedMotion = useReducedMotion();
  const href = buildIsaprePagePath(item.id);

  return (
    <motion.article
      whileHover={
        reducedMotion
          ? undefined
          : { y: -6, transition: { type: "spring", stiffness: 380, damping: 28 } }
      }
      className="landing-isapre-card landing-glass-panel-strong relative mt-14 h-full rounded-3xl border border-border/70 shadow-card transition hover:border-primary/20"
    >
      <Link
        href={href}
        className="group/card flex h-full flex-col rounded-3xl p-7 pt-16 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 sm:p-8 sm:pt-16"
        aria-label={`Ver planes de ${item.title}`}
      >
        <div className="pointer-events-none absolute -top-12 left-1/2 z-10 flex h-24 w-24 -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-background p-2 shadow-card">
          {item.logoSrc ? (
            <div className="relative h-full w-full">
              <Image
                src={item.logoSrc}
                alt=""
                fill
                className="object-contain p-1.5"
                sizes="96px"
              />
            </div>
          ) : (
            <span className="text-lg font-bold text-primary-dark">
              {item.title.slice(0, 2)}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col">
          <h3 className="text-base font-bold uppercase tracking-wide text-foreground transition-colors group-hover/card:text-primary sm:text-lg">
            {item.title}
          </h3>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            GES actual:{" "}
            <span className="text-primary">{formatGesLabel(item.gesUf)}</span>
          </p>
          <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">
            {item.description}
          </p>
          <span className="mx-auto mt-6 inline-flex h-10 items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 text-sm font-semibold text-primary transition-colors group-hover/card:border-primary/40 group-hover/card:bg-primary group-hover/card:text-primary-foreground">
            Ver planes
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
