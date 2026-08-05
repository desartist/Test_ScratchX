"use client";

import React, { useState } from "react";
import { AlertCircle, Check, X, Users } from "lucide-react";
import { useDistributorSeatRequestsQuery, useResolveSeatRequestMutation } from "@/hooks/queries/useSeatRequestsQuery";
import LoadingState from "@/components/common/LoadingState";
import styles from "./seat-requests.module.css";

const ROLE_LABELS = { Store_Manager: "Store Manager", Store_Staff: "Store Staff" };
const TABS = ["pending", "paid", "rejected"];

export default function SeatRequestsPage() {
  const [tab, setTab] = useState("pending");
  const { data: requests, isPending: loading, error: queryError } = useDistributorSeatRequestsQuery(tab);
  const resolveMutation = useResolveSeatRequestMutation();
  const [actioningId, setActioningId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const error = queryError ? queryError.message : null;

  const handleResolve = async (requestId, status) => {
    setActioningId(requestId);
    setActionError(null);
    try {
      await resolveMutation.mutateAsync({ requestId, status });
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActioningId(null);
    }
  };

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "—";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Seat Requests</h1>
        <p className={styles.pageSubtitle}>
          Extra Store Manager/Staff seat requests from your retailers — collect payment directly and mark it here.
        </p>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {actionError && (
        <div className={styles.formError}>
          <AlertCircle size={16} />
          {actionError}
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading seat requests..." />
      ) : error ? (
        <div className={styles.errorState}>
          <AlertCircle size={40} />
          <p>{error}</p>
        </div>
      ) : requests.length === 0 ? (
        <div className={styles.tableSection}>
          <div className={styles.emptyState}>
            <Users size={40} />
            <p>No {tab} requests</p>
          </div>
        </div>
      ) : (
        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <div>Retailer</div>
            <div>Store</div>
            <div>Role</div>
            <div>Qty</div>
            <div>Amount</div>
            <div>Requested</div>
            {tab === "pending" && <div>Action</div>}
          </div>

          {requests.map((r) => (
            <div key={r._id} className={styles.tableRow}>
              <div>
                <div className={styles.retailerName}>{r.merchant?.name || "—"}</div>
                <div className={styles.retailerEmail}>{r.merchant?.email}</div>
              </div>
              <div>{r.storeName || "—"}</div>
              <div>
                <span className={styles.roleBadge}>{ROLE_LABELS[r.role] || r.role}</span>
              </div>
              <div>{r.quantity}</div>
              <div>₹{r.totalAmountINR}</div>
              <div>{formatDate(r.createdAt)}</div>
              {tab === "pending" && (
                <div className={styles.actions}>
                  <button
                    className={styles.paidBtn}
                    disabled={actioningId === r._id}
                    onClick={() => handleResolve(r._id, "paid")}
                  >
                    <Check size={14} /> Mark Paid
                  </button>
                  <button
                    className={styles.rejectBtn}
                    disabled={actioningId === r._id}
                    onClick={() => handleResolve(r._id, "rejected")}
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
