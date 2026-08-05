"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/auth/AuthContext";

export function storeRedemptionsQueryKey(accountId, phone) {
  return ["store-redemptions", accountId, phone];
}

async function fetchCustomerCards(phone) {
  const res = await fetch(`/api/store-redemptions?phone=${encodeURIComponent(phone)}`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to search for customer cards");
  }
  return json.cards || [];
}

// Only runs when `phone` is a non-empty string — the search box drives this,
// there's no "list everything" mode (no coupon-code field exists to browse by).
export function useStoreRedemptionsQuery(phone) {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;

  return useQuery({
    queryKey: storeRedemptionsQueryKey(accountId, phone),
    queryFn: () => fetchCustomerCards(phone),
    enabled: !!accountId && !!phone,
  });
}

export function useRedeemScratchCardMutation() {
  const { account } = useAuthContext();
  const accountId = account?.id || account?._id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scratchCardId) => {
      const res = await fetch("/api/store-redemptions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scratchCardId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to redeem scratch card");
      }
      return data;
    },
    onSuccess: () => {
      // Refresh the customer's card list (status flips to redeemed) and the
      // inventory/analytics pages, which read from the same counters.
      queryClient.invalidateQueries({ queryKey: ["store-redemptions", accountId] });
      queryClient.invalidateQueries({ queryKey: ["store-inventory", accountId] });
      queryClient.invalidateQueries({ queryKey: ["store-analytics", accountId] });
      queryClient.invalidateQueries({ queryKey: ["store-campaigns", accountId] });
    },
  });
}
