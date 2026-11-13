# Funciones implementadas

Registro de lo que **ya existe** en este repo (revisado 2026-09-29). Antes de diseñar o programar una función, busca aquí. Si ya está, extiéndela; no abras un segundo flujo.

Al cerrar una función nueva, agrega una fila en la sección que corresponda (qué hace, dónde vive, qué no hace). El trabajo que todavía no está en el código va en `PLANS.md`.

## No confundir

| Concepto | Qué es | Dónde |
|----------|--------|--------|
| `Quote` | Solicitud / lead del cotizador público o del widget | `prisma` `quotes`, `/api/quotes`, panel Equipo → Cotizaciones |
| `ClientQuotation` | Documento comercial formal de la ficha (PDF, estados, envío) | `client_quotations`, `/api/executive/clients/[id]/quotations` |
| Compartir planes | Email con planes del cotizador ejecutivo, sin documento `ClientQuotation` | `POST /api/executive/share-plans-email` |
| `PartnerEntity` | Marca del cotizador (logo, colores, `embedKey`) | Catálogo compartido; no aísla planes ni clientes |
| Motor de precios | Fórmula Isapre (factor 604 + GES) | `domain/index.ts`, `lib/plan-final-price.ts` |

El tenant es de **marca**, no de datos. Isapres, planes, clínicas, coberturas y UF son globales.

## Marketing

| Función | Dónde |
|---------|--------|
| Home, empresas, nosotros, respaldo legal, políticas | `app/(marketing)/` |
| Fichas públicas de isapres | `app/isapres/[slug]/`, `lib/isapre-pages/` |
| Reseñas públicas | `GET /api/reviews/public`, modelo `PlanReview` |
| SEO / JSON-LD | `lib/seo/` |

## Cotizador público y widget

| Función | Dónde |
|---------|--------|
| Cotizador `/cotizador?agent=` | `app/cotizador/page.tsx`, `components/cotizador/` |
| Resolución de marca (`agent`, `entidad`, cookie, `DEFAULT_PARTNER_ENTITY_SLUG`) | `lib/partner-entity/` |
| Ruta legacy `/{partnerSlug}` y `/embed` | `app/[partnerSlug]/`, `app/embed/` |
| Widget `cotizador-widget.js` (iframe, 4 planes, salida al cotizador completo; host por defecto `https://isaprespremium.cl`) | `public/cotizador-widget.js`, `EMBED_WIDGET_PLANS_LIMIT` en `lib/plan-search-config.ts` |
| Búsqueda y filtros de planes (precio, isapre, zona, tipo, cobertura H/A, clínicas). Los resultados se actualizan al cambiar los filtros. Aplicar conserva la selección y lleva a los resultados. Cerrar con la cruz o al tocar fuera restaura los filtros y el rango de precio previos a la edición. | `GET /api/plans/search`, `lib/api/plan-search.ts`, `lib/apply-plan-filters.ts` |
| Vista pública responsive: beneficios en tres columnas móviles, código junto al nombre del plan, UF/pesos siempre en paralelo junto a metadata y acciones PDF/Solicitar al final de cada tarjeta | `public-cotizador-view.tsx`, `public-plan-card.tsx`, `company-agreement/plan-agreement-price.tsx` |
| Movimiento y carga públicos: transiciones breves sin rebote, esqueletos con la estructura de las tarjetas, indicador de actualización junto al contador y respeto de reducir movimiento (incluido scroll). Conserva los resultados mientras actualiza | `public-plan-results-loading.tsx`, `public-plan-results-list.tsx`, `public-results-toolbar.tsx`, `contract-plan-modal.tsx`, `lib/scroll/scroll-into-view.ts` |
| Modal público de plan adaptable a móvil: cabecera con logo y cierre alineados, tipo e identificador juntos, precio compacto, desplazamiento completo, formulario antes de beneficios y campos legibles. Conserva el envío y el cálculo existentes | `components/cotizador/public/contract-plan-modal.tsx`, `modal-request-form.tsx` |
| Precio final UF/CLP y escenarios. Convenio propio por cotizante: base especial o descuento solo sobre su factor; otras personas y cargas no heredan el beneficio y GES permanece intacto. Tarjetas, detalle, comparación, ordenación y mensajes comparten el cálculo. No recalcula cotizaciones guardadas | `lib/plan-final-price.ts`, `lib/company-agreements/individual-plan-price.ts`, `components/beneficiaries/contributor-agreement-field.tsx`, `scripts/test-individual-agreement-pricing.ts` |
| UF | `GET /api/uf`, `lib/economic-indicators.ts` |
| PDF de plan | `GET /api/plans/[uniqueCode]/pdf` |
| Solicitud de plan / aviso de cotización | `POST /api/quotes`, `POST /api/cotizacion-notify`, página `/cotizador/mi-cotizacion` |
| Consulta de convenio por RUT | `GET /api/company-agreements/lookup`, `POST /api/company-agreement-inquiry` |
| Deep links del widget | `lib/deep-link/`, `lib/public-api/cotizador-url.ts`, `lib/public-api/solicitar-url.ts` |

