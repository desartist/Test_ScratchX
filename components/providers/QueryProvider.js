"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Most data here (campaigns, stores, ranges, dashboard summaries) doesn't
// change second-to-second, so a short staleTime avoids refetching the same
// resource from multiple components/pages within a normal browsing window,
// while mutations (create/update/delete) explicitly invalidate their query
// keys to force fresh data immediately — see hooks/queries/*.
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export default function QueryProvider({ children }) {
  // useState (not a module-level singleton) so each request gets its own
  // client on the server, while the client browser still reuses one
  // instance across the whole session.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
