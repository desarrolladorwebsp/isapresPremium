<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Isapres Premium — guía para agentes

Este repo es el **motor del cotizador** + marketing de isaprespremium.cl.

## Docs de producto / API (léelos antes de integrar)

- `docs/PUBLIC-API-LEADS-CLIENTS.md` — cómo registrar leads como clientes (`POST /api/public/v1/clients`, formulario `/api/leads`)
- `docs/WIDGET-INTEGRATION.md` — widget embed
- `docs/ROLES-AND-PERMISSIONS.md` — permisos staff
- `README.md` — overview y deploy

Regla Cursor relacionada: `.cursor/rules/public-api-leads-clients.mdc`.

Convención de agentes: ver `.cursor/README.md` (rules vs skills; no usar `skills-cursor` ni `.agents/skills`).
