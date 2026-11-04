import type {
  ExecutiveAgendaStatItem,
  NewClientIntakeSource,
} from "@/lib/client-pipeline/agenda-stats";

export const DASHBOARD_KPI_HELP = [
  {
    label: "Clientes activos",
    measure: "Cartera actual: cada cliente cuenta una vez, excluyendo únicamente Perdido y En pausa. Incluye Cerrados y Recepcionados y clientes registrados en meses anteriores. Respeta el ejecutivo seleccionado; no depende de isapres. Se muestra con el mes actual de Chile o Todos los meses y se oculta en períodos históricos. Al abrirla muestra la lista y el acceso a cada ficha.",
  },
  {
    label: "Recordatorios de hoy",
    measure: "Notas libres de la ficha agendadas para el día actual en Chile y dentro del mes elegido. Cada recordatorio cuenta una vez para el responsable actual del cliente, sin repetirlo en Gestiones hoy. Excluye En pausa, Perdido, Cerrado y Recepcionado. Al abrir la tarjeta puedes ver la nota, la hora y la ficha.",
  },
  {
    label: "Gestiones hoy",
    measure:
      "Pendientes para hoy: reuniones Zoom, confirmaciones Zoom y llamados agendados para este día. Incluye anualidades disponibles durante su mes de vencimiento, desde el primer día del mes, y clientes que volvieron de una pausa como Pendiente. Los clientes En pausa no cuentan.",
  },
  {
    label: "Atrasadas",
    measure:
      "Reunión Zoom de un día anterior que no se marcó como hecha ni se reagendó; confirmación Zoom atrasada; o cliente nuevo asignado antes de hoy sin ninguna gestión. Si lo asignaron hoy, no entra. Con un primer contacto (aunque sea No contesta) el cliente nuevo sale de este KPI. Incluye también anualidades pendientes de meses anteriores al mes elegido: siguen aquí hasta desmarcarlas o cambiar su vencimiento, incluso si su proceso comercial estaba cerrado.",
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
    label: "Cotizaciones activas",
    measure: "Clientes únicos con documentos en estado Enviada, pendientes de aceptación o rechazo. Respeta el mes de envío seleccionado, el ejecutivo y las isapres. Con Todos los meses incluye pendientes antiguas. No cuenta borradores, anuladas, aceptadas, recepcionadas ni rechazadas. Un cliente con varias cotizaciones pendientes suma uno; el detalle agrupa sus documentos.",
  },
  {
    label: "Cotizaciones enviadas",
    measure:
      "Documentos comerciales enviados por email o WhatsApp en el mes, según quien los emitió. Siguen contando si después pasan a recepcionada, aceptada o rechazada. Borrador y anulada no entran. El filtro de isapre aplica a enviadas, activas, recepcionadas, aceptadas y rechazadas: el documento cuenta una vez si incluye al menos una isapre elegida.",
  },
  {
    label: "Recepcionadas",
    measure:
      "Documentos en estado recepcionada: la Isapre aceptó y el proceso con el cliente terminó. La fecha es el día en que se marcó ese cierre.",
  },
  {
    label: "Aceptadas",
    measure:
      "Documentos en estado aceptada: el cliente aceptó la propuesta y el caso sigue con el ejecutivo de Isapres. La fecha es el día en que se marcó esa aceptación.",
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
