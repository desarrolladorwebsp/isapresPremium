const MOBILE_SHELL_QUERY = "(max-width: 1023px)";

function getAppShellScrollElement(
  from?: HTMLElement | null,
): HTMLElement | null {
  if (from) {
    const closest = from.closest<HTMLElement>(".app-shell-scroll");
    if (closest) return closest;
  }

  return document.querySelector<HTMLElement>(".app-shell-scroll");
}

function isScrollableAppShell(element: HTMLElement): boolean {
  const { overflowY } = window.getComputedStyle(element);
  return overflowY === "auto" || overflowY === "scroll";
}

/** Desplaza el contenedor de scroll de la app o la ventana hacia un elemento. */
export function scrollElementIntoAppShell(
  target: HTMLElement | null,
  options: ScrollIntoViewOptions = { behavior: "smooth", block: "start" },
): void {
  if (!target) return;

  const scrollRoot = getAppShellScrollElement(target);
  const useAppShellScroll =
    scrollRoot &&
    window.matchMedia(MOBILE_SHELL_QUERY).matches &&
    isScrollableAppShell(scrollRoot);

  if (useAppShellScroll && scrollRoot) {
    const rootRect = scrollRoot.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offset = parseFloat(
      window.getComputedStyle(target).scrollMarginTop || "0",
    );
    const top =
      scrollRoot.scrollTop + (targetRect.top - rootRect.top) - offset;

    scrollRoot.scrollTo({
      top: Math.max(0, top),
      behavior: options.behavior ?? "smooth",
    });
    return;
  }

  target.scrollIntoView(options);
}

/** Lleva el scroll al inicio del contenedor app-shell o de la ventana. */
export function scrollAppShellToTop(
  behavior: ScrollBehavior = "smooth",
): void {
  const scrollRoot = getAppShellScrollElement();
  const useAppShellScroll =
    scrollRoot &&
    window.matchMedia(MOBILE_SHELL_QUERY).matches &&
    isScrollableAppShell(scrollRoot);

  if (useAppShellScroll && scrollRoot) {
    scrollRoot.scrollTo({ top: 0, behavior });
    return;
  }

  window.scrollTo({ top: 0, behavior });
}
