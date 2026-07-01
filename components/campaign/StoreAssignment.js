"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Store as StoreIcon, Search, Trash2, MapPin, AlertCircle, X } from "lucide-react";
import Badge from "@/components/dashboard/Badge";
import { useAuthContext } from "@/components/auth/AuthContext";
import styles from "./StoreAssignment.module.css";

/**
 * StoreAssignment
 *
 * Required step before QR generation. Two modes:
 *  - Single store (Core plan, 1 store): auto-assigns the store on mount.
 *  - Multi store (Smart plan): searchable list with multi-select assign + remove.
 *
 * Props:
 *  - campaignId: string
 *  - assignedStores: Array<{ storeId, storeName, storeCode, status }> (campaign snapshots)
 *  - planType: "CORE" | "SMART" | string
 *  - storeLimit: number (max assignable stores)
 *  - onChanged: () => void (refetch campaign)
 */
export default function StoreAssignment({
  campaignId,
  assignedStores = [],
  planType,
  storeLimit = 1,
  onChanged,
}) {
  const { account } = useAuthContext();

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [optimisticAssigned, setOptimisticAssigned] = useState(new Set());
  const [showModal, setShowModal] = useState(false);

  // Guard so the single-store auto-assign fires at most once.
  const autoAssignedRef = useRef(false);

  const userId = account?.id;
  const userRole = account?.role || "Merchant";

  // Set of storeIds currently assigned (active snapshots + optimistic updates).
  const assignedIds = useMemo(() => {
    const set = new Set();
    (assignedStores || []).forEach((s) => {
      if (s && s.status === "active" && (s.storeId || s._id)) {
        set.add(String(s.storeId || s._id));
      }
    });
    // Merge with optimistic updates
    optimisticAssigned.forEach((id) => set.add(String(id)));
    return set;
  }, [assignedStores, optimisticAssigned]);

  // Map storeId -> pending request for this campaign.
  const pendingByStore = useMemo(() => {
    const map = new Map();
    (pendingRequests || []).forEach((r) => {
      if (r && String(r.campaignId) === String(campaignId) && r.storeId) {
        map.set(String(r.storeId), r);
      }
    });
    return map;
  }, [pendingRequests, campaignId]);

  // Fetch merchant stores. Response shape: { success, data: [...] }.
  const fetchStores = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stores", {
        method: "GET",
        credentials: "include",
        headers: { "x-user-id": userId, "x-user-role": userRole },
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) {
        setStores(data.data);
      } else {
        setStores([]);
      }
    } catch (err) {
      console.error("Failed to fetch stores:", err);
      setError("Failed to load stores");
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  // Fetch pending scratch-allocation requests for this campaign.
  const fetchPending = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch("/api/merchant/scratch-requests?status=pending", {
        method: "GET",
        credentials: "include",
        headers: { "x-user-id": userId, "x-user-role": userRole },
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) {
        setPendingRequests(data.data);
      } else {
        setPendingRequests([]);
      }
    } catch (err) {
      console.error("Failed to fetch scratch requests:", err);
      setPendingRequests([]);
    }
  }, [userId, userRole]);

  useEffect(() => {
    fetchStores();
    fetchPending();
  }, [fetchStores, fetchPending]);

  // Assign one or more stores via POST /api/campaigns/{id}/assign.
  const assignStores = useCallback(
    async (storeIds) => {
      if (!campaignId || !userId || !Array.isArray(storeIds) || storeIds.length === 0) {
        return false;
      }
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/assign`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
            "x-user-role": userRole,
          },
          body: JSON.stringify({ storeIds }),
        });
        const data = await res.json();
        if (res.ok && data?.success) {
          return true;
        }
        setError(data?.error || data?.message || "Failed to assign store(s)");
        return false;
      } catch (err) {
        console.error("Failed to assign stores:", err);
        setError("Failed to assign store(s)");
        return false;
      }
    },
    [campaignId, userId, userRole],
  );

  const isSingleStore = stores.length === 1;

  // Single-store auto-assign on mount (Core plan). Fires once.
  useEffect(() => {
    if (loading || autoAssignedRef.current) return;
    if (!isSingleStore) return;
    const only = stores[0];
    if (!only?._id) return;
    if (assignedIds.has(String(only._id))) return;
    autoAssignedRef.current = true;
    (async () => {
      setAssigning(true);
      const ok = await assignStores([String(only._id)]);
      setAssigning(false);
      if (ok && typeof onChanged === "function") onChanged();
    })();
  }, [loading, isSingleStore, stores, assignedIds, assignStores, onChanged]);

  // Remove an assigned store via DELETE /api/campaigns/{id}/stores/{storeId}.
  const handleRemove = useCallback(
    async (storeId) => {
      if (!campaignId || !userId || !storeId) return;
      setRemovingId(String(storeId));
      setError(null);
      const storeIdStr = String(storeId);
      // Optimistic update: immediately remove from assigned
      setOptimisticAssigned((prev) => {
        const newSet = new Set(prev);
        newSet.delete(storeIdStr);
        return newSet;
      });
      try {
        const res = await fetch(
          `/api/campaigns/${campaignId}/stores/${storeId}`,
          {
            method: "DELETE",
            credentials: "include",
            headers: { "x-user-id": userId, "x-user-role": userRole },
          },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || data.message || "Failed to remove store");
        }
        if (typeof onChanged === "function") onChanged();
      } catch (err) {
        console.error("Failed to remove store:", err);
        setError(err.message || "Failed to remove store");
        // Rollback: add back to optimistic if it was there before
        const wasAssigned = (assignedStores || []).some(
          (s) => s && s.status === "active" && String(s.storeId || s._id) === storeIdStr
        );
        if (wasAssigned) {
          setOptimisticAssigned((prev) => new Set([...prev, storeIdStr]));
        }
      } finally {
        setRemovingId(null);
      }
    },
    [campaignId, userId, userRole, onChanged, assignedStores],
  );

  const handleToggleSelect = useCallback((storeId) => {
    setSelected((prev) =>
      prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId],
    );
  }, []);

  const handleAssignSelected = useCallback(async () => {
    if (selected.length === 0) return;
    setAssigning(true);
    setError(null);
    // Optimistic update: immediately show stores as assigned
    setOptimisticAssigned((prev) => new Set([...prev, ...selected]));
    const ok = await assignStores(selected);
    setAssigning(false);
    if (ok) {
      setSelected([]);
      if (typeof onChanged === "function") onChanged();
    } else {
      // Rollback on failure
      setOptimisticAssigned((prev) => {
        const newSet = new Set(prev);
        selected.forEach((id) => newSet.delete(id));
        return newSet;
      });
    }
  }, [selected, assignStores, onChanged]);

  const handleAssignOne = useCallback(
    async (storeId) => {
      setAssigning(true);
      setError(null);
      // Optimistic update: immediately show store as assigned
      setOptimisticAssigned((prev) => new Set([...prev, storeId]));
      const ok = await assignStores([storeId]);
      setAssigning(false);
      if (ok && typeof onChanged === "function") onChanged();
      else {
        // Rollback on failure
        setOptimisticAssigned((prev) => {
          const newSet = new Set(prev);
          newSet.delete(storeId);
          return newSet;
        });
      }
    },
    [assignStores, onChanged],
  );

  const assignedCount = assignedIds.size;
  const limitReached = assignedCount >= storeLimit;

  const filteredStores = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return stores;
    return stores.filter((s) =>
      (s.store_name || "").toLowerCase().includes(term) ||
      (s.store_code || "").toLowerCase().includes(term),
    );
  }, [stores, searchTerm]);

  const locationOf = (store) =>
    [store.city, store.address].filter(Boolean).join(", ") || "—";

  const getDaysLeftForStore = (store) => {
    // This is placeholder - you can update with actual logic based on campaign dates
    return "—";
  };

  // ---- Render ----
  const header = (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <StoreIcon size={20} />
        <h2 className={styles.title}>Store Assignment</h2>
      </div>
      {!isSingleStore && stores.length > 0 && (
        <span className={styles.counter}>
          {assignedCount} / {storeLimit} stores assigned
        </span>
      )}
    </div>
  );

  const note = (
    <p className={styles.note}>
      At least one store must be assigned before you can generate the campaign QR
      code.
    </p>
  );

  if (loading) {
    return (
      <section className={styles.section}>
        {header}
        <div className={styles.stateMsg}>Loading stores…</div>
      </section>
    );
  }

  if (stores.length === 0) {
    return (
      <section className={styles.section}>
        {header}
        {note}
        {error && <div className={styles.errorBox}>{error}</div>}
        <div className={styles.stateMsg}>
          No stores found. Create a store first to assign this campaign.
        </div>
      </section>
    );
  }

  // Single-store (Core) view.
  if (isSingleStore) {
    const store = stores[0];
    const isAssigned = assignedIds.has(String(store._id));
    return (
      <section className={styles.section}>
        {header}
        {note}
        {error && <div className={styles.errorBox}>{error}</div>}
        <div className={styles.storeCard}>
          <div className={styles.storeMain}>
            <span className={styles.storeName}>
              {store.store_name || "Store"}
            </span>
            <span className={styles.storeMeta}>
              {store.store_code && (
                <span className={styles.storeCode}>{store.store_code}</span>
              )}
              <span className={styles.storeLoc}>
                <MapPin size={13} />
                {locationOf(store)}
              </span>
            </span>
          </div>
          {isAssigned ? (
            <Badge label="Assigned" variant="success" />
          ) : (
            <span className={styles.statusText}>
              {assigning ? "Assigning…" : "Pending…"}
            </span>
          )}
        </div>
      </section>
    );
  }

  // Multi-store (Smart) view.
  const assignedStoreList = stores.filter((s) =>
    assignedIds.has(String(s._id))
  );

  const unassignedStoreCount = stores.length - assignedStoreList.length;

  return (
    <section className={styles.section}>
      {header}
      {note}

      {pendingByStore.size > 0 && (
        <div className={styles.pendingBanner}>
          <AlertCircle size={16} />
          <span>
            {pendingByStore.size} scratch allocation request
            {pendingByStore.size !== 1 ? "s" : ""} linked to this campaign awaiting
            review.
          </span>
          <a href="/dashboard" className={styles.pendingLink}>
            Review
          </a>
        </div>
      )}

      {error && <div className={styles.errorBox}>{error}</div>}

      {/* Assigned Stores Section */}
      {assignedStoreList.length > 0 && (
        <div className={styles.assignedStoresSection}>
          <h3 className={styles.sectionTitle}>Assigned Stores</h3>
          <ul className={styles.storeList}>
            {assignedStoreList.map((store) => {
              const id = String(store._id);
              return (
                <li key={id} className={styles.storeRow}>
                  <div className={styles.rowLeft}>
                    <div className={styles.storeMain}>
                      <span className={styles.storeName}>
                        {store.store_name || "Store"}
                      </span>
                      <span className={styles.storeMeta}>
                        {store.store_code && (
                          <span className={styles.storeCode}>
                            {store.store_code}
                          </span>
                        )}
                        <span className={styles.storeLoc}>
                          <MapPin size={13} />
                          {locationOf(store)}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className={styles.rowRight}>
                    <Badge label="Assigned" variant="success" />
                    {!limitReached && (
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => handleRemove(id)}
                        disabled={removingId === id}
                        title="Remove store"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Add More Stores Button */}
      {unassignedStoreCount > 0 && !limitReached && (
        <button
          type="button"
          className={styles.addStoresBtn}
          onClick={() => setShowModal(true)}
        >
          <StoreIcon size={18} />
          Assign More Stores ({unassignedStoreCount} available)
        </button>
      )}

      {limitReached && (
        <p className={styles.limitNote}>
          Store limit reached for the {planType || "current"} plan ({storeLimit}).
          Remove a store to assign a different one.
        </p>
      )}

      {/* Modal for assigning stores */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Assign Stores</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowModal(false)}
              >
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalSearchWrap}>
              <Search size={16} className={styles.modalSearchIcon} />
              <input
                type="text"
                className={styles.modalSearchInput}
                placeholder="Search stores by name or code…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <ul className={styles.modalStoreList}>
              {filteredStores.length === 0 ? (
                <li className={styles.emptyMsg}>No stores match your search.</li>
              ) : (
                filteredStores.map((store) => {
                  const id = String(store._id);
                  const isAssigned = assignedIds.has(id);
                  const pending = pendingByStore.get(id);
                  const isSelected = selected.includes(id);
                  const disableSelect = (limitReached && !isSelected) || isAssigned;

                  return (
                    <li key={id} className={styles.modalStoreRow}>
                      <div className={styles.modalRowLeft}>
                        {!isAssigned && !pending && (
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={isSelected}
                            disabled={disableSelect || assigning}
                            onChange={() => handleToggleSelect(id)}
                          />
                        )}
                        <div className={styles.storeInfo}>
                          <div className={styles.storeName}>
                            {store.store_name || "Store"}
                          </div>
                          <div className={styles.storeDetails}>
                            {store.store_code && (
                              <span className={styles.storeCode}>
                                {store.store_code}
                              </span>
                            )}
                            <span className={styles.storeLocation}>
                              <MapPin size={12} />
                              {locationOf(store)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className={styles.modalRowRight}>
                        {isAssigned ? (
                          <Badge label="Assigned" variant="success" />
                        ) : pending ? (
                          <Badge label="Pending Request" variant="warning" />
                        ) : null}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>

            {selected.length > 0 && (
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.modalAssignBtn}
                  onClick={async () => {
                    await handleAssignSelected();
                    setShowModal(false);
                  }}
                  disabled={assigning}
                >
                  {assigning ? "Assigning…" : `Assign (${selected.length})`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
