<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Isapres Premium — guía para agentes

Motor del cotizador y sitio marketing de **isaprespremium.cl** (Next.js 16, App Router). El código vive en la raíz: `app/`, `components/`, `lib/`, `domain/`, `prisma/`. No hay carpeta `src/`.

Antes de agregar comportamiento de producto, lee `FEATURES.md` (ya implementado) y `PLANS.md` (trabajo abierto). Skill: `.cursor/skills/feature-registry/SKILL.md`.

## Dónde vive cada instrucción

| Qué | Dónde |
|-----|--------|
| Inventario de lo ya construido | `FEATURES.md` |
| Trabajo abierto / no reabrir | `PLANS.md` |
| Overview y deploy | `README.md` |
| Leads → clientes | `docs/PUBLIC-API-LEADS-CLIENTS.md` + regla `.cursor/rules/public-api-leads-clients.mdc` |
| Widget | `docs/WIDGET-INTEGRATION.md` |
| Roles staff | `docs/ROLES-AND-PERMISSIONS.md` |
| Convención rules vs skills | `.cursor/README.md` |

No uses `~/.cursor/skills-cursor/` ni `.agents/skills/`.

`docs/ARCHITECTURE-COTIZADOR-PREMIUM.md`, `docs/WIDGET-INTEGRATION.md` y `docs/email-actions-map.md` conservan el host y las rutas de la migración (`cotizadorpremium.cl`, `src/`). El host del motor es `isaprespremium.cl`. Contrasta esas guías con `FEATURES.md` antes de seguir un checklist de fases.

## Dos “cotizaciones” distintas

- `Quote` — lead del cotizador público (`/api/quotes`, sección Equipo → Cotizaciones).
- `ClientQuotation` — documento comercial de la ficha (1–3 planes ya asignados, PDF, email, WhatsApp). API: `/api/executive/clients/[id]/quotations`.

No unifiques esos modelos.

## Motor de precios

No reescribas el cálculo Isapre. Punto de entrada: `domain/index.ts`. Implementación: `lib/plan-final-price.ts`, `lib/risk-factor-table-604.ts`, `lib/isapre-pricing-rules.ts`. El admin edita catálogo (precio base UF, coberturas, GES), no la fórmula.

## Codebase Memory MCP

Si el namespace MCP de Codebase Memory está conectado, úsalo antes de leer archivos o editar código.

1. Descubre el namespace con las herramientas dinámicas de Cursor (no asumas el prefijo `mcp_codebase-memo_`).
2. `list_projects`, luego `get_architecture` con el `display_name` o `name` devuelto.
3. `search_graph` / `trace_call_path` para símbolos; `get_code_snippet` para una función.
4. Lee el archivo solo cuando necesites el texto exacto para editar.

Herramientas del grafo: `index_repository`, `list_projects`, `delete_project`, `index_status`, `search_graph`, `trace_call_path`, `detect_changes`, `query_graph`, `get_graph_schema`, `get_code_snippet`, `get_architecture`, `search_code`, `manage_adr`, `ingest_traces`.

Si ese namespace no está disponible, sigue con `FEATURES.md` y el código. No bloquees la tarea esperando el grafo.
