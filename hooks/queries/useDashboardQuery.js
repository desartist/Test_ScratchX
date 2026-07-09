"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function dashboardQueryKey(accountId) {
  return ["dashboard", accountId];
}

export async function fetchDashboard({ accountId, role, token }) {
  const res = await fetch("/api/dashboard", {
    headers: {
      "x-user-id": accountId || "",
      "x-user-role": role || "",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to load dashboard");
  }
  return json; // { success, data, role }
}

// Shared across merchant-overview/page.js and SmartDashboard.js — both used
// to independently fetch /api/dashboard, doubling this request on every
// merchant dashboard load. Same queryKey means React Query serves the second
// caller straight from cache instead of firing a second network request.
export function useDashboardQuery() {
  const { account, token } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: dashboardQueryKey(accountId),
    queryFn: () => fetchDashboard({ accountId, role: account?.role, token }),
    enabled: !!account,
  });
}
