"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CotizadorWorkspace } from "@/components/cotizador/cotizador-workspace";
import { ExecutiveToastStack } from "@/components/executive/executive-toast";
import { useExecutiveToast } from "@/hooks/use-executive-toast";
import { ClinicsPanel } from "@/components/admin/clinics-panel";
import { CompanyAgreementsPanel } from "@/components/admin/company-agreements-panel";
import { GesPanel } from "@/components/admin/ges-panel";
import { PlansAndPdfsAdminView } from "@/components/admin/plans-and-pdfs-admin-view";
import { UsersPanel } from "@/components/admin/users-panel";
import { ExecutiveAdminProspectsView } from "@/components/executive/admin/executive-admin-prospects-view";
import { ExecutiveClientsPanel } from "@/components/executive/executive-clients-panel";
import { ExecutiveCalendarPanel } from "@/components/executive/executive-calendar-panel";
import { ExecutiveClinicsMapPanel } from "@/components/executive/executive-clinics-map-panel";
import { ExecutiveDashboardHome } from "@/components/executive/executive-dashboard-home";
import { ExecutiveQuotesPanel } from "@/components/executive/executive-quotes-panel";
import {
  ExecutiveShell,
  type ExecutiveSection,
} from "@/components/executive/executive-shell";
import { ExecutiveQueryProvider } from "@/components/providers/executive-query-provider";
import { useStaffSession } from "@/hooks/use-auth-session";
import { useExecutiveClinicsQuery } from "@/hooks/query/use-executive-clinics-query";
import { useExecutivePlansQuery } from "@/hooks/query/use-executive-plans-query";
import { executiveKeys } from "@/lib/query/executive-keys";
import {
  isStaffSection,
  STAFF_SECTION_QUERY,
  staffSectionHref,
  type StaffSection,
} from "@/lib/staff/staff-sections";

function ExecutiveDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { allowedSections, loading: sessionLoading } = useStaffSession();

  const [section, setSection] = useState<ExecutiveSection>("inicio");
  const { toasts, notify, dismiss } = useExecutiveToast();

  const sectionSet = useMemo(
    () => new Set<StaffSection>(allowedSections),
    [allowedSections],
  );

  const canAccessSection = useCallback(
    (next: StaffSection) => sectionSet.has(next),
    [sectionSet],
  );

  const needsClinics =
    (section === "clinicas" ||
      section === "reportes-pdf" ||
      section === "mapa") &&
    canAccessSection(section);

  const needsPlans =
    (section === "clinicas" || section === "reportes-pdf") &&
    canAccessSection(section);

  const clinicsQuery = useExecutiveClinicsQuery({ enabled: needsClinics });
  const plansQuery = useExecutivePlansQuery({ enabled: needsPlans });

  const clinics = clinicsQuery.data ?? [];
  const plans = plansQuery.data ?? [];
  const loadingCatalog =
    (needsClinics && clinicsQuery.isLoading) ||
    (needsPlans && plansQuery.isLoading);

  useEffect(() => {
    if (sessionLoading || allowedSections.length === 0) return;

    const querySection = searchParams.get(STAFF_SECTION_QUERY);
    if (isStaffSection(querySection)) {
      if (!canAccessSection(querySection)) {
        setSection("inicio");
        router.replace(staffSectionHref("inicio"));
        return;
      }
      setSection(querySection);
      return;
    }

    if (!canAccessSection(section)) {
      setSection("inicio");
      router.replace(staffSectionHref("inicio"));
    }
  }, [
    searchParams,
    canAccessSection,
    router,
    sessionLoading,
    section,
    allowedSections.length,
  ]);

  useEffect(() => {
    if (clinicsQuery.isError) {
      notify(
        clinicsQuery.error instanceof Error
          ? clinicsQuery.error.message
          : "No se pudieron cargar las clínicas.",
        "error",
      );
    }
  }, [clinicsQuery.isError, clinicsQuery.error, notify]);

  useEffect(() => {
    if (plansQuery.isError) {
      notify(
        plansQuery.error instanceof Error
          ? plansQuery.error.message
          : "No se pudo cargar el catálogo.",
        "error",
      );
    }
  }, [plansQuery.isError, plansQuery.error, notify]);

  const refreshClinics = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: executiveKeys.clinics() });
  }, [queryClient]);

  const refreshCatalog = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: executiveKeys.clinics() }),
      queryClient.invalidateQueries({ queryKey: executiveKeys.plans() }),
    ]);
  }, [queryClient]);

  function handleSectionChange(next: ExecutiveSection) {
    if (!canAccessSection(next)) return;
    setSection(next);
    router.replace(staffSectionHref(next), { scroll: false });
  }

  return (
    <>
      <ExecutiveShell
        activeSection={section}
        onSectionChange={handleSectionChange}
        allowedSections={allowedSections}
      >
        {section === "inicio" && canAccessSection("inicio") ? (
          <ExecutiveDashboardHome />
        ) : null}

        {section === "calendario" && canAccessSection("calendario") ? (
          <ExecutiveCalendarPanel />
        ) : null}

        {section === "cotizador" && canAccessSection("cotizador") ? (
          <CotizadorWorkspace
            variant="executive"
            embeddedInExecutiveShell
            onNotify={notify}
          />
        ) : null}

        {section === "clientes" && canAccessSection("clientes") ? (
          <ExecutiveClientsPanel onNotify={notify} />
        ) : null}

        {section === "cotizaciones" && canAccessSection("cotizaciones") ? (
          <ExecutiveQuotesPanel onNotify={notify} />
        ) : null}

        {section === "mapa" && canAccessSection("mapa") ? (
          <ExecutiveClinicsMapPanel
            clinics={clinics}
            loading={loadingCatalog && clinics.length === 0}
            refreshing={clinicsQuery.isFetching}
            onRefresh={refreshClinics}
          />
        ) : null}

        {section === "prospectos" && canAccessSection("prospectos") ? (
          <ExecutiveAdminProspectsView onNotify={notify} embedded />
        ) : null}

        {section === "usuarios" && canAccessSection("usuarios") ? (
          <UsersPanel onNotify={notify} canManage />
        ) : null}

        {section === "clinicas" && canAccessSection("clinicas") ? (
          <ClinicsPanel
            clinics={clinics}
            plans={plans}
            loading={loadingCatalog && clinics.length === 0 && plans.length === 0}
            onRefresh={refreshCatalog}
            onNotify={notify}
            canManage
          />
        ) : null}

        {section === "ges" && canAccessSection("ges") ? (
          <GesPanel onNotify={notify} canManage />
        ) : null}

        {section === "reportes-pdf" && canAccessSection("reportes-pdf") ? (
          <PlansAndPdfsAdminView
            plans={plans}
            clinics={clinics}
            loading={loadingCatalog && clinics.length === 0 && plans.length === 0}
            onRefresh={refreshCatalog}
            onNotify={notify}
          />
        ) : null}

        {section === "convenios" && canAccessSection("convenios") ? (
          <CompanyAgreementsPanel onNotify={notify} />
        ) : null}
      </ExecutiveShell>

      <ExecutiveToastStack toasts={toasts} onDismiss={dismiss} />
    </>
  );
}

export function ExecutiveDashboard() {
  return (
    <ExecutiveQueryProvider>
      <ExecutiveDashboardContent />
    </ExecutiveQueryProvider>
  );
}
