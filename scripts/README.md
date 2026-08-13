# Scripts operativos

Herramientas one-shot y de mantenimiento. **No forman parte del runtime** de Next.js en producción.

## Cómo usar

Los scripts recurrentes están cableados en `package.json` (`npm run import-banmedica`, `verify:vercel`, etc.). El resto se ejecuta con `npx tsx scripts/<archivo>.ts` o `node`/`python3` según extensión.

## Clasificación (referencia)

| Tipo | Ejemplos | Notas |
|------|----------|--------|
| Ops / cuentas | `upsert-*-account.ts`, `reset-admin-password.ts`, `verify-*.ts` | Uso puntual en entornos |
| Import catálogo | `import-*-plans.ts`, `parse-*-excel.py`, `upload-plan-pdfs.ts` | No borrar: re-importaciones |
| Audit / reportes | `audit-*`, `export-*`, `build-*-xlsx.py` | Generan XLSX/JSON locales |
| Debug one-off | `debug-*.mjs`, `search-plan-code.ts`, `test-*.ts` | Conservar hasta archivar con evidencia de no uso |
| Build helpers | `try-migrate-deploy.mjs`, `with-local-env.mjs`, `run-dev.sh` | Usados por `npm run build` / `dev` |

## Assets locales

Snapshots en `assets/` (raíz del repo): `planes.json`, `clinics.json`, `clinic-locations.json`. Usados por seed y scripts de clínicas, no por el cotizador en runtime (datos viven en Prisma/BD).

## Regla de limpieza

No eliminar un script solo porque no esté en `package.json`. Preferir archivar documentado tras confirmar cero uso operativo.
