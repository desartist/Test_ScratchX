"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Store as StoreIcon, Search, Trash2, MapPin, AlertCircle } from "lucide-react";
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

  // Guard so the single-store auto-assign fires at most once.
  const autoAssignedRef = useRef(false);

  const userId = account?.id;
  const userRole = account?.role || "Merchant";

  // Set of storeIds currently assigned (active snapshots).
  const assignedIds = useMemo(() => {
    const set = new Set();
    (assignedStores || []).forEach((s) => {
      if (s && s.status === "active" && (s.storeId || s._id)) {
        set.add(String(s.storeId || s._id));
      }
    });
    return set;
  }, [assignedStores]);

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
      } finally {
        setRemovingId(null);
      }
    },
    [campaignId, userId, userRole, onChanged],
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
    const ok = await assignStores(selected);
    setAssigning(false);
    if (ok) {
      setSelected([]);
      if (typeof onChanged === "function") onChanged();
    }
  }, [selected, assignStores, onChanged]);

  const handleAssignOne = useCallback(
    async (storeId) => {
      setAssigning(true);
      setError(null);
      const ok = await assignStores([storeId]);
      setAssigning(false);
      if (ok && typeof onChanged === "function") onChanged();
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

      <div className={styles.searchWrap}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search stores by name or code…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <ul className={styles.storeList}>
        {filteredStores.length === 0 ? (
          <li className={styles.stateMsg}>No stores match your search.</li>
        ) : (
          filteredStores.map((store) => {
            const id = String(store._id);
            const isAssigned = assignedIds.has(id);
            const pending = pendingByStore.get(id);
            const isSelected = selected.includes(id);
            const disableSelect = limitReached && !isSelected;
            return (
              <li key={id} className={styles.storeRow}>
                <div className={styles.rowLeft}>
                  {!isAssigned && !pending && (
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={isSelected}
                      disabled={disableSelect || assigning}
                      onChange={() => handleToggleSelect(id)}
                      aria-label={`Select ${store.store_name}`}
                    />
                  )}
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
                  {isAssigned ? (
                    <>
                      <Badge label="Assigned" variant="success" />
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => handleRemove(id)}
                        disabled={removingId === id}
                        title="Remove store"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : pending ? (
                    <Badge label="Pending Request" variant="warning" />
                  ) : (
                    <button
                      type="button"
                      className={styles.assignBtn}
                      onClick={() => handleAssignOne(id)}
                      disabled={limitReached || assigning}
                    >
                      Assign
                    </button>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>

      {selected.length > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkText}>{selected.length} selected</span>
          <button
            type="button"
            className={styles.assignSelectedBtn}
            onClick={handleAssignSelected}
            disabled={assigning || limitReached}
          >
            {assigning ? "Assigning…" : `Assign Selected (${selected.length})`}
          </button>
        </div>
      )}

      {limitReached && (
        <p className={styles.limitNote}>
          Store limit reached for the {planType || "current"} plan ({storeLimit}).
          Remove a store to assign a different one.
        </p>
      )}
    </section>
  );
}
