import { Readable } from "stream";
import { Client } from "basic-ftp";
import { ApiError } from "@/lib/api/api-error";
import { normalizePlanPdfStorageKey } from "@/lib/plan-pdf-storage/paths";

export interface CpanelFtpConfig {
  host: string;
  user: string;
  password: string;
  remoteDir: string;
  publicBaseUrl: string;
  secure: boolean;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, "");
}

function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/g, "");
}

export function getCpanelFtpConfig(): CpanelFtpConfig | null {
  const host = process.env.CPANEL_FTP_HOST?.trim();
  const user = process.env.CPANEL_FTP_USER?.trim();
  const password = process.env.CPANEL_FTP_PASSWORD?.trim();
  const remoteDir = process.env.CPANEL_FTP_REMOTE_DIR?.trim();
  const publicBaseUrl = process.env.CPANEL_PDF_PUBLIC_BASE_URL?.trim();

  if (!host || !user || !password || !remoteDir || !publicBaseUrl) {
    return null;
  }

  const secureRaw = process.env.CPANEL_FTP_SECURE?.trim().toLowerCase();
  const secure = secureRaw !== "false" && secureRaw !== "0";

  return {
    host,
    user,
    password,
    remoteDir: trimLeadingSlash(trimTrailingSlash(remoteDir)),
    publicBaseUrl: trimTrailingSlash(publicBaseUrl),
    secure,
  };
}

export function assertCpanelConfigured(): CpanelFtpConfig {
  const config = getCpanelFtpConfig();
  if (!config) {
    throw new Error(
      "cPanel/FTP no está configurado. Agrega CPANEL_FTP_HOST, CPANEL_FTP_USER, CPANEL_FTP_PASSWORD, CPANEL_FTP_REMOTE_DIR y CPANEL_PDF_PUBLIC_BASE_URL en .env.local.",
    );
  }
  return config;
}

export function buildCpanelPublicUrl(
  storageKey: string,
  config: CpanelFtpConfig = assertCpanelConfigured(),
): string {
  const normalizedKey = normalizePlanPdfStorageKey(storageKey);
  return `${config.publicBaseUrl}/${normalizedKey.split("/").map(encodeURIComponent).join("/")}`;
}

export function isCpanelPdfUrl(url: string): boolean {
  const trimmed = url.trim();
  const base = process.env.CPANEL_PDF_PUBLIC_BASE_URL?.trim();
  if (!base) return false;
  return trimmed.startsWith(trimTrailingSlash(base));
}

async function withFtpClient<T>(
  fn: (client: Client, config: CpanelFtpConfig) => Promise<T>,
): Promise<T> {
  const config = assertCpanelConfigured();
  const client = new Client(30_000);
  client.ftp.verbose = process.env.CPANEL_FTP_VERBOSE === "1";

  try {
    await client.access({
      host: config.host,
      user: config.user,
      password: config.password,
      secure: config.secure,
    });
    return await fn(client, config);
  } finally {
    client.close();
  }
}

function resolveRemotePath(
  storageKey: string,
  config: CpanelFtpConfig,
): { remoteFilePath: string; remoteDirectory: string } {
  const normalizedKey = normalizePlanPdfStorageKey(storageKey);
  const remoteFilePath = `${config.remoteDir}/${normalizedKey}`.replace(/\\/g, "/");
  const lastSlash = remoteFilePath.lastIndexOf("/");
  const remoteDirectory =
    lastSlash >= 0 ? remoteFilePath.slice(0, lastSlash) : config.remoteDir;

  return { remoteFilePath, remoteDirectory };
}

export async function saveCpanelPlanPdf(
  storageKey: string,
  fileBuffer: Buffer,
): Promise<{ url: string; bytes: number }> {
  const config = assertCpanelConfigured();
  const { remoteFilePath, remoteDirectory } = resolveRemotePath(storageKey, config);

  await withFtpClient(async (client) => {
    await client.ensureDir(remoteDirectory);
    await client.uploadFrom(Readable.from(fileBuffer), remoteFilePath);
  });

  return {
    url: buildCpanelPublicUrl(storageKey, config),
    bytes: fileBuffer.byteLength,
  };
}

export async function deleteCpanelPlanPdf(storageKey: string): Promise<boolean> {
  const config = assertCpanelConfigured();
  const { remoteFilePath } = resolveRemotePath(storageKey, config);

  try {
    await withFtpClient(async (client) => {
      await client.remove(remoteFilePath);
    });
    return true;
  } catch {
    return false;
  }
}

export async function cpanelPlanPdfExists(storageKey: string): Promise<boolean> {
  const config = assertCpanelConfigured();
  const { remoteFilePath, remoteDirectory } = resolveRemotePath(storageKey, config);
  const fileName = remoteFilePath.slice(remoteFilePath.lastIndexOf("/") + 1);

  try {
    const listing = await withFtpClient(async (client) =>
      client.list(remoteDirectory),
    );
    return listing.some((entry) => entry.name === fileName);
  } catch {
    return false;
  }
}

export async function verifyCpanelConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await withFtpClient(async (client, config) => {
      await client.ensureDir(config.remoteDir);
    });
    return { ok: true, message: "Conexión FTP/cPanel OK." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo conectar al FTP de cPanel.",
    };
  }
}

export function assertValidCpanelPublicUrl(url: string): void {
  if (!isCpanelPdfUrl(url)) {
    throw new ApiError("La URL pública del PDF no coincide con cPanel.", 400);
  }
}
