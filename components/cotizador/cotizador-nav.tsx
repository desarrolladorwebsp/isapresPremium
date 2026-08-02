"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { horizontalScrollRail, touchTarget, ui } from "@/lib/ui-tokens";
import { joinClasses } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Clientes", shortLabel: "Clientes" },
  {
    href: "/cotizador/ejecutivos",
    label: "Panel comercial",
    shortLabel: "Panel",
  },
  { href: "/cotizador/acceso", label: "Acceso staff", shortLabel: "Acceso" },
] as const;

export function CotizadorNav() {
  const pathname = usePathname();

  return (
    <nav
      className={joinClasses(
        "shrink-0 border-t bg-white px-4 sm:px-6 lg:px-10",
        ui.border,
      )}
      aria-label="Vistas del cotizador"
    >
      <div
        className={joinClasses(
          horizontalScrollRail,
          "mx-auto flex max-w-7xl gap-1 py-2",
        )}
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname === "/cotizador"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={joinClasses(
                "shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
                touchTarget,
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : joinClasses("text-muted", ui.hoverSurface),
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="sm:hidden">{item.shortLabel}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