## Catálogo (admin)

Secciones del panel unificado `/cotizador/ejecutivos?section=`:

| Sección | Función |
|---------|---------|
| `clinicas` | CRUD clínicas, ubicación, zonas |
| `ges` | Valores GES |
| `reportes-pdf` | Informe y carga de PDF de planes |
| `convenios` | Convenios de empresa e importación |
| `mapa` | Mapa de clínicas (Google Maps) |

También: importación masiva de planes (`POST /api/admin/plans/import`), alta/edición de planes e isapres (`/api/plans`, `/api/isapres`), storage de PDF (Blob, local o cPanel) en `lib/plan-pdf-storage/`. Scripts de import por isapre en `package.json` (`import-banmedica`, `import-colmena`, etc.).

`/cotizador/admin` redirige a Prospectos. `/cotizador/admin/usuarios` es legacy de Usuarios.

## Staff, roles y acceso

Detalle de permisos: `docs/ROLES-AND-PERMISSIONS.md`. Menú: `lib/staff/staff-sections.ts`, `lib/staff/staff-nav.ts`.

| Función | Dónde |
|---------|--------|
| Login unificado | `/cotizador/acceso` |
| Roles `ADMIN` y `EXECUTIVE`; kinds `ISAPRES_PREMIUM`, `ZOOM`, `ISAPRES`, `MEMBRESIA_ISAPRES_PREMIUM` | `StaffAccount` |
| Invitación por correo (7 días) y activación | `POST /api/admin/accounts`, `/api/auth/staff-invite` |
| Suspender/reactivar cualquier cuenta staff; bloquea el acceso y conserva sus registros relacionados | `PATCH /api/admin/accounts/[id]`, `lib/auth/account-store.ts`, `components/admin/users-panel.tsx` |
| Recuperación y cambio de contraseña, onboarding de ejecutivo | `/api/auth/password-reset`, `components/executive/executive-onboarding-form.tsx` |
| Avatar | `/api/executive/profile/avatar`, `/api/staff/avatars/[id]` |
| Gate de suscripción **solo** para membresía (estado en BD) | `lib/auth/subscription.ts` |
| Asignación automática configurable por usuario (admin y ejecutivos operativos); check en Usuarios, independiente de asignación manual y acceso. Admin desactivado por defecto; reemplaza el pool fijo de correos inbound. Respeta suspensión, perfil y membresía; no reasigna cartera existente | `StaffAccount.autoAssignmentEnabled`, `components/admin/users-panel.tsx`, `lib/api/lead-assignment.ts`. Preferencias conservadas; recepción automática global temporalmente pausada desde 2026-11-02, sin alterar cartera ni asignación manual |
| Suspensión de asignaciones | `StaffAccount.assignmentsSuspended` |

No hay integración Stripe. `stripeCustomerId` está en el schema y no lo usa ningún módulo.

Secciones por kind: admin ve catálogo, equipo, reportes y cotizaciones; Premium ve inicio, clientes, calendario, cotizador y mapa; Zoom/Isapres ven inicio, clientes y calendario; membresía solo el cotizador.

## CRM de clientes

Panel: sección `clientes`. Ficha Premium: `components/executive/client-premium-hub-view.tsx`.

