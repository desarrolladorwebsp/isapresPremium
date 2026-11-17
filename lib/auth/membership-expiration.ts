import { santiagoDateKey } from "@/lib/client-pipeline/agenda-urgency";

/** El día elegido es inclusivo. El acceso expira al inicio del día siguiente en Chile. */
export function membershipExpirationFromDay(day: string): Date | null {
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(day)) return null;
  const utcDay = new Date(day + "T00:00:00Z");
  if (Number.isNaN(+utcDay) || utcDay.toISOString().slice(0, 10) !== day) return null;

  // Find the first instant after this local date, including daylight-saving transitions.
  const dayMs = 86_400_000;
  let start = +utcDay;
  let end = start + 2 * dayMs;
  while (end - start > 1) {
    const midpoint = Math.floor((start + end) / 2);
    if (santiagoDateKey(new Date(midpoint)) === day || midpoint < +utcDay + dayMs) {
      start = midpoint;
    } else {
      end = midpoint;
    }
  }
  return new Date(end);
}

export function membershipExpirationDay(expiresAt: string): string | null {
  return santiagoDateKey(new Date(Date.parse(expiresAt) - 1));
}
