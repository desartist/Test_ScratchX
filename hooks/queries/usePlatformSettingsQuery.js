"use client";

import { useQuery } from "@tanstack/react-query";

// Public, non-sensitive subset of platform settings (maintenance mode +
// support contacts) — usable by any authenticated role, not just Super_Admin.
export function usePlatformSettingsQuery() {
  return useQuery({
    queryKey: ["platform-settings-public"],
    queryFn: async () => {
      const res = await fetch("/api/settings/public", { credentials: "include" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load settings");
      return json;
    },
    staleTime: 60_000,
  });
}