| Función | Dónde |
|---------|--------|
| Filtros múltiples y orden de clientes | `executive-clients-panel.tsx`, `client-filter-multiselect.tsx`, `lib/client-pipeline/client-list-filter.ts`. Gestión, origen, estados y ejecutivos permiten varias selecciones: unión dentro de cada filtro e intersección entre grupos. Origen usa categorías existentes (incluye SendPulse y fuentes web/cotizador); sin selección incluye todos y las fichas antiguas sin origen se tratan como Registro propio. No altera el origen guardado ni responsables. Sin estados seleccionados excluye En pausa; seleccionar En pausa lo incluye expresamente. Conserva búsqueda de estados terminales. Orden por campo, con flecha ascendente/descendente en tabla y tarjetas (también Estado); agendas sin fecha al final. Filtra/ordena antes de paginar y conserva selección al abrir/cerrar una ficha dentro de Clientes. Mensaje específico sin coincidencias. Pruebas `test-client-list-filters.ts`. |
| Cartera, alta manual, origen, pipeline (`NUEVO` … `PERDIDO`) | `/api/executive/clients`, `lib/client-pipeline/`. Estados «Enviado a Isapre» y «Recepcionado» separados; no existe «Cerrado». La derivación a equipo Isapres queda Recepcionado, exige Isapre y fecha efectiva previamente registradas en la ficha y finaliza el seguimiento. Protege ediciones concurrentes. La migración transaccional pasa cualquier Cerrado histórico a Enviado a Isapre con nota de revisión; conserva los otros registros. Pruebas `test:pipeline-status` y `test:pipeline-migration` (esquema aislado DEV, revertido). |
| Vista global de todos los clientes solo para administradores; ejecutivos reciben por API y pueden abrir fichas solo de su cartera y seguimiento | `app/api/executive/clients/route.ts`, `lib/client-pipeline/tracking.ts`, `components/executive/executive-clients-panel.tsx` |
| Seguimiento: última gestión con fecha registrada, historial unificado de notas y eventos comerciales, próxima acción con responsable y urgencia por día en Chile. Reutiliza API de actividades y permisos vigentes; solo lectura, sin inferir contactos desde updatedAt | `components/executive/client-seguimiento-flow-view.tsx`, `lib/client-pipeline/follow-up.ts` |
| Flujos Zoom, Premium, Isapres y seguimiento | `client-protocolo-flow-view.tsx`, `client-seguimiento-flow-view.tsx` |
| Agenda, confirmación de llamado, reunión Zoom, recordatorios | `executive-calendar-panel.tsx`, `CalendlyBooking` |
| Webhook y link de agendamiento Calendly | `/api/webhooks/calendly`, `/api/executive/calendly/scheduling-link` |
| Derivación a ejecutivo Premium, Zoom o Isapres | `redirect-premium`, `redirect-zoom`, `redirect-isapres` |
| Planes asignados, plan elegido y plan aconsejado | `ClientAssignedPlan`, `/api/executive/clients/[id]/assigned-plans`, `advised-plan` |
| Historial de cambios de plan | `ClientActivity`, `client-plan-history-timeline.tsx` |
| Documentos (RUT, liquidación, plan, otros) | `ClientDocument`, `/api/executive/clients/[id]/documents` |
| Ficha PDF de protocolo | `client-ficha-pdf-modal.tsx` |
| Distribución round-robin de pendientes (temporalmente pausada) | Motor y botones conservados. Pausa global `AUTOMATIC_CLIENT_ASSIGNMENT_ENABLED=false` en `lib/client-pipeline/assignment-policy.ts`; reparto masivo de clientes y prospectos oculto y bloqueado con 409 antes de escribir. Captura de formularios/API/cotizador continúa sin asignar clientes nuevos; conserva responsable existente y preferencias staff. Derivaciones con destino explícito y asignación manual operan igual. SendPulse conserva su comportamiento sin reparto automático. Pruebas `test-manual-assignment-mode.ts`; el motor retenido se verifica habilitado solo en el adaptador de `test-auto-assignment-preference.ts`. |
| Reportes de equipo (pipeline, primer contacto, Zoom, cotizaciones enviadas) | sección `reportes`, `lib/executive/admin-reports.ts`, `lib/executive/sent-quotation-kpi.ts` |
| Prospectos (bandeja admin de leads) | sección `prospectos` |
| Clientes activos en Inicio | `lib/executive/active-client-portfolio.ts`, `executive-dashboard-home.tsx`. Cartera actual: clientes únicos por ID, excluye únicamente Perdido y En pausa e incluye Enviados a Isapre, Recepcionados y registros antiguos. Respeta el ejecutivo (admin: Todos, uno o Sin asignar; staff: solo cartera asignada, sin ampliar a seguimiento). No depende de isapres ni fecha de creación. Visible en mes actual de Chile o Todos los meses; oculta en meses históricos/futuros. Contador y lista paginada de 50, estado, responsable y acceso a ficha. Conserva página y modal al volver a Inicio. No altera Mis clientes ni escribe registros. Pruebas `test-active-client-portfolio.ts`. |
| Ubicación de Clientes nuevos | Tarjeta en la sección Cartera de Inicio, junto a Mis clientes y Clientes activos. Conserva cálculo, filtros de mes/ejecutivo y detalle por origen; Gestiones pendientes conserva Recordatorios de hoy, Gestiones hoy, Atrasadas y Futuras. `executive-dashboard-home.tsx`. |
| Inicio con gestiones del día | `executive-dashboard-home.tsx`. Conserva mes, ejecutivo, isapres y lista abierta al visitar una ficha y volver con Atrás, el menú o «Volver a Inicio» en la cabecera de Clientes. Estado en `executive-dashboard.tsx` durante la navegación del panel; se reinicia al recargar la página. |
| Anualidad con vencimiento mensual | `client-annuality-fields.tsx`, `lib/client-profile/annuality.ts`. Mes y año editables; nuevas: mes actual + un año. Antiguas marcadas sin fecha: creación del cliente + un año. Se guarda en `clientProfile.anualidadExpiresMonth` (`YYYY-MM`) y aparece en ficha y nuevos protocolos PDF. Recordatorio derivado por cliente en Inicio desde el primer día del mes (Chile), incluso con proceso cerrado; continúa en Atrasadas hasta desmarcar o posponer. Respeta responsable y filtros, conserva otras agendas. No bloquea cotizador ni altera cotizaciones guardadas. Backfill con respaldo y protección de cambios concurrentes: `scripts/backfill-client-annuality.ts`; pruebas: `scripts/test-client-annuality.ts`. |
| Clientes En pausa y retorno a Pendiente | Pausa manual con motivo y mes/año desde la ficha, Gestión o selector de estado. Al guardar una anualidad nueva o cambiar su fecha se ofrece guardar activa o pausada; no se pausan anualidades existentes automáticamente. Pausados se muestran solo con el filtro En pausa, sin alertas de gestiones/agenda/anualidad. Conservan responsable, seguimiento, fechas de agenda, perfil y documentos. Retorno al comenzar el mes en Chile mediante `resumeDuePausedClients`: estado Pendiente, historial y gestión en Inicio, sin duplicar reactivaciones concurrentes. Cron horario protegido por `CRON_SECRET` y comprobación al cargar clientes autenticados. Pausa/retorno permitidos a quien puede ver la ficha; sin ampliar edición general. Migración `20261102160000_client_pause`. Pruebas `test-client-pause.ts`, `test-client-pause-db.ts`, `test-client-pause-cron.ts`. |
| Recordatorios del día en Inicio | Tarjeta propia, contador y lista con nota, fecha/hora de Chile, responsable actual y acceso a la ficha. Usa `reminderAt`/`reminderNote`; filtra por mes y ejecutivo. Excluye En pausa y procesos cerrados. No duplica sus notas en Gestiones hoy ni altera los contadores existentes. `agenda-stats.ts`, `executive-dashboard-home.tsx`; pruebas `test-dashboard-reminders-active.ts`. |
| KPI de cotizaciones en Inicio | `executive-dashboard-home.tsx`, `GET /api/executive/sent-quotations`. Enviadas, activas totales, activas del mes, recepcionadas, aceptadas y rechazadas. Ambas tarjetas de activas cuentan clientes únicos con alguna cotización en estado Enviada sin respuesta; sus detalles agrupan los documentos del período correspondiente. Todos los modales organizan documentos por Isapre; los activos organizan clientes únicos y sus documentos dentro de cada Isapre. Un documento con planes de varias Isapres aparece en cada grupo correspondiente; la cuenta de la tarjeta no se duplica. Activas totales incluye todos los meses. Activas del mes usa el mes de envío y se oculta al elegir Todos los meses. Enviadas usa el mes de envío y las tarjetas de resultado usan el mes de respuesta. Todas respetan ejecutivo e Isapre. Las otras tarjetas cuentan documentos. El detalle de una tarjeta no repite esos filtros |

