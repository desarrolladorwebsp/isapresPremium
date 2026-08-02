const SCROLL_EDGE_THRESHOLD_PX = 2;

function isEmbedDocument(): boolean {
  return document.documentElement.getAttribute("data-cotizador-embed") === "true";
}

function embedDocumentCanScroll(): boolean {
  const html = document.documentElement;
  const body = document.body;
  const htmlOverflowY = window.getComputedStyle(html).overflowY;
  const bodyOverflowY = window.getComputedStyle(body).overflowY;
  const allowsScroll =
    htmlOverflowY === "auto" ||
    htmlOverflowY === "scroll" ||
    bodyOverflowY === "auto" ||
    bodyOverflowY === "scroll";

  if (!allowsScroll) return false;

  const scrollHeight = Math.max(html.scrollHeight, body.scrollHeight);
  return scrollHeight > window.innerHeight + SCROLL_EDGE_THRESHOLD_PX;
}

function isVerticallyScrollable(element: HTMLElement): boolean {
  const { overflowY } = window.getComputedStyle(element);
  if (overflowY !== "auto" && overflowY !== "scroll") return false;
  return element.scrollHeight > element.clientHeight + SCROLL_EDGE_THRESHOLD_PX;
}

function canScrollElementY(element: HTMLElement, deltaY: number): boolean {
  if (!isVerticallyScrollable(element)) return false;

  const atTop = element.scrollTop <= SCROLL_EDGE_THRESHOLD_PX;
  const atBottom =
    element.scrollTop + element.clientHeight >=
    element.scrollHeight - SCROLL_EDGE_THRESHOLD_PX;

  if (deltaY < 0) return !atTop;
  if (deltaY > 0) return !atBottom;
  return false;
}

/**
 * Reenvía la rueda al sitio anfitrión cuando el iframe no tiene scroll interno
 * (modo embed) o cuando ya llegó al borde de un contenedor desplazable interno.
 */
export function shouldForwardEmbedWheelToParent(event: WheelEvent): boolean {
  if (event.deltaY === 0 && event.deltaX === 0) return false;

  let node = event.target;
  if (!(node instanceof HTMLElement)) {
    node = document.body;
  }

  while (node instanceof HTMLElement) {
    if (canScrollElementY(node, event.deltaY)) {
      return false;
    }
    if (node === document.body || node === document.documentElement) break;
    node = node.parentElement;
  }

  // En embed el scroll principal vive en la página anfitriona (WordPress, etc.).
  if (isEmbedDocument() && !embedDocumentCanScroll()) {
    return true;
  }

  const scrollHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  );
  const clientHeight = window.innerHeight;

  if (scrollHeight <= clientHeight + SCROLL_EDGE_THRESHOLD_PX) {
    return true;
  }

  const scrollTop = window.scrollY;
  const atTop = scrollTop <= SCROLL_EDGE_THRESHOLD_PX;
  const atBottom =
    scrollTop + clientHeight >= scrollHeight - SCROLL_EDGE_THRESHOLD_PX;

  if (event.deltaY < 0) return atTop;
  if (event.deltaY > 0) return atBottom;
  return true;
}
