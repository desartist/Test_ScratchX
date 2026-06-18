"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronRight,
  Trash2,
  Eye,
  Download,
  BarChart3,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./AssignedCampaignsList.module.css";

export default function AssignedCampaignsList({
  campaigns = [],
  storeId,
  onCampaignRemoved,
}) {
  const router = useRouter();
  const [loadingRemove, setLoadingRemove] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("daysLeft");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return styles.statusActive;
      case "inactive":
        return styles.statusInactive;
      case "ending_soon":
        return styles.statusEndingSoon;
      case "ended":
        return styles.statusEnded;
      default:
        return styles.statusDefault;
    }
  };

  // Calculate days left
  const getDaysLeft = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = end - today;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  // Handle single campaign removal
  const handleRemoveCampaign = async (campaignId) => {
    if (
      !confirm("Are you sure you want to remove this campaign from the store?")
    ) {
      return;
    }

    setLoadingRemove(campaignId);
    setError(null);

    try {
      const response = await fetch(`/api/stores/${storeId}/remove-campaign`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignIds: [campaignId],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove campaign");
      }

      const result = await response.json();
      if (result.success) {
        setLoadingRemove(null);
        onCampaignRemoved();
      } else {
        setError(result.error || "Failed to remove campaign");
        setLoadingRemove(null);
      }
    } catch (err) {
      setError(err.message || "Failed to remove campaign");
      setLoadingRemove(null);
    }
  };

  // Handle batch removal
  const handleBatchRemove = async () => {
    if (selectedCampaigns.length === 0) {
      setError("Please select campaigns to remove");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to remove ${selectedCampaigns.length} campaign${selectedCampaigns.length !== 1 ? "s" : ""} from the store?`,
      )
    ) {
      return;
    }

    setLoadingRemove("batch");
    setError(null);

    try {
      const response = await fetch(`/api/stores/${storeId}/remove-campaign`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignIds: selectedCampaigns,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove campaigns");
      }

      const result = await response.json();
      if (result.success || result.removedCount > 0) {
        setSelectedCampaigns([]);
        setLoadingRemove(null);
        onCampaignRemoved();
      } else {
        setError(result.error || "Failed to remove campaigns");
        setLoadingRemove(null);
      }
    } catch (err) {
      setError(err.message || "Failed to remove campaigns");
      setLoadingRemove(null);
    }
  };

  // Toggle campaign selection
  const handleSelectCampaign = (campaignId) => {
    setSelectedCampaigns((prev) =>
      prev.includes(campaignId)
        ? prev.filter((id) => id !== campaignId)
        : [...prev, campaignId],
    );
  };

  // Select all campaigns
  const handleSelectAll = () => {
    if (selectedCampaigns.length === filteredAndSortedCampaigns.length) {
      setSelectedCampaigns([]);
    } else {
      setSelectedCampaigns(filteredAndSortedCampaigns.map((c) => c._id));
    }
  };

  // Filter and sort campaigns
  const filteredAndSortedCampaigns = useMemo(() => {
    let filtered = campaigns.filter((campaign) => {
      if (filterStatus === "all") return true;
      return campaign.status?.toLowerCase() === filterStatus.toLowerCase();
    });

    // Sort campaigns
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "daysLeft": {
          const daysA = getDaysLeft(a.endDate || a.end_date) || 999;
          const daysB = getDaysLeft(b.endDate || b.end_date) || 999;
          return daysA - daysB;
        }
        case "usage": {
          const totalA = a.scratchTotal || a.allocated_scratch_cards || 0;
          const usedA = a.scratchUsed || a.used_scratch_cards || 0;
          const usageA = totalA > 0 ? (usedA / totalA) * 100 : 0;

          const totalB = b.scratchTotal || b.allocated_scratch_cards || 0;
          const usedB = b.scratchUsed || b.used_scratch_cards || 0;
          const usageB = totalB > 0 ? (usedB / totalB) * 100 : 0;

          return usageB - usageA;
        }
        case "date": {
          const dateA = new Date(a.startDate || a.start_date || 0);
          const dateB = new Date(b.startDate || b.start_date || 0);
          return dateB - dateA;
        }
        case "name": {
          const nameA = (a.name || a.campaignName || "").toLowerCase();
          const nameB = (b.name || b.campaignName || "").toLowerCase();
          return nameA.localeCompare(nameB);
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [campaigns, filterStatus, sortBy]);

  // Calculate analytics
  const analytics = useMemo(() => {
    if (campaigns.length === 0) return null;

    const totalAllocated = campaigns.reduce(
      (sum, c) => sum + (c.scratchTotal || c.allocated_scratch_cards || 0),
      0,
    );
    const totalUsed = campaigns.reduce(
      (sum, c) => sum + (c.scratchUsed || c.used_scratch_cards || 0),
      0,
    );
    const totalRemaining = totalAllocated - totalUsed;
    const avgUsagePercent =
      totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;

    const activeCampaigns = campaigns.filter(
      (c) => c.status?.toLowerCase() === "active",
    ).length;
    const endingSoon = campaigns.filter((c) => {
      const days = getDaysLeft(c.endDate || c.end_date);
      return days !== null && days < 7 && days >= 0;
    }).length;

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns,
      endingSoon,
      totalAllocated,
      totalUsed,
      totalRemaining,
      avgUsagePercent,
    };
  }, [campaigns]);

  // Export to CSV
  const handleExportCSV = () => {
    if (campaigns.length === 0) return;

    const headers = [
      "Campaign Name",
      "Status",
      "Start Date",
      "End Date",
      "Days Left",
      "Allocated",
      "Used",
      "Remaining",
      "Usage %",
    ];
    const rows = filteredAndSortedCampaigns.map((campaign) => {
      const daysLeft = getDaysLeft(campaign.endDate || campaign.end_date);
      const total =
        campaign.scratchTotal || campaign.allocated_scratch_cards || 0;
      const used = campaign.scratchUsed || campaign.used_scratch_cards || 0;
      const remaining = total - used;
      const usage = total > 0 ? ((used / total) * 100).toFixed(1) : 0;

      return [
        campaign.name || campaign.campaignName,
        campaign.status || "Active",
        formatDate(campaign.startDate || campaign.start_date),
        formatDate(campaign.endDate || campaign.end_date),
        daysLeft !== null ? daysLeft : "N/A",
        total,
        used,
        remaining,
        `${usage}%`,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `campaigns-store-${storeId}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (campaigns.length === 0) return;

    const data = {
      storeId,
      exportDate: new Date().toISOString(),
      totalCampaigns: filteredAndSortedCampaigns.length,
      campaigns: filteredAndSortedCampaigns.map((campaign) => ({
        id: campaign._id,
        name: campaign.name || campaign.campaignName,
        status: campaign.status,
        startDate: campaign.startDate || campaign.start_date,
        endDate: campaign.endDate || campaign.end_date,
        daysLeft: getDaysLeft(campaign.endDate || campaign.end_date),
        scratchAllocated:
          campaign.scratchTotal || campaign.allocated_scratch_cards,
        scratchUsed: campaign.scratchUsed || campaign.used_scratch_cards,
        scratchRemaining:
          (campaign.scratchTotal || campaign.allocated_scratch_cards || 0) -
          (campaign.scratchUsed || campaign.used_scratch_cards || 0),
      })),
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `campaigns-store-${storeId}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Campaigns Assigned to This Store</h2>
        </div>
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            No campaigns assigned to this store yet
          </p>
          <p className={styles.emptySubtext}>
            Assign campaigns using the "Assign Campaigns" button above
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Campaigns Assigned to This Store</h2>
          <p className={styles.subtitle}>
            {filteredAndSortedCampaigns.length} of {campaigns.length} campaign
            {campaigns.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.toolbarButton}
            onClick={() => setShowAnalytics(!showAnalytics)}
            title="View analytics"
          >
            <BarChart3 size={18} />
            Analytics
          </button>
          <div className={styles.exportMenu}>
            <button
              className={styles.toolbarButton}
              title="Download as CSV"
              onClick={handleExportCSV}
            >
              <Download size={18} />
              CSV
            </button>
            <button
              className={styles.toolbarButton}
              title="Download as JSON"
              onClick={handleExportJSON}
            >
              <Download size={18} />
              JSON
            </button>
          </div>
        </div>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* Analytics Dashboard */}
      {showAnalytics && analytics && (
        <div className={styles.analyticsPanel}>
          <div className={styles.analyticsGrid}>
            <div className={styles.analyticsCard}>
              <p className={styles.analyticsLabel}>Total Campaigns</p>
              <p className={styles.analyticsValue}>
                {analytics.totalCampaigns}
              </p>
            </div>
            <div className={styles.analyticsCard}>
              <p className={styles.analyticsLabel}>Active</p>
              <p className={styles.analyticsValue}>
                {analytics.activeCampaigns}
              </p>
            </div>
            <div className={styles.analyticsCard}>
              <p className={styles.analyticsLabel}>Ending Soon</p>
              <p className={styles.analyticsValue}>{analytics.endingSoon}</p>
            </div>
            <div className={styles.analyticsCard}>
              <p className={styles.analyticsLabel}>Avg Usage</p>
              <p className={styles.analyticsValue}>
                {analytics.avgUsagePercent.toFixed(1)}%
              </p>
            </div>
            <div className={styles.analyticsCard}>
              <p className={styles.analyticsLabel}>Total Allocated</p>
              <p className={styles.analyticsValue}>
                {analytics.totalAllocated.toLocaleString()}
              </p>
            </div>
            <div className={styles.analyticsCard}>
              <p className={styles.analyticsLabel}>Total Used</p>
              <p className={styles.analyticsValue}>
                {analytics.totalUsed.toLocaleString()}
              </p>
            </div>
            <div className={styles.analyticsCard}>
              <p className={styles.analyticsLabel}>Total Remaining</p>
              <p className={styles.analyticsValue}>
                {analytics.totalRemaining.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar with Filters and Sorting */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={
                selectedCampaigns.length ===
                  filteredAndSortedCampaigns.length &&
                filteredAndSortedCampaigns.length > 0
              }
              onChange={handleSelectAll}
              className={styles.checkbox}
            />
            Select All ({selectedCampaigns.length})
          </label>

          {selectedCampaigns.length > 0 && (
            <button
              className={styles.batchRemoveButton}
              onClick={handleBatchRemove}
              disabled={loadingRemove === "batch"}
            >
              <Trash2 size={16} />
              Remove Selected ({selectedCampaigns.length})
            </button>
          )}
        </div>

        <div className={styles.toolbarRight}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="ending_soon">Ending Soon</option>
              <option value="ended">Ended</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="daysLeft">Days Left (Ascending)</option>
              <option value="usage">Usage (High to Low)</option>
              <option value="date">Date (Newest First)</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.campaignsList}>
        {filteredAndSortedCampaigns.map((campaign) => {
          const daysLeft = getDaysLeft(campaign.endDate || campaign.end_date);
          const scratchUsed =
            campaign.scratchUsed || campaign.used_scratch_cards || 0;
          const scratchTotal =
            campaign.scratchTotal || campaign.allocated_scratch_cards || 0;
          const scratchRemaining = Math.max(0, scratchTotal - scratchUsed);
          // Round used% first, then derive remaining as its complement so they
          // always sum to exactly 100 (avoids 0.1% used + 100.0% remaining).
          const usagePercent =
            scratchTotal > 0 ? (scratchUsed / scratchTotal) * 100 : 0;
          const usedDisplayPct = parseFloat(usagePercent.toFixed(1));
          const remainingDisplayPct = parseFloat((100 - usedDisplayPct).toFixed(1));

          return (
            <div key={campaign._id} className={styles.campaignCard}>
              {/* Checkbox */}
              <label className={styles.cardCheckbox}>
                <input
                  type="checkbox"
                  checked={selectedCampaigns.includes(campaign._id)}
                  onChange={() => handleSelectCampaign(campaign._id)}
                  className={styles.checkbox}
                />
              </label>

              {/* Campaign Header */}
              <div className={styles.cardHeader}>
                <div className={styles.headerLeft}>
                  <h3 className={styles.campaignName}>
                    {campaign.name || campaign.campaignName}
                  </h3>
                  <div className={styles.badgeGroup}>
                    <span
                      className={`${styles.statusBadge} ${getStatusColor(campaign.status)}`}
                    >
                      {campaign.status?.charAt(0).toUpperCase() +
                        campaign.status?.slice(1) || "Active"}
                    </span>
                    {daysLeft !== null && (
                      <span
                        className={`${styles.daysBadge} ${daysLeft < 7 ? styles.daysWarning : ""}`}
                      >
                        {daysLeft <= 0
                          ? "Ended"
                          : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Campaign Details Grid */}
              <div className={styles.detailsGrid}>
                {/* Date Range */}
                <div className={styles.detailItem}>
                  <p className={styles.detailLabel}>Period</p>
                  <p className={styles.detailValue}>
                    {formatDate(campaign.startDate || campaign.start_date)} -{" "}
                    {formatDate(campaign.endDate || campaign.end_date)}
                  </p>
                </div>

                {/* Billing Ranges */}
                <div className={styles.detailItem}>
                  <p className={styles.detailLabel}>Billing Ranges</p>
                  <p className={styles.detailValue}>
                    {campaign.billingRanges?.length ||
                      campaign.ranges?.length ||
                      0}{" "}
                    range
                    {(campaign.billingRanges?.length ||
                      campaign.ranges?.length ||
                      0) !== 1
                      ? "s"
                      : ""}
                  </p>
                </div>

                {/* Scratch Allocation */}
                <div className={styles.detailItem}>
                  <p className={styles.detailLabel}>Allocated</p>
                  <p className={styles.detailValue}>
                    {scratchTotal.toLocaleString()} cards
                  </p>
                </div>

                {/* Scratch Used */}
                <div className={styles.detailItem}>
                  <p className={styles.detailLabel}>Used</p>
                  <p className={styles.detailValue}>
                    {scratchUsed.toLocaleString()} cards
                  </p>
                </div>
              </div>

              {/* Scratch Progress Bar */}
              {scratchTotal > 0 && (
                <div className={styles.progressSection}>
                  <div className={styles.progressHeader}>
                    <p className={styles.progressLabel}>Scratch Usage</p>
                    <p className={styles.progressValue}>
                      {scratchRemaining.toLocaleString()} remaining
                    </p>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                  <div className={styles.progressStats}>
                    <span>{usedDisplayPct}% used</span>
                    <span>{remainingDisplayPct}% remaining</span>
                  </div>
                </div>
              )}

              {/* Card Actions */}
              <div className={styles.cardActions}>
                <button
                  className={styles.viewButton}
                  onClick={() => router.push(`/campaign/${campaign._id}`)}
                  title="View campaign details"
                >
                  <Eye size={16} />
                  View Campaign
                </button>
                <button
                  className={styles.removeButton}
                  onClick={() => handleRemoveCampaign(campaign.campaignId)}
                  disabled={loadingRemove === campaign.campaignId}
                  title="Remove campaign from store"
                >
                  <Trash2 size={16} />
                  {loadingRemove === campaign.campaignId
                    ? "Removing..."
                    : "Remove"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