## Cotización comercial (`ClientQuotation`)

Al aceptar una cotización enviada, se registra el plan de cada titular y el ejecutivo confirma qué alternativas enviadas quedan No seleccionadas. La aceptación y las alternativas se guardan juntas y quedan en el historial. La recepción puede ser parcial: cada titular cuenta por su fecha efectiva y la cotización se completa en la fecha de la última confirmación. Inicio muestra cotizaciones y titulares en Aceptadas y Recepcionadas. La ficha muestra los planes por titular de la cotización aceptada o recepcionada más recientemente según la fecha de aceptación. El histórico sin selección por titular conserva el conteo por documento. El detalle de Inicio respeta las Isapres seleccionadas. Repetir la misma fecha de recepción para un titular no duplica el historial y los cambios simultáneos incompatibles se rechazan.


Cápsula «Cotización» en la ficha. No reemplaza a `Quote`.

| Función | Dónde |
|---------|--------|
| Crear documento con 1 a 3 planes ya agregados a la propuesta | `POST …/quotations`, `lib/api/client-quotation-store.ts` |
| Estados borrador, enviada, aceptada, recepcionada, rechazada, anulada | `ClientQuotationStatus`. Aceptada: el cliente aceptó. Recepcionada: la Isapre aceptó y la contratación terminó. Al recepcionar se exige fecha efectiva editable (día, mes y año; por defecto hoy en Chile). Admite meses anteriores; rechaza fechas imposibles/futuras. `receivedAt` usa ese día y los KPI/reportes lo cuentan en ese período. Corrección explícita desde Gestionar cotizaciones; el historial registra fecha anterior/nueva, autor y momento real del registro. Registros previos no cambian automáticamente. La fecha de recepción de ficha (`closedRecord.closedAt`) es independiente: su formulario y API validan el mismo calendario y el selector manual abre el formulario de recepción. No se sincronizan estados de documentos y ficha. `lib/client-quotation/reception-date.ts`, pruebas `test-reception-date.ts`. Rechazo y anulación piden motivo |
| PDF formal | `GET …/quotations/[quotationId]/pdf`, `lib/client-quotation/pdf.ts`. Al final incluye una nota discreta: los planes pueden cambiar y el equipo mantiene el catálogo al día |
| Envío por email (Resend) o WhatsApp (`wa.me` + descarga del PDF) | `POST …/quotations/[quotationId]/send`, `lib/email/send-client-quotation.ts` |
| Historial auditable | `ClientQuotationActivity` |
| KPI de enviadas, recepcionadas, aceptadas y rechazadas | Inicio y Reportes. Enviadas por `sentAt` (siguen contando si cambian de estado). Recepcionadas usa la fecha efectiva de recepción por la Isapre (`receivedAt`); aceptadas y rechazadas usan la fecha de respuesta. Borrador y anulada no entran. Una cotización cuenta una vez si incluye al menos una isapre del filtro. No mide `Quote` |
| Acceso según la misma cartera que la ficha | `lib/api/client-quotation-access.ts` |
| UI | `components/executive/client-quotation-manager.tsx` |

