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
    // Maintenance banner + support contacts change very rarely, and this is
    // fetched on every dashboard load. Ten minutes removes the repeat request
    // without any meaningful staleness (a Super_Admin toggling maintenance
    // mode reaches everyone on their next navigation after the window).
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
