const FAVICON_LINK_SELECTOR =
  'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]';

function resolveFaviconMimeType(href: string): string | undefined {
  const normalized = href.split("?")[0]?.toLowerCase() ?? href;

  if (normalized.endsWith(".svg")) return "image/svg+xml";
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (normalized.endsWith(".ico")) return "image/x-icon";
  if (normalized.endsWith(".webp")) return "image/webp";

  return undefined;
}

type FaviconLinkSnapshot = {
  link: HTMLLinkElement;
  href: string;
  type: string;
};

/** Actualiza los `<link rel="icon">` del documento y devuelve cleanup. */
export function applyPartnerFaviconToDocument(href: string): () => void {
  if (typeof document === "undefined") return () => undefined;

  const links = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>(FAVICON_LINK_SELECTOR),
  );

  const snapshots: FaviconLinkSnapshot[] = links.map((link) => ({
    link,
    href: link.href,
    type: link.type,
  }));

  const mimeType = resolveFaviconMimeType(href);
  let createdLink: HTMLLinkElement | null = null;

  if (links.length === 0) {
    createdLink = document.createElement("link");
    createdLink.rel = "icon";
    createdLink.href = href;
    if (mimeType) createdLink.type = mimeType;
    document.head.appendChild(createdLink);
  } else {
    for (const link of links) {
      link.href = href;
      if (mimeType) {
        link.type = mimeType;
      } else {
        link.removeAttribute("type");
      }
    }
  }

  return () => {
    if (createdLink) {
      createdLink.remove();
      return;
    }

    for (const snapshot of snapshots) {
      snapshot.link.href = snapshot.href;
      if (snapshot.type) {
        snapshot.link.type = snapshot.type;
      } else {
        snapshot.link.removeAttribute("type");
      }
    }
  };
}
