"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function storesQueryKey(accountId) {
  return ["stores", accountId];
}

export async function fetchStoresList({ accountId, role }) {
  const res = await fetch("/api/stores", {
    headers: {
      "x-user-id": accountId || "",
      "x-user-role": role || "",
    },
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || json.message || "Failed to load stores");
  }
  return json; // { success, data, pagination }
}

// Shared across stores/page.js, stores/create/page.js, and useStoreValidation —
// all three previously fired independent /api/stores requests on every load.
export function useStoresQuery(options = {}) {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: storesQueryKey(accountId),
    queryFn: () => fetchStoresList({ accountId, role: account?.role }),
    enabled: !!accountId && options.enabled !== false,
  });
}

export function useDeleteStoreMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storeId) => {
      const res = await fetch("/api/stores/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": accountId || "",
          "x-user-role": account?.role || "",
        },
        body: JSON.stringify({ storeId }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete store");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storesQueryKey(accountId) });
    },
  });
}
