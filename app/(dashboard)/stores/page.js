"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Store, CheckCircle2, Hourglass, QrCode } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import { useStoreValidation } from "@/lib/hooks/useStoreValidation";
import { useQuery } from "@tanstack/react-query";
import { useStoresQuery, useDeleteStoreMutation } from "@/hooks/queries/useStoresQuery";
import { useSubscriptionStatusQuery } from "@/hooks/queries/useSubscriptionQuery";
import StoreCard from "@/components/stores/StoreCard";
import StatsCard from "@/components/stores/StatsCard";
import SearchBar from "@/components/dashboard/SearchBar";
import styles from "./page.module.css";

export default function StoresPage() {
  const router = useRouter();
  const { account } = useAuthContext();

  // Store validation is exempted for /stores pages in the hook
  // This allows users to view empty store list and create stores
  useStoreValidation();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const {
    data: storesJson,
    isPending: loading,
    error: queryError,
  } = useStoresQuery();
  const stores = useMemo(() => storesJson?.data || [], [storesJson]);
  const error = queryError?.message || null;

  const { data: pendingJson } = useQuery({
    queryKey: ["merchant-scratch-requests", "pending", account?.id],
    queryFn: async () => {
      const res = await fetch("/api/merchant/scratch-requests?status=pending");
      return res.json();
    },
    enabled: !!account?.id,
  });
  const pendingStoreIds = useMemo(() => {
    const ids = (pendingJson?.data || [])
      .map((r) => (r.storeId ? String(r.storeId) : null))
      .filter(Boolean);
    return new Set(ids);
  }, [pendingJson]);

  const { data: subscriptionJson } = useSubscriptionStatusQuery();
  const unlimitedScratches = !!subscriptionJson?.unlimitedScratches;

  const deleteStoreMutation = useDeleteStoreMutation();

  // Resolve which store is the "main" store: prefer an explicit flag, then the
  // account's mainStoreId (string-safe compare), else fall back to the first
  // store so a Main Store badge always appears.
  const resolvedMainId = useMemo(() => {
    if (!stores.length) return null;
    const flagged = stores.find(
      (s) =>
        s.isMainStore ||
        s.is_main_store ||
        s.isDefaultStore ||
        s.storeType === "MAIN",
    );
    if (flagged) return String(flagged._id);
    if (account?.mainStoreId) {
      const match = stores.find((s) => String(s._id) === String(account.mainStoreId));
      if (match) return String(match._id);
    }
    return String(stores[0]._id);
  }, [stores, account]);

  const [deleteError, setDeleteError] = useState(null);

  /**
   * Delete a store (non-main stores only)
   */
  const handleDeleteStore = async (storeId) => {
    if (!window.confirm("Are you sure you want to delete this store? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteStoreMutation.mutateAsync(storeId);
      setDeleteError(null);
    } catch (err) {
      setDeleteError(err.message || "Failed to delete store");
      console.error("Error deleting store:", err);
    }
  };

  /**
   * Redirect to store creation onboarding if merchant has no stores
   */
  useEffect(() => {
    if (!loading && stores.length === 0) {
      window.location.href = "/stores/create";
    }
  }, [loading, stores]);

  /**
   * Number of stores that currently have a pending scratch request.
   */
  const pendingRequestCount = useMemo(
    () => stores.filter((s) => pendingStoreIds.has(String(s._id))).length,
    [stores, pendingStoreIds]
  );

  /**
   * Filter stores based on search and status
   */
  const filteredStores = stores.filter((store) => {
    const matchesSearch =
      store.store_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.city?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesFilter = false;

    if (filterStatus === "All") {
      matchesFilter = true;
    } else if (filterStatus === "Pending Request") {
      matchesFilter = pendingStoreIds.has(String(store._id));
    } else if (filterStatus === "No Campaign") {
      matchesFilter = (store.campaigns_count || 0) === 0;
    } else if (filterStatus === "Low Activity") {
      const total = store.total_scratch_cards || 0;
      const scratchPercentage = total > 0
        ? Math.round(((store.used_scratch_cards || 0) / total) * 100)
        : 0;
      matchesFilter = scratchPercentage >= 80;
    }

    return matchesSearch && matchesFilter;
  });

  // Pin the main store to the top of the list (stable: others keep their order).
  const orderedStores = resolvedMainId
    ? [...filteredStores].sort((a, b) => {
        const am = String(a._id) === resolvedMainId ? 0 : 1;
        const bm = String(b._id) === resolvedMainId ? 0 : 1;
        return am - bm;
      })
    : filteredStores;

  /**
   * Calculate stats from actual API data
   */
  const stats = {
    totalStores: stores.length,
    activeStores: stores.filter((s) => s.status === "active").length,
    pendingRequests: stores.filter((s) => s.status === "pending").length,
    qrScansToday: stores.reduce((total, store) => total + (store.qr_scans || 0), 0),
  };

  const filterTabs = ["All", "Pending Request", "No Campaign", "Low Activity"];
  const displayError = deleteError || error;

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Stores</h1>
          <p className={styles.subtitle}>
            Manage all branches and store-level campaign activity.
          </p>
        </div>
        <Link href="/stores/create">
          <button className={styles.createButton}>
            <Plus size={16} style={{ marginRight: "0.5rem" }} />
            Add Store
          </button>
        </Link>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search stores"
      />

      {/* Filter Tabs */}
      <div className={styles.filterTabs}>
        {filterTabs.map((tab) => {
          const count =
            tab === "Pending Request" ? pendingRequestCount :
            tab === "No Campaign" ? stores.filter(s => (s.campaigns_count || 0) === 0).length :
            tab === "Low Activity" ? stores.filter(s => {
              const total = s.total_scratch_cards || 0;
              const scratchPercentage = total > 0
                ? Math.round(((s.used_scratch_cards || 0) / total) * 100)
                : 0;
              return scratchPercentage >= 80;
            }).length : 0;

          return (
            <button
              key={tab}
              className={`${styles.filterTab} ${filterStatus === tab ? styles.active : ""}`}
              onClick={() => setFilterStatus(tab)}
            >
              {tab}
              {tab !== "All" && count > 0 && (
                <span className={styles.badge}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <StatsCard
          value={stats.totalStores}
          label="Total Stores"
          icon={<Store size={20} />}
        />
        <StatsCard
          value={stats.activeStores}
          label="Active Stores"
          icon={<CheckCircle2 size={20} />}
        />
        <StatsCard
          value={stats.pendingRequests}
          label="Pending Requests"
          icon={<Hourglass size={20} />}
          highlight="red"
        />
        <StatsCard
          value={stats.qrScansToday}
          label="QR Scans Today"
          icon={<QrCode size={20} />}
        />
      </div>

      {/* Error Banner */}
      {displayError && (
        <div className={styles.errorBanner}>
          <span>{displayError}</span>
          <button onClick={() => setDeleteError(null)} className={styles.closeBtn}>
            ✕
          </button>
        </div>
      )}

      {/* Stores Grid */}
      <div className={styles.storesGrid}>
        {loading ? (
          <div className={styles.loading}>Loading stores...</div>
        ) : orderedStores.length === 0 ? (
          <div className={styles.empty}>
            {stores.length === 0 ? (
              <>
                <p>No stores found</p>
                <button
                  onClick={() => router.push("/stores/create")}
                  className={styles.createStoreBtn}
                >
                  Create Your First Store
                </button>
              </>
            ) : (
              <p>No stores match your search or filter.</p>
            )}
          </div>
        ) : (
          orderedStores.map((store) => {
            const hasPendingRequest = pendingStoreIds.has(String(store._id));
            return (
              <StoreCard
                key={store._id}
                id={store._id}
                name={store.store_name || 'Store'}
                city={store.city || 'City'}
                state={store.state || 'State'}
                status={store.status || 'active'}
                campaignsCount={store.campaigns_count || 0}
                scans={store.qr_scans || 0}
                managerName={store.manager_name || store.contact_person || ''}
                scratchTotal={store.total_scratch_cards || 0}
                scratchUsed={store.used_scratch_cards || 0}
                scratchRemaining={store.remaining_scratch_cards || 0}
                hasPendingRequest={hasPendingRequest}
                unlimited={unlimitedScratches}
                isMainStore={String(store._id) === resolvedMainId}
                onView={() => router.push(`/stores/${store._id}`)}
                onAssign={() => router.push(`/stores/${store._id}`)}
                onReview={() => router.push('/dashboard')}
                onDelete={() => handleDeleteStore(store._id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
