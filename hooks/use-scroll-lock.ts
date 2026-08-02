import { useEffect } from "react";
import { lockPageScroll, unlockPageScroll } from "@/lib/scroll/scroll-lock";

/** Bloquea el scroll de fondo mientras un overlay (modal, drawer, sidebar) está abierto. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    lockPageScroll();
    return () => unlockPageScroll();
  }, [active]);
}
