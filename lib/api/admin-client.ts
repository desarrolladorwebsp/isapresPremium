import type {
  PlanPdfUploadResult,
  UploadPlanPdfRequest,
} from "@/lib/plan-pdf-storage/types";
import type { Clinic } from "@/types/clinic";
import type {
  CompanyAgreementAdminListResult,
  CompanyAgreementImportResult,
} from "@/types/company-agreement";
import type { PlanBulkImportResult } from "@/types/plan-bulk-import";
import type { HealthPlan } from "@/types/plan";
import type { PlanPdfReport } from "@/types/plan-pdf-report";
import type { PlanPdfBatchUploadResponse } from "@/types/plan-pdf-upload";
import type { QuoteRecord } from "@/types/quote";
import type { IsapreRecord, UpdateIsapreGesInput } from "@/types/isapre";
import type {
  CreateStaffAccountInput,
  PendingStaffInviteRecord,
  StaffAccountRecord,
  StaffRealm,
  UpdateStaffAccountInput,
} from "@/types/staff-account";
import type { UserRecord } from "@/types/user";
import type { CalendarCallEvent } from "@/types/calendar";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  let data: (T & { error?: string }) | null = null;

  try {
    data = (await response.json()) as T & { error?: string };
  } catch {
    if (!response.ok) {
      throw new Error(
        `Error en la solicitud (${response.status}). El servidor no respondió correctamente.`,
      );
    }
    throw new Error("Respuesta inválida del servidor.");
  }

  if (!response.ok) {
    throw new Error(data?.error ?? `Error en la solicitud (${response.status}).`);
  }

  return data as T;
}

export async function fetchPlans(): Promise<HealthPlan[]> {
  const response = await fetch("/api/plans");
  return parseJsonResponse<HealthPlan[]>(response);
}

export async function createPlan(plan: HealthPlan): Promise<HealthPlan> {
  const response = await fetch("/api/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan),
  });
  return parseJsonResponse<HealthPlan>(response);
}

export async function updatePlan(plan: HealthPlan): Promise<HealthPlan> {
  const response = await fetch(
    `/api/plans/${encodeURIComponent(plan.unique_code)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    },
  );
  return parseJsonResponse<HealthPlan>(response);
}

export async function deletePlan(uniqueCode: string): Promise<void> {
  const response = await fetch(
    `/api/plans/${encodeURIComponent(uniqueCode)}`,
    { method: "DELETE" },
  );
  await parseJsonResponse<{ ok: boolean }>(response);
}

export async function fetchClinics(): Promise<Clinic[]> {
  const response = await fetch("/api/clinics");
  return parseJsonResponse<Clinic[]>(response);
}

export async function fetchQuotes(): Promise<QuoteRecord[]> {
  const response = await fetch("/api/quotes");
  return parseJsonResponse<QuoteRecord[]>(response);
}

export async function fetchExecutiveClients(): Promise<UserRecord[]> {
  const response = await fetch("/api/executive/clients");
  return parseJsonResponse<UserRecord[]>(response);
}

export async function fetchCalendarCallEvents(input: {
  from: string;
  to: string;
}): Promise<CalendarCallEvent[]> {
  const params = new URLSearchParams({
    from: input.from,
    to: input.to,
  });
  const response = await fetch(
    `/api/executive/calendar/events?${params.toString()}`,
  );
  const data = await parseJsonResponse<{ events: CalendarCallEvent[] }>(response);
  return data.events;
}

export interface CalendlySchedulingLinkResult {
  teamId: "EQUIPO_1" | "EQUIPO_2" | "EQUIPO_3";
  teamLabel: string;
  schedulingUrl: string;
  prefill: { email: string | null; name: string | null } | null;
  configuredTeams: Array<{
    teamId: string;
    label: string;
    ready: boolean;
  }>;
}

/** Link de agendamiento Calendly (round-robin o equipo explícito). */
export async function fetchCalendlySchedulingLink(input: {
  clientId?: string;
  team?: "EQUIPO_1" | "EQUIPO_2" | "EQUIPO_3";
  auto?: boolean;
}): Promise<CalendlySchedulingLinkResult> {
  const params = new URLSearchParams();
  if (input.team) params.set("team", input.team);
  else if (input.auto !== false) params.set("auto", "1");
  if (input.clientId) params.set("clientId", input.clientId);
  const response = await fetch(
    `/api/executive/calendly/scheduling-link?${params.toString()}`,
  );
  return parseJsonResponse<CalendlySchedulingLinkResult>(response);
}

export async function sendExecutiveSelectedPlansEmail(input: {
  clientId: string;
  profileSummary?: string | null;
  plans: Array<{
    isapre: string;
    name: string;
    code: string;
    type: string;
    priceUf: string;
    priceClp: string;
    listPriceUf: string | null;
    listPriceClp: string | null;
    convenioLabel: string | null;
    hospitalCoverage: string;
    ambulatoryCoverage: string;
    pdfUrl: string | null;
  }>;
}): Promise<{ ok: true; id: string; email: string; planCount: number }> {
  const response = await fetch("/api/executive/share-plans-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse(response);
}

export async function createExecutiveClient(
  input: import("@/types/user").CreateManualClientInput,
): Promise<UserRecord> {
  const response = await fetch("/api/executive/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse<UserRecord>(response);
}

export async function fetchQuoteById(quoteId: string): Promise<QuoteRecord> {
  const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`);
  return parseJsonResponse<QuoteRecord>(response);
}

