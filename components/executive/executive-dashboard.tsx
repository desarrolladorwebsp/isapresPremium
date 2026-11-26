"use client";

import { Activity, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CotizadorWorkspace } from "@/components/cotizador/cotizador-workspace";
import { ExecutiveToastStack } from "@/components/executive/executive-toast";
import { useExecutiveToast } from "@/hooks/use-executive-toast";
import { ClinicsPanel } from "@/components/admin/clinics-panel";
import { CompanyAgreementsPanel } from "@/components/admin/company-agreements-panel";
import { GesPanel } from "@/components/admin/ges-panel";
import { PlansAndPdfsAdminView } from "@/components/admin/plans-and-pdfs-admin-view";
import { SendpulseLinesPanel } from "@/components/admin/sendpulse-lines-panel";
import { AdminReportsView } from "@/components/admin/admin-reports-view";
import { UsersPanel } from "@/components/admin/users-panel";
import { ExecutiveAdminProspectsView } from "@/components/executive/admin/executive-admin-prospects-view";
import { ExecutiveClientsPanel } from "@/components/executive/executive-clients-panel";
import { ExecutiveCalendarPanel } from "@/components/executive/executive-calendar-panel";
import { ExecutiveClinicsMapPanel } from "@/components/executive/executive-clinics-map-panel";
import { createDashboardHomeState, ExecutiveDashboardHome } from "@/components/executive/executive-dashboard-home";
import { ExecutiveProfilePanel } from "@/components/executive/executive-profile-panel";
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
import { STAFF_CLIENT_ORIGIN_QUERY } from "@/lib/staff/staff-client-navigation";
import {
  defaultStaffHomeSection,
  isStaffSection,
  STAFF_CLIENT_ID_QUERY,
  STAFF_SECTION_QUERY,
  staffSectionHref,
  type StaffSection,
} from "@/lib/staff/staff-sections";

function ExecutiveDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const queryClient = useQueryClient();
  const { allowedSections, loading: sessionLoading } = useStaffSession();

  const { toasts, notify, dismiss } = useExecutiveToast();
  // Keep Inicio filters and its open list while another section is displayed.
  const [homeState, setHomeState] = useState(createDashboardHomeState);

  const sectionSet = useMemo(
    () => new Set<StaffSection>(allowedSections),
    [allowedSections],
  );

  const canAccessSection = useCallback(
    (next: StaffSection) => sectionSet.has(next),
    [sectionSet],
  );

  const querySection = searchParams.get(STAFF_SECTION_QUERY);
  const homeSection = useMemo(
    () => defaultStaffHomeSection(allowedSections),
    [allowedSections],
  );

  const section = useMemo<ExecutiveSection>(() => {
    if (isStaffSection(querySection)) {
      return canAccessSection(querySection) ? querySection : homeSection;
    }

    return homeSection;
  }, [canAccessSection, homeSection, querySection]);

  const isClientDetail = section === "clientes" && Boolean(searchParams.get(STAFF_CLIENT_ID_QUERY)?.trim());
  const clientOrigin = isClientDetail
    ? searchParams.get(STAFF_CLIENT_ORIGIN_QUERY)
    : null;

  function shouldRenderSection(candidate: StaffSection) {
    return (section === candidate || clientOrigin === candidate) && canAccessSection(candidate);
  }

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

    if (!canAccessSection(section)) {
      router.replace(staffSectionHref(homeSection), { scroll: false });
      return;
    }

    if (isStaffSection(querySection)) {
      if (!canAccessSection(querySection)) {
        router.replace(staffSectionHref(homeSection), { scroll: false });
      }
      return;
    }

    if (section !== homeSection) {
      router.replace(staffSectionHref(homeSection), { scroll: false });
    }
  }, [
    sessionLoading,
    allowedSections,
    canAccessSection,
    homeSection,
    querySection,
    router,
    section,
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
    router.replace(staffSectionHref(next), { scroll: false });
  }

  return (
    <>
      <ExecutiveShell
        activeSection={section}
        onSectionChange={handleSectionChange}
        allowedSections={allowedSections}
        isClientDetail={isClientDetail}
      >
        {section === "inicio" && canAccessSection("inicio") ? (
          <ExecutiveDashboardHome state={homeState} onStateChange={setHomeState} />
        ) : null}

        {shouldRenderSection("calendario") ? (
          <Activity mode={section === "calendario" ? "visible" : "hidden"}>
            <ExecutiveCalendarPanel />
          </Activity>
        ) : null}

        {shouldRenderSection("cotizador") ? (
          <Activity mode={section === "cotizador" ? "visible" : "hidden"}>
            <CotizadorWorkspace
              variant="executive"
              embeddedInExecutiveShell
              onNotify={notify}
            />
          </Activity>
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

        {section === "reportes" && canAccessSection("reportes") ? (
          <AdminReportsView />
        ) : null}

        {shouldRenderSection("sendpulse") ? (
          <Activity mode={section === "sendpulse" ? "visible" : "hidden"}>
            <SendpulseLinesPanel onNotify={notify} />
          </Activity>
        ) : null}

        {section === "perfil" && canAccessSection("perfil") ? (
          <ExecutiveProfilePanel onNotify={notify} />
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
