"use client";

import React, { useState } from "react";
import { AlertCircle, Search, CheckCircle2, Clock, Ban } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import {
  useStoreRedemptionsQuery,
  useRedeemScratchCardMutation,
} from "@/hooks/queries/useStoreRedemptionsQuery";
import LoadingState from "@/components/common/LoadingState";
import styles from "./redemptions.module.css";

const STATUS_META = {
  generated: { label: "Not opened yet", icon: Clock, tone: "pending" },
  revealed: { label: "Ready to redeem", icon: CheckCircle2, tone: "ready" },
  redeemed: { label: "Redeemed", icon: CheckCircle2, tone: "done" },
  expired: { label: "Expired", icon: Ban, tone: "expired" },
};

export default function RedemptionsPage() {
  const { account } = useAuthContext();
  const canRedeem = account?.role === "Store_Staff";

  const [phoneInput, setPhoneInput] = useState("");
  const [searchedPhone, setSearchedPhone] = useState(null);
  const [redeemError, setRedeemError] = useState(null);
  const [redeemedId, setRedeemedId] = useState(null);

  const { data: cards, isPending, error: queryError } = useStoreRedemptionsQuery(searchedPhone);
  // isPending stays true for a disabled query (no search yet) — only treat
  // it as "loading" once there's actually a phone number to search for.
  const loading = isPending && !!searchedPhone;
  const redeemMutation = useRedeemScratchCardMutation();

  const handleSearch = (e) => {
    e.preventDefault();
    setRedeemError(null);
    setRedeemedId(null);
    if (phoneInput.trim()) {
      setSearchedPhone(phoneInput.trim());
    }
  };

  const handleRedeem = async (scratchCardId) => {
    setRedeemError(null);
    try {
      await redeemMutation.mutateAsync(scratchCardId);
      setRedeemedId(scratchCardId);
    } catch (err) {
      setRedeemError(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Redemptions</h1>
        <p className={styles.pageSubtitle}>
          {canRedeem
            ? "Search a customer's phone number to redeem their scratch card"
            : "Search a customer's phone number to view their scratch card status"}
        </p>
      </div>

      <form className={styles.searchRow} onSubmit={handleSearch}>
        <input
          type="tel"
          className={styles.searchInput}
          placeholder="Enter customer phone number"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
        />
        <button type="submit" className={styles.searchButton}>
          <Search size={16} />
          Search
        </button>
      </form>

      {redeemError && (
        <div className={styles.formError}>
          <AlertCircle size={16} />
          {redeemError}
        </div>
      )}

      {loading && (
        <div className={styles.loadingWrap}>
          <LoadingState message="Searching..." />
        </div>
      )}

      {queryError && (
        <div className={styles.errorState}>
          <AlertCircle size={40} />
          <p>{queryError.message}</p>
        </div>
      )}

      {!loading && !queryError && searchedPhone && cards && (
        cards.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No scratch cards found for this phone number at your store.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {cards.map((card) => {
              const meta = STATUS_META[card.expired ? "expired" : card.status] || STATUS_META.generated;
              const Icon = meta.icon;
              const showRedeemButton = canRedeem && !card.expired && card.status === "revealed";
              const justRedeemed = redeemedId === card.scratchCardId;

              return (
                <div key={card.scratchCardId} className={styles.card}>
                  <div className={styles.cardInfo}>
                    <div className={styles.customerName}>{card.customerName}</div>
                    <div className={styles.campaignName}>{card.campaignName}</div>
                  </div>

                  <span className={`${styles.statusBadge} ${styles[meta.tone]}`}>
                    <Icon size={14} />
                    {justRedeemed ? "Redeemed" : meta.label}
                  </span>

                  {showRedeemButton && !justRedeemed && (
                    <button
                      type="button"
                      className={styles.redeemButton}
                      onClick={() => handleRedeem(card.scratchCardId)}
                      disabled={redeemMutation.isPending}
                    >
                      {redeemMutation.isPending ? "Redeeming..." : "Redeem"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
