"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { SocialIcons } from "@/components/ui/SocialIcons";
import { NAV_LINKS } from "@/constants/navigation";
import { SOCIAL_LINKS } from "@/constants/site";

function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastY;

      setScrolled(currentY > 8);

      if (currentY <= 80) {
        setHidden(false);
      } else if (Math.abs(delta) > 4) {
        setHidden(delta > 0);
      }

      lastY = currentY;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { hidden, scrolled };
}

function isNavLinkActive(pathname: string, hash: string, href: string) {
  if (href.startsWith("http")) {
    return false;
  }

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
  const className = `relative flex h-16 items-center text-sm font-semibold tracking-tight transition-colors ${
    active ? "text-zinc-900" : "text-zinc-700 hover:text-zinc-900"
  }`;

  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
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

function MobileMenuLink({
  label,
  href,
  active,
  onNavigate,
}: {
  label: string;
  href: string;
  active: boolean;
  onNavigate: () => void;
}) {
  const className = `flex min-h-12 items-center rounded-xl px-4 py-3.5 text-base font-semibold tracking-tight transition-colors ${
    active
      ? "bg-brand-teal/10 text-brand-teal"
      : "text-zinc-800 hover:bg-zinc-50 hover:text-zinc-900"
  }`;

  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onNavigate}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={onNavigate}>
      {label}
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const menuId = useId();
  const [hash, setHash] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hidden: scrollHidden, scrolled } = useHideOnScroll();
  const headerHidden = scrollHidden && !mobileMenuOpen;

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
  }

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen, closeMobileMenu]);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b bg-white transition-[transform,box-shadow,border-color] duration-300 ease-in-out motion-reduce:transition-none ${
        scrolled || mobileMenuOpen
          ? "border-zinc-200 shadow-sm"
          : "border-zinc-200/70 shadow-none"
      } ${headerHidden ? "-translate-y-[calc(100%+1.5rem)]" : "translate-y-0"}`}
    >
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between overflow-visible px-4 sm:px-6 lg:px-10">
        <nav
          className="hidden flex-1 items-center gap-3 md:flex lg:gap-5 xl:gap-8"
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

        <div
          className={`absolute left-1/2 top-0 -translate-x-1/2 transition-opacity duration-200 ${
            mobileMenuOpen ? "z-40 opacity-40 md:z-[60] md:opacity-100" : "z-[60]"
          }`}
        >
          <Link
            href="/"
            className="flex min-h-[4.75rem] rounded-b-2xl border-x border-b border-zinc-200/90 bg-white px-4 pb-6 pt-1.5 shadow-[0_8px_22px_rgba(0,0,0,0.1)] transition-shadow hover:shadow-[0_12px_28px_rgba(0,0,0,0.14)] md:min-h-0 md:rounded-b-2xl md:border-0 md:px-6 md:pb-5 md:pt-2 md:shadow-lg md:hover:shadow-xl"
            onClick={closeMobileMenu}
          >
            <Image
              src="/logo-isapres-premium.png"
              alt="Isapres Premium"
              width={160}
              height={56}
              priority
              className="h-11 w-auto object-contain md:h-12"
            />
          </Link>
        </div>

        <div className="relative z-[70] flex flex-1 items-center justify-end gap-2 sm:gap-4">
          <SocialIcons
            links={SOCIAL_LINKS}
            className="hidden items-center gap-1 md:flex"
            iconClassName="h-[18px] w-[18px] sm:h-5 sm:w-5"
          />

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls={menuId}
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className="mobile-menu-backdrop fixed inset-0 top-16 z-40 bg-zinc-900/40 backdrop-blur-[2px] md:hidden"
            aria-label="Cerrar menú"
            onClick={closeMobileMenu}
          />

          <nav
            id={menuId}
            className="mobile-menu-panel absolute left-0 right-0 top-full z-50 border-b border-zinc-200 bg-white shadow-xl md:hidden"
            aria-label="Navegación móvil"
          >
            <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
              <ul className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <MobileMenuLink
                      label={link.label}
                      href={link.href}
                      active={isNavLinkActive(pathname, hash, link.href)}
                      onNavigate={closeMobileMenu}
                    />
                  </li>
                ))}
              </ul>

              <div className="mt-5 border-t border-zinc-100 pt-5">
                <p className="px-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Síguenos
                </p>
                <SocialIcons
                  links={SOCIAL_LINKS}
                  className="mt-2 flex items-center gap-1 px-2"
                  iconClassName="h-5 w-5"
                />
              </div>
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