export async function fetchQuoteActivities(
  quoteId: string,
): Promise<import("@/types/quote-activity").QuoteActivityRecord[]> {
  const response = await fetch(
    `/api/quotes/${encodeURIComponent(quoteId)}/activities`,
  );
  return parseJsonResponse(response);
}

export async function fetchLatestQuoteActivities(
  quoteIds: string[],
): Promise<
  Record<string, import("@/types/quote-activity").QuoteActivityRecord>
> {
  const response = await fetch("/api/quotes/activities/latest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quoteIds }),
  });
  return parseJsonResponse(response);
}

export async function fetchIsapres(): Promise<IsapreRecord[]> {
  const response = await fetch("/api/isapres");
  return parseJsonResponse<IsapreRecord[]>(response);
}

export async function fetchPlanPdfReport(): Promise<PlanPdfReport> {
  const response = await fetch("/api/admin/plan-pdf-report");
  return parseJsonResponse<PlanPdfReport>(response);
}

export async function uploadPlanPdfsAdmin(input: {
  files: File[];
  uniqueCode?: string;
  isapreId?: string;
  allowReplace?: boolean;
}): Promise<PlanPdfBatchUploadResponse> {
  const formData = new FormData();

  for (const file of input.files) {
    formData.append("files", file);
  }

  if (input.uniqueCode?.trim()) {
    formData.append("uniqueCode", input.uniqueCode.trim());
  }

  if (input.isapreId?.trim()) {
    formData.append("isapreId", input.isapreId.trim());
  }

  formData.append("allowReplace", input.allowReplace === false ? "false" : "true");

  const response = await fetch("/api/admin/plan-pdf-upload", {
    method: "POST",
    body: formData,
  });

  return parseJsonResponse<PlanPdfBatchUploadResponse>(response);
}

export async function fetchCompanyAgreementsAdmin(input?: {
  q?: string;
  isapreId?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<CompanyAgreementAdminListResult> {
  const params = new URLSearchParams();
  if (input?.q?.trim()) params.set("q", input.q.trim());
  if (input?.isapreId?.trim()) params.set("isapreId", input.isapreId.trim());
  if (typeof input?.active === "boolean") {
    params.set("active", input.active ? "true" : "false");
  }
  if (input?.page) params.set("page", String(input.page));
  if (input?.pageSize) params.set("pageSize", String(input.pageSize));

  const query = params.toString();
  const response = await fetch(
    `/api/admin/company-agreements${query ? `?${query}` : ""}`,
  );
  return parseJsonResponse<CompanyAgreementAdminListResult>(response);
}

export async function importCompanyAgreementsAdmin(input: {
  file: File;
  isapreId: string;
  discountPercent?: number;
}): Promise<CompanyAgreementImportResult> {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("isapreId", input.isapreId.trim());
  if (
    typeof input.discountPercent === "number" &&
    Number.isFinite(input.discountPercent)
  ) {
    formData.append("discountPercent", String(input.discountPercent));
  }

  const response = await fetch("/api/admin/company-agreements/import", {
    method: "POST",
    body: formData,
  });

  return parseJsonResponse<CompanyAgreementImportResult>(response);
}

export async function importPlansBulkAdmin(
  file: File,
): Promise<PlanBulkImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/admin/plans/import", {
    method: "POST",
    body: formData,
  });

  return parseJsonResponse<PlanBulkImportResult>(response);
}

