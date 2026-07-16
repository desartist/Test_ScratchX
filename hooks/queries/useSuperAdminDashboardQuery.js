"use client";

import { useQuery } from "@tanstack/react-query";

export function superAdminDashboardQueryKey() {
  return ["super-admin-dashboard"];
}

export async function fetchSuperAdminDashboard() {
  const res = await fetch("/api/dashboard/super-admin", {
    credentials: "include",
  });
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || "Failed to load admin dashboard");
  }
  return json.data;
}

export function useSuperAdminDashboardQuery() {
  return useQuery({
    queryKey: superAdminDashboardQueryKey(),
    queryFn: fetchSuperAdminDashboard,
  });
}
