type ScrollLockSnapshot = {
  overflow: string;
  overscrollBehavior: string;
  touchAction: string;
};

let lockCount = 0;
const elementSnapshots = new Map<HTMLElement, ScrollLockSnapshot>();
let bodySnapshot: ScrollLockSnapshot | null = null;

const MOBILE_SHELL_QUERY = "(max-width: 1023px)";

function isMobileAppShell(): boolean {
  return window.matchMedia(MOBILE_SHELL_QUERY).matches;
}

function getAppShellScrollElements(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(".app-shell-scroll"),
  ).filter((element) => {
    if (element.closest('[role="dialog"], [data-embed-overlay]')) {
      return false;
    }
    const { overflowY } = window.getComputedStyle(element);
    return overflowY === "auto" || overflowY === "scroll";
  });
}

function lockElement(element: HTMLElement): void {
  if (elementSnapshots.has(element)) return;

  elementSnapshots.set(element, {
    overflow: element.style.overflow,
    overscrollBehavior: element.style.overscrollBehavior,
    touchAction: element.style.touchAction,
  });

  element.style.overflow = "hidden";
  element.style.overscrollBehavior = "none";
}

function unlockElement(element: HTMLElement): void {
  const snapshot = elementSnapshots.get(element);
  if (!snapshot) return;

  element.style.overflow = snapshot.overflow;
  element.style.overscrollBehavior = snapshot.overscrollBehavior;
  element.style.touchAction = snapshot.touchAction;
  elementSnapshots.delete(element);
}

function lockBody(): void {
  if (bodySnapshot) return;

  bodySnapshot = {
    overflow: document.body.style.overflow,
    overscrollBehavior: document.body.style.overscrollBehavior,
    touchAction: document.body.style.touchAction,
  };

  document.body.style.overflow = "hidden";
  document.body.style.overscrollBehavior = "none";
}

function unlockBody(): void {
  if (!bodySnapshot) return;

  document.body.style.overflow = bodySnapshot.overflow;
  document.body.style.overscrollBehavior = bodySnapshot.overscrollBehavior;
  document.body.style.touchAction = bodySnapshot.touchAction;
  bodySnapshot = null;
}

/** Bloquea el scroll de la página o del contenedor app-shell en móvil. */
export function lockPageScroll(): void {
  lockCount += 1;
  if (lockCount > 1) return;

  if (isMobileAppShell()) {
    const scrollElements = getAppShellScrollElements();
    if (scrollElements.length > 0) {
      for (const element of scrollElements) {
        lockElement(element);
      }
      return;
    }
  }

  lockBody();
}

/** Restaura el scroll bloqueado por `lockPageScroll`. */
export function unlockPageScroll(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;

  for (const element of [...elementSnapshots.keys()]) {
    unlockElement(element);
  }
  unlockBody();
}