export async function updateIsapreGes(
  id: string,
  input: UpdateIsapreGesInput,
): Promise<{ isapre: IsapreRecord }> {
  const response = await fetch(`/api/isapres/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse<{ isapre: IsapreRecord }>(response);
}

export async function fetchStaffAccounts(): Promise<{
  accounts: StaffAccountRecord[];
  pendingInvites: PendingStaffInviteRecord[];
}> {
  const response = await fetch("/api/admin/accounts");
  return parseJsonResponse<{
    accounts: StaffAccountRecord[];
    pendingInvites: PendingStaffInviteRecord[];
  }>(response);
}

export async function createStaffAccount(
  input: CreateStaffAccountInput,
): Promise<{ message: string; pendingInvite: PendingStaffInviteRecord }> {
  const response = await fetch("/api/admin/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse<{
    message: string;
    pendingInvite: PendingStaffInviteRecord;
  }>(response);
}

export async function assignQuoteToExecutive(
  quoteId: string,
  input: { assignToMe?: boolean; executiveAccountId?: string | null; status?: QuoteRecord["status"] },
): Promise<QuoteRecord> {
  const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse<QuoteRecord>(response);
}

export async function updateQuoteLead(
  quoteId: string,
  input: { executiveAccountId?: string | null; status?: QuoteRecord["status"] },
): Promise<QuoteRecord> {
  const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse<QuoteRecord>(response);
}

export async function distributeUnassignedQuotes(): Promise<{
  assigned: number;
  remaining: number;
  message: string;
}> {
  const response = await fetch("/api/quotes/distribute", { method: "POST" });
  return parseJsonResponse<{
    assigned: number;
    remaining: number;
    message: string;
  }>(response);
}

export interface ExecutiveAssignmentStat {
  executiveId: string;
  fullName: string;
  email: string;
  active: boolean;
  assignedCount: number;
}

export async function fetchExecutiveAssignmentStats(): Promise<
  ExecutiveAssignmentStat[]
> {
  const response = await fetch("/api/quotes/assignment-stats");
  return parseJsonResponse<ExecutiveAssignmentStat[]>(response);
}

export async function fetchExecutiveAccounts(): Promise<StaffAccountRecord[]> {
  const { accounts } = await fetchStaffAccounts();
  return accounts.filter(
    (account) =>
      account.realm === "executive" &&
      account.active &&
      account.onboardingCompleted !== false,
  );
}

export async function deleteStaffAccount(
  realm: StaffRealm,
  id: string,
): Promise<{ message: string }> {
  const response = await fetch(
    `/api/admin/accounts/${encodeURIComponent(id)}?realm=${realm}`,
    { method: "DELETE" },
  );
  return parseJsonResponse<{ message: string }>(response);
}

export async function resendPendingStaffInvite(
  inviteId: string,
): Promise<{ message: string }> {
  const response = await fetch(
    `/api/admin/accounts/${encodeURIComponent(inviteId)}?action=resend-pending-invite`,
    { method: "POST" },
  );
  return parseJsonResponse<{ message: string }>(response);
}

export async function cancelPendingStaffInvite(
  inviteId: string,
): Promise<{ message: string }> {
  const response = await fetch(
    `/api/admin/accounts/${encodeURIComponent(inviteId)}?action=cancel-pending-invite`,
    { method: "POST" },
  );
  return parseJsonResponse<{ message: string }>(response);
}

export async function assignClientToExecutive(
  userId: string,
  executiveAccountId: string | null,
): Promise<UserRecord> {
  const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignedExecutiveId: executiveAccountId }),
  });
  return parseJsonResponse<UserRecord>(response);
}

export async function distributeUnassignedClients(): Promise<{
  assigned: number;
  remaining: number;
  message: string;
}> {
  const response = await fetch("/api/executive/clients/distribute", {
    method: "POST",
  });
  return parseJsonResponse<{
    assigned: number;
    remaining: number;
    message: string;
  }>(response);
}

export async function updateClientPipeline(
  clientId: string,
  input: import("@/types/client-pipeline").UpdateClientPipelineInput,
): Promise<UserRecord> {
  const response = await fetch(
    `/api/executive/clients/${encodeURIComponent(clientId)}/pipeline`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseJsonResponse<UserRecord>(response);
}

export async function redirectClientToPremium(
  clientId: string,
  input: import("@/types/client-pipeline").RedirectClientToPremiumInput,
): Promise<UserRecord> {
  const response = await fetch(
    `/api/executive/clients/${encodeURIComponent(clientId)}/redirect-premium`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseJsonResponse<UserRecord>(response);
}

export async function redirectClientToZoom(
  clientId: string,
  input: import("@/types/client-pipeline").RedirectClientFromPremiumInput,
): Promise<UserRecord> {
  const response = await fetch(
    `/api/executive/clients/${encodeURIComponent(clientId)}/redirect-zoom`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseJsonResponse<UserRecord>(response);
}

export async function redirectClientToIsapres(
  clientId: string,
  input: import("@/types/client-pipeline").RedirectClientFromPremiumInput,
): Promise<UserRecord> {
  const response = await fetch(
    `/api/executive/clients/${encodeURIComponent(clientId)}/redirect-isapres`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseJsonResponse<UserRecord>(response);
}

export async function fetchPremiumExecutives(): Promise<
  Array<{ id: string; fullName: string; email: string }>
> {
  const response = await fetch("/api/executive/premium-executives");
  const data = await parseJsonResponse<{
    executives: Array<{ id: string; fullName: string; email: string }>;
  }>(response);
  return data.executives;
}

export async function fetchEligibleExecutives(
  kind: "ZOOM" | "ISAPRES" | "ISAPRES_PREMIUM",
): Promise<Array<{ id: string; fullName: string; email: string }>> {
  const response = await fetch(
    `/api/executive/eligible-executives?kind=${encodeURIComponent(kind)}`,
  );
  const data = await parseJsonResponse<{
    executives: Array<{ id: string; fullName: string; email: string }>;
  }>(response);
  return data.executives;
}

export async function updateClientAdvisedPlan(
  clientId: string,
  input: import("@/types/client-plan").UpdateClientAdvisedPlanInput,
): Promise<UserRecord> {
  const response = await fetch(
    `/api/executive/clients/${encodeURIComponent(clientId)}/advised-plan`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseJsonResponse<UserRecord>(response);
}

export async function fetchClientActivities(
  clientId: string,
): Promise<import("@/types/client-activity").ClientActivityRecord[]> {
  const response = await fetch(
    `/api/executive/clients/${encodeURIComponent(clientId)}/activities`,
  );
  return parseJsonResponse(response);
}

export async function updateStaffAccount(
  realm: StaffRealm,
  id: string,
  input: UpdateStaffAccountInput,
): Promise<{ account: StaffAccountRecord }> {
  const response = await fetch(
    `/api/admin/accounts/${encodeURIComponent(id)}?realm=${realm}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseJsonResponse<{ account: StaffAccountRecord }>(response);
}

export async function createClinic(clinic: Clinic): Promise<Clinic> {
  const response = await fetch("/api/clinics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clinic),
  });
  return parseJsonResponse<Clinic>(response);
}

