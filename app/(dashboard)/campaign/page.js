"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthContext";
import CampaignCard from "@/components/dashboard/CampaignCard";
import FilterTabs from "@/components/dashboard/FilterTabs";
import SearchBar from "@/components/dashboard/SearchBar";
import CampaignEmptyState from "@/components/campaign/CampaignEmptyState";
import styles from "./campaign.module.css";

// Low-scratch threshold: allocated > 0 AND remaining/allocated <= 10%.
const LOW_SCRATCH_RATIO = 0.1;

function getAllocated(campaign) {
  return Number(
    campaign.allocated_scratch_cards ?? campaign.scratchCardsLimit ?? 0,
  );
}

function getRemaining(campaign) {
  const allocated = getAllocated(campaign);
  return Number(
    campaign.remaining_scratch_cards ??
      allocated - (campaign.scratchCardsUsed ?? 0),
  );
}

function isLowScratch(campaign) {
  const allocated = getAllocated(campaign);
  if (allocated <= 0) return false;
  return getRemaining(campaign) / allocated <= LOW_SCRATCH_RATIO;
}

export default function CampaignPage() {
  const router = useRouter();
  const { account, loading: authLoading } = useAuthContext();

  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/campaigns", {
        headers: {
          "x-user-id": account.id,
          "x-user-role": account.role || "merchant",
          "x-user-email": account.email || "",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch campaigns");
      const result = await response.json();
      setCampaigns(result.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching campaigns:", err);
    } finally {
      setLoading(false);
    }
  }, [account]);

  // Fetch campaigns
  useEffect(() => {
    if (!authLoading && account?.id) {
      fetchCampaigns();
    }
  }, [authLoading, account?.id, fetchCampaigns]);

  // Pause / resume via existing PUT endpoint.
  const togglePause = useCallback(
    async (campaignId, nextStatus) => {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": account?.id,
            "x-user-role": account?.role || "Merchant",
            "x-user-email": account?.email || "",
          },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (!response.ok) {
          // Fall back to details page if status update isn't supported.
          router.push(`/campaign/${campaignId}`);
          return;
        }
        await fetchCampaigns();
      } catch (err) {
        console.error("Error updating campaign status:", err);
        router.push(`/campaign/${campaignId}`);
      }
    },
    [account, fetchCampaigns, router],
  );

  const deleteCampaign = useCallback(
    async (campaignId) => {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "x-user-id": account?.id,
          "x-user-role": account?.role || "Merchant",
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        return { error: data?.error || data?.message || "Failed to delete campaign." };
      }
      await fetchCampaigns();
      return { success: true };
    },
    [account, fetchCampaigns],
  );

  // Central action handler for card menu + inline buttons.
  const handleAction = useCallback(
    (action, campaignId) => {
      switch (action) {
        case "scratches":
          router.push(`/campaign/${campaignId}/ranges`);
          break;
        case "edit":
          router.push(`/campaign/${campaignId}`);
          break;
        case "pause":
          togglePause(campaignId, "paused");
          break;
        case "resume":
          togglePause(campaignId, "active");
          break;
        case "delete":
          return deleteCampaign(campaignId);
        default:
          break;
      }
    },
    [router, togglePause, deleteCampaign],
  );

  const handleView = useCallback(
    (campaignId) => {
      router.push(`/campaign/${campaignId}`);
    },
    [router],
  );

  // Count of low-scratch campaigns for the filter pill badge.
  const lowScratchCount = useMemo(
    () => campaigns.filter((c) => isLowScratch(c)).length,
    [campaigns],
  );

  // Filter campaigns based on search and tab
  useEffect(() => {
    let filtered = campaigns;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter((campaign) => {
        const name = campaign.campaignName || campaign.name || "";
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    // Apply tab filter
    if (activeTab !== "all") {
      filtered = filtered.filter((campaign) => {
        const now = new Date();
        const startDate = new Date(campaign.startDate);
        const endDate = new Date(campaign.endDate);

        switch (activeTab) {
          case "active":
            return now >= startDate && now <= endDate;
          case "ending-soon": {
            const daysLeft = Math.ceil(
              (endDate - now) / (1000 * 60 * 60 * 24),
            );
            return daysLeft > 0 && daysLeft <= 30;
          }
          case "ended":
            return now > endDate;
          case "draft":
            return campaign.status === "draft";
          case "low-scratches":
            return isLowScratch(campaign);
          default:
            return true;
        }
      });
    }

    setFilteredCampaigns(filtered);
  }, [campaigns, searchQuery, activeTab]);

  if (authLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  // Onboarding empty state: merchant has no campaigns at all (not a filtered/search miss).
  const hasActiveSearchOrFilter =
    searchQuery.trim() !== "" || activeTab !== "all";
  const showOnboarding =
    !loading && !error && !hasActiveSearchOrFilter && campaigns.length === 0;

  const hasActivePlan = Boolean(account?.activePlan);

  if (showOnboarding) {
    return (
      <div className={styles.container}>
        <CampaignEmptyState hasActivePlan={hasActivePlan} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Campaigns</h1>
          <p className={styles.subtitle}>
            Manage your campaigns and track performance
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search campaigns..."
      />

      {/* Filter Tabs */}
      <FilterTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lowScratchCount={lowScratchCount}
      />

      {/* Content */}
      {loading ? (
        <div className={styles.loading}>Loading campaigns...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : filteredCampaigns.length === 0 ? (
        <div className={styles.empty}>
          <p>No campaigns found</p>
        </div>
      ) : (
        <div className={styles.campaignsGrid}>
          {filteredCampaigns.map((campaign) => {
            // Map API response fields to component props with better fallbacks
            const campaignName =
              campaign.campaignName || campaign.name || "Campaign";
            const storeCount =
              campaign.storeCount || campaign.stores?.length || 0;

            // Use actual API data - no synthetic fallbacks
            const allocatedCards = getAllocated(campaign);
            const remainingCards = getRemaining(campaign);
            const claimedCards = campaign.redeemed_scratch_cards ?? 0;

            // Calculate distributed (used) scratches from API data
            const distributedCards = Math.max(
              0,
              allocatedCards - remainingCards,
            );

            return (
              <CampaignCard
                key={campaign._id}
                id={campaign._id}
                name={campaignName}
                startDate={campaign.startDate}
                endDate={campaign.endDate}
                status={campaign.status}
                storesCount={storeCount}
                scratchesLeft={remainingCards}
                scratchesAllocated={allocatedCards}
                scratchesTotal={allocatedCards}
                scratchesDistributed={distributedCards}
                scratchesClaimed={claimedCards}
                priceRange={campaign.priceRange}
                hasRanges={campaign.hasRanges}
                onView={handleView}
                onAction={handleAction}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
