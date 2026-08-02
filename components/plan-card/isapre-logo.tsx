import Image from "next/image";
import { resolveIsapreLogoSrc } from "@/lib/isapre-catalog";
import { ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

export interface IsapreLogoProps {
  isapre: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function initialsFromIsapre(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const LOGO_FRAME_CLASS = {
  sm: "h-8 w-16 sm:h-9 sm:w-[4.5rem]",
  md: "h-10 w-24 sm:h-11 sm:w-28",
  lg: "h-11 w-28 sm:h-14 sm:w-36",
} as const;

export function IsapreLogo({
  isapre,
  size = "lg",
  className,
}: IsapreLogoProps) {
  const logoSrc = resolveIsapreLogoSrc(isapre);
  const frameClass = LOGO_FRAME_CLASS[size];

  if (logoSrc) {
    return (
      <div
        className={joinClasses(
          "relative shrink-0 overflow-hidden rounded-lg border bg-white shadow-sm",
          ui.border,
          frameClass,
          className,
        )}
        role="img"
        aria-label={`Logo ${isapre}`}
      >
        <Image
          src={logoSrc}
          alt={`Logo ${isapre}`}
          fill
          className="object-contain object-center px-2 py-1"
          sizes={size === "lg" ? "144px" : size === "sm" ? "72px" : "112px"}
        />
      </div>
    );
  }

  return (
    <div
      className={joinClasses(
        "flex shrink-0 items-center justify-center rounded-lg border-2 border-primary/20 bg-primary/5 text-primary-dark shadow-sm",
        frameClass,
        ui.borderHairline,
        className,
      )}
      role="img"
      aria-label={`Logo ${isapre}`}
    >
      <span
        className={joinClasses(
          "font-bold tracking-tight",
          size === "lg" ? "text-sm sm:text-base" : "text-xs",
        )}
      >
        {initialsFromIsapre(isapre)}
      </span>
    </div>
  );
}
