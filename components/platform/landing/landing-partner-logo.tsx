"use client";

import { useState } from "react";
import { faviconUrl, type LandingPartner } from "./landing-partners-data";

interface LandingPartnerLogoProps {
  partner: LandingPartner;
}

function PlaceholderLogo({ partner }: LandingPartnerLogoProps) {
  const initial = partner.name.charAt(0).toUpperCase();

  return (
    <span
      className="flex h-full w-full items-center justify-center text-lg font-bold text-white"
      style={{ background: partner.accentColor }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function LandingPartnerLogo({ partner }: LandingPartnerLogoProps) {
  const sources = [
    partner.logoUrl,
    faviconUrl(partner.domain),
  ].filter(Boolean) as string[];

  const [sourceIndex, setSourceIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed || sources.length === 0) {
    return <PlaceholderLogo partner={partner} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- landing-only; múltiples orígenes con fallback
    <img
      src={sources[sourceIndex]}
      alt={`Logo de ${partner.name}`}
      className="h-full w-full object-contain p-1.5"
      loading="lazy"
      onError={() => {
        if (sourceIndex < sources.length - 1) {
          setSourceIndex((i) => i + 1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
