"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { ChevronLeft, Plus } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import BillingRangeCard from "@/components/dashboard/BillingRangeCard";
import QuickStatsBar from "@/components/dashboard/QuickStatsBar";
import CampaignLaunchModal from "./components/CampaignLaunchModal";

export default function RangePageByCampaignID({ params }) {
  const router = useRouter();
  const { account } = useAuthContext();

  const [campaignId, setCampaignId] = useState("");
  const [campaign, setCampaign] = useState(null);
  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalRanges: 0,
    activeRanges: 0,
    totalValue: 0,
  });

  // Modal state
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [launchValidationErrors, setLaunchValidationErrors] = useState([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState(null);

  // Fetch ranges with useCallback
  const fetchRanges = useCallback(
    async (id) => {
      if (!account?.id) {
        setError("User authentication required");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/campaign_range?id=${id}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "x-user-id": account.id,
              "x-user-role": account.role || "",
            },
          }
        );

        const data = await response.json();

        if (data.success && data.ranges) {
          setRanges(data.ranges);

          // Calculate stats
          const totalRanges = data.ranges.length;
          const activeRanges = data.ranges.filter(
            (r) => r.status === "active"
          ).length;
          const totalValue = data.ranges.reduce((sum, r) => {
            const min = parseInt(r.minAmount) || 0;
            const max = parseInt(r.maxAmount) || 0;
            return sum + (max - min);
          }, 0);

          setStats({
            totalRanges,
            activeRanges,
            totalValue,
          });
        } else {
          setRanges([]);
          setStats({
            totalRanges: 0,
            activeRanges: 0,
            totalValue: 0,
          });
        }
      } catch (err) {
        console.error("Failed to fetch ranges:", err);
        setError("Failed to load billing ranges. Please try again.");
        setRanges([]);
      } finally {
        setLoading(false);
      }
    },
    [account]
  );

  // Fetch campaign details
  const fetchCampaignDetails = useCallback(
    async (id) => {
      if (!account?.id) return;

      try {
        const response = await fetch(`/api/campaigns/${id}`, {
          method: "GET",
          credentials: "include",
          headers: {
            "x-user-id": account.id,
            "x-user-role": account.role || "Merchant",
          },
        });

        const data = await response.json();
        if (data.success && data.data) {
          setCampaign(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch campaign details:", err);
      }
    },
    [account]
  );

  // Unwrap params and fetch data
  useEffect(() => {
    async function unwrapParams() {
      try {
        const { id } = await params;
        setCampaignId(id);
        fetchRanges(id);
        fetchCampaignDetails(id);
      } catch (err) {
        console.error("Failed to unwrap params:", err);
        setError("Failed to load campaign data");
      }
    }

    unwrapParams();
  }, [params, fetchRanges, fetchCampaignDetails]);

  // Handle edit range
  const handleEditRange = (rangeId) => {
    router.push(`/range/${campaignId}/edit/${rangeId}`);
  };

  // Handle duplicate range
  const handleDuplicateRange = (rangeId) => {
    console.log("TODO: implement duplicate for range:", rangeId);
  };

  // Handle delete range
  const handleDeleteRange = (rangeId) => {
    const confirmed = confirm(
      "Are you sure you want to delete this range? This action cannot be undone."
    );
    if (confirmed) {
      console.log("TODO: implement delete for range:", rangeId);
    }
  };

  // Handle preview & launch
  const handlePreviewLaunch = () => {
    const errors = [];

    // Validation 1: Check billing ranges
    if (!ranges || ranges.length === 0) {
      errors.push("Please create at least one billing range.");
    }

    // Validation 2: Check store allocations
    if (!campaign?.assignedStores || campaign.assignedStores.length === 0) {
      console.log(campaign, "campaign")
      errors.push("Please assign at least one store.");
    }

    // Validation 3: Check scratch card allocation
    if (!campaign?.allocated_scratch_cards || campaign.allocated_scratch_cards === 0) {
      errors.push("Please allocate scratches before launch.");
    }

    // Validation 4: Check campaign not ended
    if (campaign?.status?.toLowerCase() === "ended") {
      errors.push("Cannot launch an ended campaign.");
    }

    setLaunchValidationErrors(errors);
    setShowLaunchModal(true);
  };

  // Handle launch confirmation
  const handleLaunchConfirm = async () => {
    try {
      setIsLaunching(true);
      setLaunchError(null);

      const response = await fetch(`/api/campaigns/${campaignId}/generate-qr`, {
        method: "POST",
        credentials: "include",
        headers: {
          "x-user-id": account.id,
          "x-user-role": account.role || "Merchant",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setLaunchError(data.message || "Failed to generate QR code");
        return;
      }

      // Success - redirect to live page
      setShowLaunchModal(false);
      router.push(`/campaign/${campaignId}/live`);
    } catch (err) {
      console.error("Failed to launch campaign:", err);
      setLaunchError(err.message || "Failed to launch campaign");
    } finally {
      setIsLaunching(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>Loading ranges...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>{error}</div>
      </div>
    );
  }

  // Empty state (no ranges)
  if (!ranges || ranges.length === 0) {
    return (
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => router.back()}
            title="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>Billing Ranges</h1>
            <p className={styles.subtitle}>
              Configure spending ranges and rewards
            </p>
          </div>
        </div>

        {/* Empty State Card */}
        <div className={styles.rangeGrid}>
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📋</div>
            <h2 className={styles.emptyStateTitle}>No Billing Ranges Yet</h2>
            <p className={styles.emptyStateText}>
              Create your first billing range to define reward tiers based on
              customer spending.
            </p>
            <Link href={`/range/${campaignId}/create`}>
              <button className={styles.emptyStateButton}>
                <Plus size={16} />
                Create First Range
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Normal state with ranges
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.back()}
          title="Go back"
        >
          <ChevronLeft size={20} />
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Billing Ranges</h1>
          <p className={styles.subtitle}>
            Configure spending ranges and rewards
          </p>
        </div>
        <Link href={`/range/${campaignId}/create`}>
          <button className={styles.addButton}>
            <Plus size={16} />
            Add Range
          </button>
        </Link>
      </div>

      {/* Quick Stats Bar */}
      <QuickStatsBar
        stats={[
          {
            label: "Total Ranges",
            value: stats.totalRanges,
          },
          {
            label: "Active Ranges",
            value: stats.activeRanges,
          },
          {
            label: "Total Value",
            value: `₹${stats.totalValue.toLocaleString("en-IN")}`,
          },
        ]}
      />

      {/* Range Card Grid */}
      <div className={styles.rangeGrid}>
        {ranges.map((range) => (
          <BillingRangeCard
            key={range._id}
            rangeId={range._id}
            campaignId={campaignId}
            label={range.label}
            minAmount={range.minAmount}
            maxAmount={range.maxAmount}
            rewardType={range.rewardType || "Fixed Amount"}
            totalQuantity={range.totalQuantity || 0}
            status={range.status || "active"}
            onEdit={() => handleEditRange(range._id)}
            onDuplicate={() => handleDuplicateRange(range._id)}
            onDelete={() => handleDeleteRange(range._id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button
          className={styles.previewButton}
          disabled={ranges.length < 1}
          onClick={handlePreviewLaunch}
        >
          Preview & Launch
        </button>
      </div>

      {/* Launch Modal */}
      <CampaignLaunchModal
        isOpen={showLaunchModal}
        onClose={() => setShowLaunchModal(false)}
        validationErrors={launchValidationErrors}
        isLoading={isLaunching}
        error={launchError}
        onConfirm={handleLaunchConfirm}
        campaignName={campaign?.name || campaign?.campaignName}
      />
    </div>
  );
}
