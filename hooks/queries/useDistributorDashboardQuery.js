"use client";

import { useQuery } from "@tanstack/react-query";

export function distributorDashboardQueryKey() {
  return ["distributor-dashboard"];
}

export async function fetchDistributorDashboard() {
  const res = await fetch("/api/distributor/dashboard", {
    credentials: "include",
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load dashboard");
  }
  return json.data;
}

export function useDistributorDashboardQuery() {
  return useQuery({
    queryKey: distributorDashboardQueryKey(),
    queryFn: fetchDistributorDashboard,
  });
}
