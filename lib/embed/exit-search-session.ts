import { EMBED_EXIT_SEARCH_SESSION_KEY } from "@/lib/embed/constants";

export function markEmbedExitSearchPending(): void {
  try {
    sessionStorage.setItem(EMBED_EXIT_SEARCH_SESSION_KEY, "1");
  } catch {
    // sessionStorage no disponible
  }
}

export function readEmbedExitSearchPending(): boolean {
  try {
    return sessionStorage.getItem(EMBED_EXIT_SEARCH_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearEmbedExitSearchPending(): void {
  try {
    sessionStorage.removeItem(EMBED_EXIT_SEARCH_SESSION_KEY);
  } catch {
    // ignore
  }
}
