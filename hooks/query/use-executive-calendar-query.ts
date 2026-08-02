"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCalendarCallEvents } from "@/lib/api/admin-client";
import { executiveKeys } from "@/lib/query/executive-keys";

export function useExecutiveCalendarQuery(
  range: { from: string; to: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: executiveKeys.calendar(range),
    queryFn: () => fetchCalendarCallEvents(range),
    staleTime: 45_000,
    enabled: options?.enabled ?? true,
  });
}
