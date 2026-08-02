import { Suspense } from "react";
import { ExecutiveAuthGate } from "@/components/auth/executive-auth-gate";
import { PremiumExecutiveShell } from "@/components/executive/premium-executive-shell";
import { ExecutiveDashboard } from "@/components/executive/executive-dashboard";
import { requireStaffSessionCookie } from "@/lib/auth/guards";

export default async function CotizadorExecutivesPage() {
  await requireStaffSessionCookie();
  return (
    <PremiumExecutiveShell variant="dashboard">
      <ExecutiveAuthGate>
        <Suspense
          fallback={
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
              Cargando panel…
            </div>
          }
        >
          <ExecutiveDashboard />
        </Suspense>
      </ExecutiveAuthGate>
    </PremiumExecutiveShell>
  );
}