Migración: `prisma/migrations/20260928170000_client_commercial_quotations`. Si producción conserva el esquema anterior vacío (`user_id`, `client_quotation_plans`), `prisma/safe-schema-patches.sql` lo reemplaza en el deploy.

## Leads y API pública

| Función | Dónde |
|---------|--------|
| Formulario del sitio → cliente + email | `POST /api/leads`, `registerLeadClient()` |
| Alta server-to-server | `POST /api/public/v1/clients` (`PUBLIC_API_SECRET`) |
| Catálogo, preview, URLs de cotizador/solicitar, guía de UI | `GET/POST /api/public/v1/plans`, `plans/preview`, `cotizador/url`, `solicitar/url`, `ui/filters`, `ui/plan-card` |
| Autodocs | `GET /api/public/v1/docs` |
| Rate limit, write-guard, honeypot, CORS | `lib/public-api/`, `lib/security/` |

Origen CRM del formulario: `FORMULARIO_WEB`. Guía: `docs/PUBLIC-API-LEADS-CLIENTS.md`.

## Correos (Resend)

Implementación en `lib/email/` (el mapa `docs/email-actions-map.md` todavía cita `src/lib/email/`).

| Envío | Módulo |
|-------|--------|
| Invitación y clave temporal de staff | `send-staff-invite.ts` |
| Aviso de cotización pública | `send-cotizacion-notify.ts` |
| Lead de formulario | `send-public-lead-notify.ts` |
| Asignación de cliente al ejecutivo | `notify-executive-client-assignment.ts` |
| Recuperación de contraseña | `send-password-reset.ts` |
| Compartir planes desde el cotizador ejecutivo | `send-executive-share-plans.ts` |
| Cotización comercial PDF | `send-client-quotation.ts` |
| Consulta de convenio | `send-company-agreement-inquiry.ts` |
| Disparador SendPulse | `send-sendpulse-trigger-notify.ts`. Aviso a `ahurtado@smartpro.cl` (o `SENDPULSE_NOTIFY_EMAIL`) |

