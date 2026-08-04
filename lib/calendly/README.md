# Calendly multi-equipo (Zoom)

## Variables (ver `.env.example`)

Por cada cuenta (`EQUIPO_1` / `EQUIPO_2` / `EQUIPO_3`):

- `CALENDLY_EQUIPO_N_TOKEN` — Personal Access Token
- `CALENDLY_EQUIPO_N_SCHEDULING_URL` — URL del Event Type (location Zoom)
- `CALENDLY_EQUIPO_N_WEBHOOK_SIGNING_KEY` — signing key del webhook
- Opcional: `CALENDLY_EQUIPO_N_USER_URI`

Defaults de scheduling (si no hay env):

| Equipo | URL |
|--------|-----|
| Equipo 1 | https://calendly.com/cotizador-isaprespremium/reunion |
| Equipo 2 | https://calendly.com/cotizador-isaprespremium_/online |
| Equipo 3 | https://calendly.com/isaprespremium-info/online |

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

- En **Redirigir a Isapres Premium** o reagendar con Zoom: el ejecutivo
  **elige Equipo 1 / 2 / 3** (las tres cuentas Calendly) y agenda con el widget.
- Prefill `email` + `name` del cliente.
- El equipo elegido se guarda en `User.calendlyTeam` (útil para la ficha / protocolo).
- Copiar link / abrir en pestaña como respaldo.
- Tras webhook: `nextCallAt`, `preferredContactMethod=ZOOM`, `zoomJoinUrl`, historial.
