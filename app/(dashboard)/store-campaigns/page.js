"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CampaignCard from "@/components/dashboard/CampaignCard";
import FilterTabs from "@/components/dashboard/FilterTabs";
import SearchBar from "@/components/dashboard/SearchBar";
import { useStoreCampaignsQuery } from "@/hooks/queries/useStoreCampaignsQuery";
import styles from "./store-campaigns.module.css";

// Same low-scratch threshold and status-calculation logic as the merchant's
// own Campaigns page (app/(dashboard)/campaign/page.js), kept in sync so a
// campaign shows the same status/badge everywhere.
const LOW_SCRATCH_RATIO = 0.1;

function getCalculatedStatus(campaign) {
  const now = new Date();
  const startDate = new Date(campaign.startDate);
  const endDate = new Date(campaign.endDate);
  if (campaign.status === "draft") return "draft";
  if (endDate < now) return "ended";
  if (startDate > now) return "scheduled";
  return campaign.status || "active";
}

function isLowScratch(campaign) {
  const allocated = Number(campaign.allocatedScratchCards || 0);
  if (allocated <= 0) return false;
  return Number(campaign.remainingScratchCards || 0) / allocated <= LOW_SCRATCH_RATIO;
}

export default function StoreCampaignsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: campaignsJson, isPending: loading, error: queryError } = useStoreCampaignsQuery();
  const campaigns = useMemo(() => campaignsJson || [], [campaignsJson]);
  const error = queryError ? queryError.message : null;

  const lowScratchCount = useMemo(() => campaigns.filter(isLowScratch).length, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns;

    if (searchQuery.trim()) {
      filtered = filtered.filter((c) => (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (activeTab !== "all") {
      filtered = filtered.filter((c) => {
        const now = new Date();
        const startDate = new Date(c.startDate);
        const endDate = new Date(c.endDate);
        switch (activeTab) {
          case "active":
            return now >= startDate && now <= endDate;
          case "ending-soon": {
            const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            return daysLeft > 0 && daysLeft <= 30;
          }
          case "ended":
            return now > endDate;
          case "draft":
            return c.status === "draft";
          case "low-scratches":
            return isLowScratch(c);
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [campaigns, searchQuery, activeTab]);

  const handleView = (campaignId) => {
    router.push(`/store-campaigns/${campaignId}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Campaigns</h1>
          <p className={styles.subtitle}>Campaigns currently allocated to your store</p>
        </div>
      </div>

      <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search campaigns..." />

      <FilterTabs activeTab={activeTab} onTabChange={setActiveTab} lowScratchCount={lowScratchCount} />

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
          {filteredCampaigns.map((c) => (
            <CampaignCard
              key={c._id}
              id={c._id}
              name={c.name}
              startDate={c.startDate}
              endDate={c.endDate}
              status={getCalculatedStatus(c)}
              storesCount={c.storeCount}
              scratchesLeft={c.remainingScratchCards}
              scratchesAllocated={c.allocatedScratchCards}
              scratchesTotal={c.allocatedScratchCards}
              scratchesClaimed={c.redeemedScratchCards}
              priceRange={c.priceRange}
              hasRanges={c.hasRanges}
              readOnly
              onView={handleView}
            />
          ))}
        </div>
      )}
    </div>
  );
}
