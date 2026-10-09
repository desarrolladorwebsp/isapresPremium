export const SENDPULSE_TRIGGERS = {
  contratar: "Cliente quiere contratar",
  hablar_ejecutivo: "Cliente quiere comunicarse con un ejecutivo",
  no_responde: "Cliente no responde",
} as const;

export type SendpulseTriggerKey = keyof typeof SENDPULSE_TRIGGERS;

export function sendpulseTriggerLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key in SENDPULSE_TRIGGERS) {
    return SENDPULSE_TRIGGERS[key as SendpulseTriggerKey];
  }
  return null;
}
