import { STAFF_CLIENT_FLOW_QUERY, STAFF_CLIENT_GESTION_QUERY, STAFF_CLIENT_ID_QUERY } from "@/lib/staff/staff-sections";
import type { StaffSection } from "@/lib/staff/staff-sections";

export const STAFF_CLIENT_ORIGIN_QUERY = "from";

export function openStaffClient(href: string, origin: StaffSection) {
  const current = new URL(window.location.href);
  const destination = new URL(href, current.origin);
  const clientId = destination.searchParams.get(STAFF_CLIENT_ID_QUERY);

  // These navigations stay on the staff page and change only its query parameters.
  if (!clientId || destination.origin !== current.origin || destination.pathname !== current.pathname) return;

  destination.searchParams.set(STAFF_CLIENT_ORIGIN_QUERY, origin);
  if (destination.href === current.href) return;
  window.history.pushState({ openedStaffClientId: clientId }, "", destination);
}

export function returnToStaffClientOrigin(clientId: string): boolean {
  if (window.history.state?.openedStaffClientId !== clientId) return false;
  window.history.back();
  return true;
}

export function consumeStaffClientLaunch() {
  const url = new URL(window.location.href);
  url.searchParams.delete(STAFF_CLIENT_FLOW_QUERY);
  url.searchParams.delete(STAFF_CLIENT_GESTION_QUERY);
  const openedStaffClientId = window.history.state?.openedStaffClientId;
  window.history.replaceState(openedStaffClientId ? { openedStaffClientId } : null, "", url);
}