export async function updateClinic(clinic: Clinic): Promise<Clinic> {
  const response = await fetch(
    `/api/clinics/${encodeURIComponent(clinic.id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clinic),
    },
  );
  return parseJsonResponse<Clinic>(response);
}

export async function deleteClinic(clinicId: string): Promise<void> {
  const response = await fetch(
    `/api/clinics/${encodeURIComponent(clinicId)}`,
    { method: "DELETE" },
  );
  await parseJsonResponse<{ ok: boolean }>(response);
}

export interface UpdateClinicLocationResult extends Clinic {
  queried: string;
}

export interface UpdateClinicLocationPayload {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
}

export async function updateClinicLocation(
  clinicId: string,
  payload: UpdateClinicLocationPayload,
): Promise<UpdateClinicLocationResult> {
  const response = await fetch(
    `/api/clinics/${encodeURIComponent(clinicId)}/location`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return parseJsonResponse<UpdateClinicLocationResult>(response);
}

export async function clearClinicLocation(clinicId: string): Promise<void> {
  const response = await fetch(
    `/api/clinics/${encodeURIComponent(clinicId)}/location`,
    { method: "DELETE" },
  );
  await parseJsonResponse<{ ok: boolean }>(response);
}

export async function uploadPlanPdf(
  file: File,
  params: UploadPlanPdfRequest,
): Promise<PlanPdfUploadResult & { publicId: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("uniqueCode", params.uniqueCode);
  formData.append("isapre", params.isapre);

  if (params.previousStoragePath) {
    formData.append("previousStoragePath", params.previousStoragePath);
  }

  const response = await fetch("/api/plans/pdf", {
    method: "POST",
    body: formData,
  });

  return parseJsonResponse<PlanPdfUploadResult & { publicId: string }>(response);
}

export function createEmptyPlan(): HealthPlan {
  return {
    isapre: "Consalud",
    plan_name: "",
    unique_code: "",
    base_price_uf: 1,
    ges_premium_uf: 0.731,
    plan_type: "free_choice",
    has_top: false,
    additional_notes: null,
    pdf_url: null,
    pdf_public_id: null,
    zones: [],
    coverage: [],
  };
}

export function createEmptyClinic(): Clinic {
  return { id: "", name: "", zones: [] };
}
