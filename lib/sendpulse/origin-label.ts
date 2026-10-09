/** Rótulo visible: `sendpulse` más el número del bot, por ejemplo `sendpulse +56945961235`. */
export function sendpulseOriginLabel(botPhone: string | null | undefined): string {
  const digits = (botPhone ?? "").replace(/\D/g, "");
  return digits ? `sendpulse +${digits}` : "sendpulse";
}
