import Image from "next/image";
import {
  ISAPRE_PREMIUM_ICON_PATH,
  ISAPRE_PREMIUM_WORDMARK_PATH,
} from "@/lib/partner-entity/isapre-premium-agent";
import { siteConfig } from "@/constants/site";

interface StaffBrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /**
   * `icon` = isotipo compacto (header).
   * `wordmark` = logo completo Isapres Premium.
   */
  variant?: "icon" | "wordmark";
  transparent?: boolean;
}

const ICON_SIZE = {
  sm: { box: "h-10 w-10", image: 40, sizes: "40px" },
  md: { box: "h-12 w-12", image: 48, sizes: "48px" },
  lg: { box: "h-14 w-14", image: 56, sizes: "56px" },
} as const;

const WORDMARK_SIZE = {
  sm: { box: "h-9 w-auto", width: 140, height: 40, sizes: "140px" },
  md: { box: "h-11 w-auto", width: 176, height: 48, sizes: "176px" },
  lg: { box: "h-14 w-auto", width: 220, height: 60, sizes: "220px" },
} as const;

export function StaffBrandLogo({
  size = "md",
  className = "",
  variant = "icon",
  transparent = true,
}: StaffBrandLogoProps) {
  if (variant === "wordmark") {
    const config = WORDMARK_SIZE[size];
    return (
      <span
        className={`relative inline-flex shrink-0 items-center ${config.box} ${className}`}
      >
        <Image
          src={ISAPRE_PREMIUM_WORDMARK_PATH}
          alt={siteConfig.name}
          width={config.width}
          height={config.height}
          className="h-full w-auto object-contain"
          sizes={config.sizes}
          priority
        />
      </span>
    );
  }

  const config = ICON_SIZE[size];
  return (
    <span
      className={`relative inline-flex shrink-0 ${
        transparent
          ? "overflow-visible bg-transparent shadow-none"
          : "overflow-hidden rounded-xl bg-background shadow-sm"
      } ${config.box} ${className}`}
    >
      <Image
        src={ISAPRE_PREMIUM_ICON_PATH}
        alt={siteConfig.name}
        width={config.image}
        height={config.image}
        className={`h-full w-full object-contain ${transparent ? "p-0" : "p-0.5"}`}
        sizes={config.sizes}
        priority
      />
    </span>
  );
}
