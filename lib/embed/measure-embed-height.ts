import { EMBED_HEIGHT_BUFFER_PX } from "@/lib/embed/constants";

function safeMax(...values: number[]): number {
  let max = 0;
  for (const value of values) {
    if (Number.isFinite(value) && value > max) {
      max = value;
    }
  }
  return max;
}

/** Distancia desde la raíz embed hasta el borde inferior visible del nodo. */
function measureElementBottom(el: Element, rootTop: number): number {
  const rect = el.getBoundingClientRect();
  if (rect.height <= 0 && rect.width <= 0) {
    return 0;
  }

  const fromRect = rect.bottom - rootTop;
  return Number.isFinite(fromRect) && fromRect > 0 ? fromRect : 0;
}

function measureFlowContent(root: HTMLElement): number {
  const rootTop = root.getBoundingClientRect().top;
  let maxBottom = 0;

  const sentinel = root.querySelector("[data-embed-height-sentinel]");
  if (sentinel instanceof HTMLElement) {
    maxBottom = safeMax(maxBottom, measureElementBottom(sentinel, rootTop));
  }

  root.querySelectorAll<HTMLElement>(":scope > *").forEach((child) => {
    if (child.hasAttribute("data-embed-height-sentinel")) return;
    maxBottom = safeMax(maxBottom, measureElementBottom(child, rootTop));
  });

  root.querySelectorAll<HTMLElement>("[data-embed-measure]").forEach((node) => {
    maxBottom = safeMax(maxBottom, measureElementBottom(node, rootTop));
  });

  const results = root.querySelector("#resultados");
  if (results instanceof HTMLElement) {
    maxBottom = safeMax(maxBottom, measureElementBottom(results, rootTop));
  }

  return Math.ceil(maxBottom);
}

function isVisibleOverlay(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.height <= 0 || rect.width <= 0) return false;

  const style = window.getComputedStyle(el);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number.parseFloat(style.opacity) <= 0 ||
    el.getAttribute("aria-hidden") === "true"
  ) {
    return false;
  }

  // Drawer móvil cerrado (translateX(-100%)) sigue en el DOM pero fuera del viewport.
  if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= window.innerWidth) {
    return false;
  }

  return true;
}

function measureOverlayContent(root: HTMLElement): number {
  const rootTop = root.getBoundingClientRect().top;
  let maxBottom = 0;

  root.querySelectorAll<HTMLElement>(
    '[role="dialog"], [role="alertdialog"]',
  ).forEach((overlay) => {
    if (overlay.closest("[data-embed-overlay]")) return;
    if (overlay.hasAttribute("data-embed-overlay")) return;
    if (!isVisibleOverlay(overlay)) return;
    maxBottom = safeMax(maxBottom, measureElementBottom(overlay, rootTop));
  });

  return Math.ceil(maxBottom);
}

function hasVisibleEmbedOverlay(): boolean {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-embed-overlay]"),
  ).some((node) => isVisibleOverlay(node));
}

function measureDocumentHeight(): number {
  const html = document.documentElement;
  const body = document.body;

  return Math.ceil(
    safeMax(
      html.scrollHeight,
      html.offsetHeight,
      body.scrollHeight,
      body.offsetHeight,
    ),
  );
}

/** Altura total del contenido embebido (flujo + modales/alertas visibles). */
export function measureEmbedContentHeight(root: HTMLElement): number {
  const rootTop = root.getBoundingClientRect().top;
  let contentBottom = 0;

  const sentinel = root.querySelector("[data-embed-height-sentinel]");
  if (sentinel instanceof HTMLElement) {
    contentBottom = safeMax(
      contentBottom,
      measureElementBottom(sentinel, rootTop),
    );
  }

  const flowHeight = measureFlowContent(root);

  // Avisos del widget embebido: no inflar iframe ni usar scrollHeight del documento.
  if (hasVisibleEmbedOverlay()) {
    if (flowHeight > 0) {
      return flowHeight + EMBED_HEIGHT_BUFFER_PX;
    }
    if (contentBottom > 0) {
      return Math.ceil(contentBottom) + EMBED_HEIGHT_BUFFER_PX;
    }
  }

  contentBottom = safeMax(contentBottom, measureOverlayContent(root));

  if (contentBottom > 0) {
    return Math.ceil(contentBottom) + EMBED_HEIGHT_BUFFER_PX;
  }

  if (flowHeight > 0) {
    return flowHeight + EMBED_HEIGHT_BUFFER_PX;
  }

  return measureDocumentHeight() + EMBED_HEIGHT_BUFFER_PX;
}

/**
 * Reservado para compatibilidad. El modo embed se aplica en SSR (layout + CSS).
 * Sin mutaciones en html/body para evitar hydration mismatch.
 */
export function lockEmbedDocumentScroll(): () => void {
  return () => undefined;
}
