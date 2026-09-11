export function isExplicitProductionEnvironment(): boolean;
export function hostnameOfDatabaseUrl(url: string | undefined | null): string;
export function isSameDatabase(
  urlA: string | undefined | null,
  urlB: string | undefined | null,
): boolean;
export function resolveDatabaseTargets(): {
  useProd: boolean;
  pooled: string;
  direct: string;
};
export function applyResolvedDatabaseEnv(options?: {
  purpose?: "runtime" | "migrate";
}): {
  applied: boolean;
  useProd: boolean;
  purpose: "runtime" | "migrate";
  hostname: string;
  pooled: string;
  direct: string;
};
export function assertSafeForDestructiveCommand(): void;
export function assertSafeForProductionMigration(): void;
export function describeResolvedDatabase(result: {
  useProd: boolean;
  purpose: "runtime" | "migrate";
  hostname: string;
}): string;
