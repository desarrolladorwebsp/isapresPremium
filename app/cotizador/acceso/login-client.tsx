"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { StaffAccessLayout } from "@/components/auth/staff-access-layout";
import { STAFF_DEFAULT_HOME } from "@/lib/auth/constants";

function StaffLoginClient() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const redirectTo =
    next && next.startsWith("/cotizador") ? next : STAFF_DEFAULT_HOME;

  return (
    <StaffAccessLayout>
      <LoginForm redirectTo={redirectTo} />
    </StaffAccessLayout>
  );
}

export default function StaffLoginPageClient() {
  return (
    <Suspense
      fallback={
        <StaffAccessLayout>
          <div className="text-sm text-muted">Cargando...</div>
        </StaffAccessLayout>
      }
    >
      <StaffLoginClient />
    </Suspense>
  );
}
