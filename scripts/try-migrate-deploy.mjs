import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL?.trim()) {
  console.warn(
    "[build] DATABASE_URL no configurada; se omite prisma migrate deploy.",
  );
  process.exit(0);
}

function applySafeSchemaPatches() {
  console.warn(
    "[build] Aplicando parches SQL aditivos (columnas/tablas opcionales faltantes)...",
  );
  execSync(
    "npx prisma db execute --file prisma/safe-schema-patches.sql --schema prisma/schema.prisma",
    { stdio: "inherit" },
  );
  console.log("[build] Parches SQL aditivos aplicados.");
}

try {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  console.log("[build] Migraciones aplicadas correctamente.");
} catch (error) {
  console.warn(
    "[build] prisma migrate deploy falló; se continúan parches SQL seguros.",
  );
  if (error instanceof Error) {
    console.warn(error.message);
  }
}

// Siempre: IF NOT EXISTS / idempotente. Cubre tablas/columnas faltantes
// aunque el historial de migraciones esté inconsistente (p. ej. password_reset_tokens).
try {
  applySafeSchemaPatches();
} catch (patchError) {
  console.warn(
    "[build] No se pudieron aplicar parches SQL. La app puede fallar si faltan columnas/tablas.",
  );
  if (patchError instanceof Error) {
    console.warn(patchError.message);
  }
}
