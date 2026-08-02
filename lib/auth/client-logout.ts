import { STAFF_LOGIN_PATH } from "@/lib/auth/constants";
import { clearExecutiveQueryCache } from "@/lib/query/query-client";

/** Cierra sesión staff: borra cookies httpOnly vía API y recarga en el login. */
export async function performStaffLogout(
  loginPath: string = STAFF_LOGIN_PATH,
): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } finally {
    // Evita filtrar datos del usuario anterior en la misma pestaña.
    clearExecutiveQueryCache();
    window.location.assign(loginPath);
  }
}
