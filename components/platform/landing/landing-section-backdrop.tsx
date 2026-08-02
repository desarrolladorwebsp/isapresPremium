"use client";

import Image from "next/image";
import { joinClasses } from "@/lib/utils";

export type LandingSectionBackdropVariant =
  | "widget"
  | "partners"
  | "isapres"
  | "reviews";

export interface LandingSectionBackdropProps {
  imageSrc: string;
  imageAlt?: string;
  variant?: LandingSectionBackdropVariant;
  priority?: boolean;
}

const variantClass: Record<LandingSectionBackdropVariant, string> = {
  widget: "landing-section-backdrop--widget",
  partners: "landing-section-backdrop--partners",
  isapres: "landing-section-backdrop--isapres",
  reviews: "landing-section-backdrop--reviews",
};

export function LandingSectionBackdrop({
  imageSrc,
  imageAlt = "",
  variant = "widget",
  priority = false,
}: LandingSectionBackdropProps) {
  return (
    <div
      className={joinClasses(
        "landing-section-backdrop pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        variantClass[variant],
      )}
      aria-hidden
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        priority={priority}
        className="landing-section-backdrop__image object-cover"
        sizes="100vw"
        quality={80}
      />
      <div className="landing-section-backdrop__overlay absolute inset-0" />
    </div>
  );
}
