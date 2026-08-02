import Image from "next/image";
import {
  COTIZADOR_PREMIUM_ICON_PATH,
  COTIZADOR_PREMIUM_LOGO_PATH,
} from "@/lib/partner-entity/cotizador-premium-palette";

interface LandingLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Sin fondo ni sombra (p. ej. header navy del panel ejecutivo). */
  transparent?: boolean;
  /**
 * `icon` = isotipo oficial de menús / headers (`icono-logo-cotizador-premium.png`).
 * `logo` = wordmark completo (usar solo cuando se pida explícitamente).
 */
  variant?: "logo" | "icon";
}

const SIZE = {
  sm: { box: "h-10 w-10", image: 40, sizes: "40px" },
  md: { box: "h-12 w-12", image: 48, sizes: "48px" },
  lg: { box: "h-14 w-14", image: 56, sizes: "56px" },
} as const;

export function LandingLogo({
  size = "md",
  className = "",
  transparent = false,
  variant = "icon",
}: LandingLogoProps) {
  const config = SIZE[size];
  const src =
    variant === "icon" ? COTIZADOR_PREMIUM_ICON_PATH : COTIZADOR_PREMIUM_LOGO_PATH;

  return (
    <span
      className={`relative inline-flex shrink-0 ${
        transparent
          ? "overflow-visible bg-transparent shadow-none"
          : "overflow-hidden rounded-xl bg-background shadow-sm"
      } ${config.box} ${className}`}
    >
      <Image
        src={src}
        alt="Cotizador Premium"
        width={config.image}
        height={config.image}
        className={`h-full w-full object-contain ${transparent ? "p-0" : "p-0.5"}`}
        sizes={config.sizes}
        priority
      />
    </span>
  );
}
