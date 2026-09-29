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
  {
    label: "Cotizaciones enviadas",
    measure:
      "Documentos comerciales enviados por email o WhatsApp en el mes, según quien los emitió. Siguen contando si después pasan a recepcionada, aceptada o rechazada. Borrador y anulada no entran. El filtro de isapre aplica a enviadas, recepcionadas, aceptadas y rechazadas: el documento cuenta una vez si incluye al menos una isapre elegida.",
  },
  {
    label: "Recepcionadas",
    measure:
      "Documentos que siguen en estado recepcionada. La fecha es el día en que el cliente confirmó la recepción. Si después se aceptan o rechazan, salen de esta tarjeta.",
  },
  {
    label: "Aceptadas",
    measure:
      "Documentos en estado aceptada. La fecha es el día en que el cliente aceptó. Usan el mismo mes, ejecutivo e isapre que el resto de cotizaciones.",
  },
  {
    label: "Rechazadas",
    measure:
      "Documentos en estado rechazada. La fecha es el día en que el cliente rechazó. Usan el mismo mes, ejecutivo e isapre que el resto de cotizaciones.",
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
