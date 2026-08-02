import { StaffAuthRedirectFallback } from "@/components/auth/staff-auth-redirect-fallback";
import { PremiumExecutiveShell } from "@/components/executive/premium-executive-shell";
import { EXECUTIVE_HOME_PATH, STAFF_LOGIN_PATH } from "@/lib/auth/constants";

export default function ExecutivePanelLoading() {
  const loginUrl = `${STAFF_LOGIN_PATH}?next=${encodeURIComponent(EXECUTIVE_HOME_PATH)}`;

  return (
    <PremiumExecutiveShell variant="dashboard">
      <StaffAuthRedirectFallback
        title="Cargando panel…"
        message="Preparando tu espacio de trabajo."
        href={loginUrl}
        linkLabel="Ir al inicio de sesión"
      />
    </PremiumExecutiveShell>
  );
}
