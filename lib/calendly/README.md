# Calendly multi-equipo (Zoom)

## Variables (ver `.env.example`)

Por cada cuenta (`EQUIPO_1` / `EQUIPO_2` / `EQUIPO_3`):

- `CALENDLY_EQUIPO_N_TOKEN` — Personal Access Token
- `CALENDLY_EQUIPO_N_SCHEDULING_URL` — URL del Event Type (location Zoom)
- `CALENDLY_EQUIPO_N_WEBHOOK_SIGNING_KEY` — signing key del webhook
- Opcional: `CALENDLY_EQUIPO_N_USER_URI`

Firma compartida (fallback): `CALENDLY_WEBHOOK_SIGNING_KEY`  
Solo desarrollo: `CALENDLY_WEBHOOK_SKIP_VERIFY=true` (nunca en producción)

## Setup Calendly (manual)

1. En cada cuenta Calendly, conectar **Zoom** (Integrations).
2. Crear Event Type con location Zoom; copiar Scheduling URL.
3. Crear Personal Access Token.
4. Webhooks → events `invitee.created` + `invitee.canceled` →  
   `https://TU_DOMINIO/api/webhooks/calendly?team=EQUIPO_N`
5. Guardar signing key en env.

## Matching

El webhook busca `User` (role CLIENT) por **email normalizado**.  
Si no hay match: se guarda `CalendlyBooking` sin `userId` (no crea lead). Log en servidor.

## Flujo staff

- En **Redirigir a Isapres Premium** + método Zoom: widget Calendly embebido
  (misma URL del embed oficial / `CALENDLY_EQUIPO_N_SCHEDULING_URL`).
- Prefill `email` + `name` del cliente.
- Copiar link / abrir en pestaña como respaldo.
- Tras webhook: `nextCallAt`, `preferredContactMethod=ZOOM`, `zoomJoinUrl`, historial.
