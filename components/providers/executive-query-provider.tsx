"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getExecutiveQueryClient } from "@/lib/query/query-client";

export function ExecutiveQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getExecutiveQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
