"use client";

import React, { useState } from "react";
import { CheckCircle2, Clock, XCircle, Undo2 } from "lucide-react";
import { useDistributorPaymentsQuery } from "@/hooks/queries/useDistributorNetworkQuery";
import StatCard from "@/components/dashboard/shared/StatCard";
import styles from "@/components/distributor/distributorList.module.css";
import SkeletonTableRows from "@/components/ui/SkeletonTableRows";

const STATUS_COLORS = { success: "#10b981", pending: "#f59e0b", created: "#6b7280", failed: "#ef4444", refunded: "#8b5cf6" };
const STATUS_LABELS = { success: "Paid", pending: "Pending", created: "Created", failed: "Failed", refunded: "Refunded" };

function formatCurrency(v) {
  return `₹${(v || 0).toLocaleString("en-IN")}`;
}

export default function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const { data, isPending: loading } = useDistributorPaymentsQuery({ status: statusFilter, page, limit: 20 });
  const payments = data?.payments || [];
  const metrics = data?.metrics || { collected: 0, pending: 0, failed: 0, refunded: 0 };
  const totalPages = data ? Math.max(1, Math.ceil(data.total / 20)) : 1;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Payments</h1>
          <p className={styles.subtitle}>Retailer payments attributed to your network</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard icon={<CheckCircle2 />} label="Collected" value={formatCurrency(metrics.collected)} tone="green" />
        <StatCard icon={<Clock />} label="Pending" value={formatCurrency(metrics.pending)} tone="gray" />
        <StatCard icon={<XCircle />} label="Failed" value={formatCurrency(metrics.failed)} tone={metrics.failed > 0 ? "red" : "gray"} />
        <StatCard icon={<Undo2 />} label="Refunded" value={formatCurrency(metrics.refunded)} tone="gray" />
      </div>

      <div className={styles.filtersSection}>
        <div className={styles.filterControls}>
          <select className={styles.select} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Status</option>
            <option value="success">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Retailer</th>
              <th>Amount</th>
              <th>Tax</th>
              <th>Total</th>
              <th>Status</th>
              <th>Gateway</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows rows={5} cols={7} />
            ) : payments.length === 0 ? (
              <tr><td colSpan={7} className={styles.emptyCell}>No payments recorded for your network yet.</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p._id}>
                  <td className={styles.leadName}>{p.retailerName}</td>
                  <td>{formatCurrency(p.amount)}</td>
                  <td>{formatCurrency(p.tax)}</td>
                  <td>{formatCurrency(p.totalAmount)}</td>
                  <td>
                    <span className={styles.statusPill} style={{ borderColor: STATUS_COLORS[p.status] }}>
                      <span className={styles.statusDot} style={{ background: STATUS_COLORS[p.status] }} />
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{p.paymentGateway || "—"}</td>
                  <td>{new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageButton} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
          <button className={styles.pageButton} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
