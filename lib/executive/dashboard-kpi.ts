import type {
  ExecutiveAgendaStatItem,
  NewClientIntakeSource,
} from "@/lib/client-pipeline/agenda-stats";

export const DASHBOARD_KPI_HELP = [
  {
    label: "Gestiones hoy",
    measure:
      "Pendientes para hoy: reuniones Zoom, confirmaciones Zoom y llamados agendados para este día.",
  },
  {
    label: "Atrasadas",
    measure:
      "Reunión Zoom de un día anterior que no se marcó como hecha ni se reagendó; confirmación Zoom atrasada; o cliente nuevo asignado antes de hoy sin ninguna gestión. Si lo asignaron hoy, no entra. Con un primer contacto (aunque sea No contesta) sale de este KPI.",
  },
  {
    label: "Futuras",
    measure: "Reuniones, confirmaciones y llamados agendados para los próximos días.",
  },
  {
    label: "Clientes nuevos",
    measure:
      "Clientes nuevos sin primer contacto. Al abrirlos verás si llegaron por la web, si los registró el ejecutivo o si se los asignaron. Cuentan para quien los tiene asignados ahora, en el mes del dashboard.",
  },
] as const;

export const NEW_CLIENT_INTAKE_LABELS: Record<
  NewClientIntakeSource,
  { title: string; hint: string }
> = {
  web: {
    title: "Llegaron por la web",
    hint: "Cotizador o formulario; el sistema se los asignó.",
  },
  self_registered: {
    title: "Los registró el ejecutivo",
    hint: "El mismo ejecutivo de la cartera los dio de alta.",
  },
  assigned: {
    title: "Se los asignaron",
    hint: "Un supervisor u otro rol se los pasó a su cartera.",
  },
};

const INTAKE_ORDER: NewClientIntakeSource[] = [
  "web",
  "self_registered",
  "assigned",
];

export function groupNewClientItemsByIntake(
  items: ExecutiveAgendaStatItem[],
): Array<{
  source: NewClientIntakeSource;
  title: string;
  hint: string;
  items: ExecutiveAgendaStatItem[];
}> {
  return INTAKE_ORDER.map((source) => ({
    source,
    title: NEW_CLIENT_INTAKE_LABELS[source].title,
    hint: NEW_CLIENT_INTAKE_LABELS[source].hint,
    items: items.filter((item) => (item.intakeSource ?? "assigned") === source),
  })).filter((group) => group.items.length > 0);
}
