# Guía de agentes Cursor (Isapres Premium)

Fuente de verdad de **dónde** vive cada tipo de instrucción. No dupliques el mismo contenido en varias carpetas.

## Ubicaciones canónicas

| Qué | Dónde | Cuándo usarlo |
|-----|--------|----------------|
| Contexto del repo | `AGENTS.md` (raíz) | Overview + enlaces a docs; siempre visible al agente |
| Constraints por archivo | `.cursor/rules/*.mdc` | Reglas con `globs` o `alwaysApply` (ej. API leads) |
| Workflows reutilizables | `.cursor/skills/<nombre>/SKILL.md` | Tareas con pasos (“cómo integrar X”, checklists) |
| Docs de producto | `docs/*.md` | Detalle largo; el skill/rule solo apunta aquí |

## Lo que NO se gestiona en este repo

- `~/.cursor/skills-cursor/` — skills **built-in de Cursor** (sync automático). No crear, editar ni borrar ahí.
- `~/.cursor/skills/` — skills **personales** del usuario (todos los proyectos). Vacío a propósito salvo que quieras algo global.
- `.agents/skills/` — no usar en este proyecto (evita el doble árbol skills/rules).

## Reglas actuales

- `rules/public-api-leads-clients.mdc` — se queda como **rule** (tiene `globs`). No migrar a skill.

## Skills del proyecto

Carpeta: `.cursor/skills/<nombre>/SKILL.md`.

| Skill | Cuándo |
|-------|--------|
| `feature-registry` | Antes de implementar o extender producto (cotizador, CRM, cotizaciones, planes, leads, staff, emails, API pública). Consulta `FEATURES.md` y `PLANS.md` y actualízalos al cerrar el cambio. |

Al agregar otra skill: `name` + `description` (qué y cuándo), cuerpo corto, detalle largo en `docs/` o `reference.md`. El inventario de funciones no va en el skill: vive en `FEATURES.md`.

## Anti-patrones

- No copiar el mismo texto en rule + skill + AGENTS.md.
- No poner skills en `skills-cursor`.
- No crear `.agents/skills` paralelo a `.cursor/skills`.
