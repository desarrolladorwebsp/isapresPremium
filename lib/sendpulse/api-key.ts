import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

function encryptionKey(): Buffer | null {
  const secret = process.env.AUTH_SECRET?.trim() ?? "";
  if (secret.length < 32) return null;
  return createHash("sha256").update(`sendpulse-api-key:${secret}`).digest();
}

/** Guarda la clave para poder usarla después. No se devuelve al panel. */
export function sealSendpulseApiKey(value: string): string | null {
  const key = encryptionKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function openSendpulseApiKey(
  stored: string | null | undefined,
): string | null {
  if (!stored) return null;
  const [version, iv, tag, data] = stored.split(".");
  if (version !== "v1" || !iv || !tag || !data) return null;
  const key = encryptionKey();
  if (!key) return null;

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]).toString("utf8").trim();
    return plain || null;
  } catch {
    return null;
  }
}

export function sendpulseApiKeyPrefix(value: string): string {
  return value.trim().slice(0, 12);
}
