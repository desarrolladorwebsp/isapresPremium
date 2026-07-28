"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SocialIcons } from "@/components/ui/SocialIcons";
import { NAV_LINKS, SOCIAL_LINKS } from "@/constants/navigation";

function isNavLinkActive(pathname: string, hash: string, href: string) {
  if (href === "/") {
    return pathname === "/" && (hash === "" || hash === "#");
  }

  if (href.startsWith("/#")) {
    return pathname === "/" && hash === href.slice(1);
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative flex h-16 items-center text-sm font-medium transition-colors ${
        active
          ? "text-zinc-900"
          : "text-zinc-700 hover:text-zinc-900"
      }`}
    >
      {label}
      {active && (
        <span
          className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand-teal"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between overflow-visible px-4 sm:px-6 lg:px-10">
        <nav
          className="hidden flex-1 items-center gap-6 md:flex lg:gap-10"
          aria-label="Navegación principal"
        >
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.href}
              label={link.label}
              href={link.href}
              active={isNavLinkActive(pathname, hash, link.href)}
            />
          ))}
        </nav>

        <div className="flex flex-1 md:hidden" aria-hidden="true" />

        <div className="absolute left-1/2 top-0 z-[60] -translate-x-1/2">
          <Link
            href="/"
            className="flex rounded-b-2xl bg-white px-4 pb-4 pt-2 shadow-lg transition-shadow hover:shadow-xl sm:px-6 sm:pb-5"
          >
            <Image
              src="/logo-isapres-premium.png"
              alt="Isapres Premium"
              width={160}
              height={56}
              priority
              className="h-10 w-auto object-contain sm:h-12"
            />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end gap-4">
          <SocialIcons
            links={SOCIAL_LINKS}
            className="flex items-center gap-3 sm:gap-4"
            iconClassName="h-[18px] w-[18px] sm:h-5 sm:w-5"
          />
        </div>
      </div>

      <nav
        className="flex items-center justify-center gap-5 border-t border-zinc-100 px-4 py-2 md:hidden"
        aria-label="Navegación móvil"
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-xs font-medium transition-colors ${
              isNavLinkActive(pathname, hash, link.href)
                ? "text-brand-teal underline decoration-2 underline-offset-4"
                : "text-zinc-700 hover:text-zinc-900"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
