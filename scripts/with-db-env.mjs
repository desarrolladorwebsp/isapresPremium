import { spawnSync } from "node:child_process";
import {
  applyResolvedDatabaseEnv,
  assertSafeForDestructiveCommand,
  assertSafeForProductionMigration,
  describeResolvedDatabase,
} from "../lib/db/resolve-database-env.mjs";
import { loadLocalEnvFiles } from "./load-local-env.mjs";

function parseArgs(argv) {
  let mode = "runtime";
  const rest = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") {
      rest.push(...argv.slice(i + 1));
      break;
    }
    if (arg === "--migrate") {
      mode = "migrate";
      continue;
    }
    if (arg === "--destructive") {
      mode = "destructive";
      continue;
    }
    rest.push(arg);
  }

  return { mode, rest };
}

loadLocalEnvFiles();

const { mode, rest } = parseArgs(process.argv.slice(2));
const [command, ...args] = rest;

if (!command) {
  console.error(
    "Uso: node scripts/with-db-env.mjs [--migrate|--destructive] -- <comando> [args...]",
  );
  process.exit(1);
}

try {
  if (mode === "destructive") {
    assertSafeForDestructiveCommand();
  }
  if (mode === "migrate") {
    assertSafeForProductionMigration();
  }

  const purpose = mode === "runtime" ? "runtime" : "migrate";
  const resolved = applyResolvedDatabaseEnv({ purpose });

  if (!resolved.applied) {
    console.error(
      "[db] No hay URL de base de datos. Define DATABASE_URL_DEV (local) o DATABASE_URL (Vercel).",
    );
    process.exit(1);
  }

  console.log(describeResolvedDatabase(resolved));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const result = spawnSync(command, args, {
  stdio: "inherit",
  env: process.env,
  shell: false,
});

process.exit(result.status ?? 1);