## SendPulse

El chatbot avisa un disparador y abre o actualiza la ficha del contacto. El correo sale igual si la API de SendPulse no responde.

| Función | Dónde |
|---------|--------|
| Salud del webhook: `true` si puede enviar el correo, `false` si no | `GET /api/webhooks/sendpulse` |
| El cuerpo solo exige `id`. `nombre`, `telefono`, `bot` y `disparador` son opcionales. Responde `true` solo si el correo salió o era un duplicado reciente | `POST /api/webhooks/sendpulse`, `lib/sendpulse/handle-webhook.ts` |
| Token por número de WhatsApp, rotación, revocación y registro de cada llamada. Cada línea guarda la clave API de su cuenta SendPulse | Sección `sendpulse` del panel admin, `SendpulseBotLine`, `SendpulseWebhookEvent` |
| Lee contacto y chat con la clave de esa línea. El chat se guarda en el seguimiento solo si hay mensajes. Al guardar la ficha marca el contacto con la etiqueta `CRM Isapres Premium` | `lib/sendpulse/remote.ts`, `lib/sendpulse/sync-client.ts` |
| Actualizar conversación manualmente en Seguimiento | Cualquier staff con acceso a la ficha puede leer todas las páginas del chat vinculado. Combina mensajes con el historial existente y omite repeticiones por ID dentro de la lectura y por ocurrencia al comparar texto guardado. Solo escribe `sendpulse_chat`, con protección contra ediciones concurrentes. Ruta `/api/executive/clients/[id]/sendpulse-chat`; prueba `scripts/test-sendpulse-manual-chat.ts`. |
| En Conexiones, un clic en el contacto abre su ficha si ya está en el CRM. La columna API marca si SendPulse respondió: contacto leído y etiqueta aplicada | Sección `sendpulse` del panel admin |
| Crea la ficha con origen `sendpulse +` y el número del bot. Si la ficha ya tenía otro origen, no lo cambia | `User.sendpulseContactId`, `User.sendpulseChat`, seguimiento del cliente |

En SendPulse se configura con el elemento Solicitud API (POST). El encabezado puede llamarse `Authorization` o `bearer`; el valor es el token de la línea. Ese token no es la clave API: la clave se guarda en la línea y no sale de una variable de entorno. El token de la línea se muestra una sola vez al crearlo.

## Operación

| Función | Dónde |
|---------|--------|
| Postgres vía Prisma; local usa Neon DEV | `lib/prisma.ts`, `scripts/with-db-env.mjs` |
| Health check | `GET /api/health` |
| Semilla | `prisma/seed.ts` |

## Carteras BOT e importación SendPulse (2026-10-26)

| Función | Dónde |
|---------|--------|
| Rol BOT como cartera administrada: creación directa por administrador, teléfono, contador de clientes y suspensión. Sin login, contraseña utilizable, recuperación, invitación ni reparto automático | `StaffRole.BOT`, `lib/auth/account-store.ts`, `components/admin/users-panel.tsx` |
| Asignación manual de clientes a BOT solo por administrador; las cotizaciones mantienen sus destinatarios operativos anteriores | `lib/api/user-store.ts`, `/api/executive/assignable-executives` |
| Importador por manifiesto completo: una ficha por teléfono/ID, prioridad absoluta del responsable humano existente; solo sin responsable humano gana el bot con más contactos únicos de origen, revisión de conflictos históricos, preservación de campos y respaldo antes de reasignar. Preparación por defecto; escritura exige SHA revisado | `lib/sendpulse/bulk-import.ts`, `scripts/import-sendpulse-clients.ts` |
| Todos los campos originales se conservan en metadatos separados de la lista CRM, sin enviar correos ni llamar a SendPulse | `SendpulseClientImport`, `sendpulse_client_imports` |

La ejecución de cada lote se acredita con sus informes fechados en Store; el código por sí solo no confirma una importación.

La bandeja de clientes pagina tablas y cuadros en grupos de 50; búsqueda, filtros y ordenación se aplican a toda la cartera. Cambiar filtros u orden vuelve a la primera página (`components/executive/executive-clients-panel.tsx`).

Protección de cartera SendPulse: el plan conserva administradores, ejecutivos y responsables de rol desconocido. El SQL vuelve a validar rol, responsable y fecha para impedir quitar un cliente a una persona incluso si el plan fuera incorrecto. El bot se conserva como respaldo en `SendpulseClientImport`; pruebas en `scripts/test-sendpulse-owner-protection.mjs`.
