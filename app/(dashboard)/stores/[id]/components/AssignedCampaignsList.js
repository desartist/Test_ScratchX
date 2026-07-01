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
  MoreVertical,
  AlertCircle,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthContext";
import styles from "./AssignedCampaignsList.module.css";

export default function AssignedCampaignsList({
  campaigns = [],
  storeId,
  onCampaignRemoved,
}) {
  const router = useRouter();
  const { account } = useAuthContext();
  const [loadingRemove, setLoadingRemove] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("daysLeft");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

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
    setConfirmAction({
      type: "single",
      campaignId,
      message: "Are you sure you want to remove this campaign from the store?",
    });
    setShowConfirmModal(true);
  };

  // Handle batch removal
  const handleBatchRemove = async () => {
    if (selectedCampaigns.length === 0) {
      setError("Please select campaigns to remove");
      return;
    }

    setConfirmAction({
      type: "batch",
      campaignIds: selectedCampaigns,
      message: `Are you sure you want to remove ${selectedCampaigns.length} campaign${selectedCampaigns.length !== 1 ? "s" : ""} from the store?`,
    });
    setShowConfirmModal(true);
  };

  // Execute removal after confirmation
  const executeRemoval = async () => {
    if (!confirmAction) return;

    const campaignIds =
      confirmAction.type === "single"
        ? [confirmAction.campaignId]
        : confirmAction.campaignIds;

    setLoadingRemove(confirmAction.type === "batch" ? "batch" : confirmAction.campaignId);
    setError(null);
    setShowConfirmModal(false);

    try {
      const response = await fetch(`/api/stores/${storeId}/remove-campaign`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove campaign(s)");
      }

      const result = await response.json();
      if (result.success || result.removedCount > 0) {
        setSelectedCampaigns([]);
        setLoadingRemove(null);
        setConfirmAction(null);
        onCampaignRemoved();
      } else {
        setError(result.error || "Failed to remove campaign(s)");
        setLoadingRemove(null);
      }
    } catch (err) {
      setError(err.message || "Failed to remove campaign(s)");
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
        case "name":
          return (a.name || a.campaignName || "").localeCompare(
            b.name || b.campaignName || ""
          );
        case "date":
          return new Date(b.createdAt) - new Date(a.createdAt);
        default:
          return 0;
      }
    });

    return filtered;
  }, [campaigns, filterStatus, sortBy]);

  if (campaigns.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h3 className={styles.emptyTitle}>No Campaigns Assigned</h3>
          <p className={styles.emptyDescription}>
            Assign campaigns to this store to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <label className={styles.selectAllLabel}>
            <input
              type="checkbox"
              checked={
                selectedCampaigns.length === filteredAndSortedCampaigns.length &&
                filteredAndSortedCampaigns.length > 0
              }
              onChange={handleSelectAll}
              className={styles.checkbox}
            />
            Select All ({filteredAndSortedCampaigns.length})
          </label>
        </div>

        <div className={styles.toolbarRight}>
          <button
            className={styles.filterButton}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filter
          </button>
          <button className={styles.sortButton} onClick={() => setShowFilters(!showFilters)}>
            <ArrowUpDown size={16} />
            Sort
          </button>

          {selectedCampaigns.length > 0 && (
            <button
              className={styles.removeButton}
              onClick={handleBatchRemove}
              disabled={loadingRemove === "batch"}
            >
              <Trash2 size={16} />
              Remove ({selectedCampaigns.length})
            </button>
          )}
        </div>
      </div>

      {/* Filters and Sort (if shown) */}
      {showFilters && (
        <div className={styles.filterPanel}>
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
              <option value="ended">Ended</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Sort By:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="daysLeft">Days Left</option>
              <option value="name">Name</option>
              <option value="date">Date Created</option>
            </select>
          </div>
        </div>
      )}

      {/* Campaign List */}
      <div className={styles.campaignListWrapper}>
        {filteredAndSortedCampaigns.length === 0 ? (
          <div className={styles.noResults}>
            <p>No campaigns match your filters</p>
          </div>
        ) : (
          <div className={styles.campaignList}>
            {filteredAndSortedCampaigns.map((campaign) => {
              const daysLeft = getDaysLeft(campaign.endDate || campaign.end_date);
              const isSelected = selectedCampaigns.includes(campaign._id);

              return (
                <div
                  key={campaign._id}
                  className={`${styles.campaignRow} ${isSelected ? styles.selected : ""}`}
                >
                  <label className={styles.selectCheckbox}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectCampaign(campaign._id)}
                      className={styles.checkbox}
                    />
                  </label>

                  <div className={styles.campaignInfo}>
                    <div className={styles.campaignName}>
                      {campaign.name || campaign.campaignName}
                    </div>
                    <div className={styles.campaignMeta}>
                      <span
                        className={`${styles.badge} ${getStatusColor(campaign.status)}`}
                      >
                        {campaign.status || "Draft"}
                      </span>
                      {daysLeft !== null && (
                        <span className={styles.daysLeft}>
                          {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.campaignDetails}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Period:</span>
                      <span className={styles.detailValue}>
                        {formatDate(campaign.startDate || campaign.start_date)} -{" "}
                        {formatDate(campaign.endDate || campaign.end_date)}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Allocated:</span>
                      <span className={styles.detailValue}>
                        {campaign.allocated_scratch_cards?.toLocaleString("en-IN") || "-"}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Used:</span>
                      <span className={styles.detailValue}>
                        {campaign.used_scratch_cards?.toLocaleString("en-IN") || "-"}
                      </span>
                    </div>
                  </div>

                  <div className={styles.campaignActions}>
                    <button
                      className={styles.actionButton}
                      onClick={() =>
                        router.push(
                          `/campaigns/${campaign._id}`,
                        )
                      }
                      title="View campaign"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.danger}`}
                      onClick={() => handleRemoveCampaign(campaign._id)}
                      disabled={loadingRemove === campaign._id}
                      title="Remove campaign"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className={styles.modalOverlay} onClick={() => setShowConfirmModal(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIcon}>
              <AlertCircle size={48} />
            </div>
            <h2 className={styles.confirmTitle}>Remove Campaign?</h2>
            <p className={styles.confirmMessage}>{confirmAction.message}</p>
            <div className={styles.confirmFooter}>
              <button
                className={styles.confirmCancelBtn}
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmDeleteBtn}
                onClick={executeRemoval}
                disabled={loadingRemove}
              >
                {loadingRemove ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
