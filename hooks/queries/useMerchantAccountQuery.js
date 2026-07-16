"use client";

import { useQuery } from "@tanstack/react-query";

export function merchantAccountQueryKey(accountId) {
  return ["merchant-account", accountId];
}

export async function fetchMerchantAccount({ accountId, role }) {
  const res = await fetch("/api/merchant", {
    headers: {
      "x-user-id": accountId || "",
      "x-user-role": role || "merchant",
    },
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || "Failed to load account");
  }
  return json;
}

export function useMerchantAccountQuery(accountId, role) {
  return useQuery({
    queryKey: merchantAccountQueryKey(accountId),
    queryFn: () => fetchMerchantAccount({ accountId, role }),
    enabled: !!accountId,
  });
}
