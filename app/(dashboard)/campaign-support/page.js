"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, MessageSquareWarning, X, Megaphone, Zap, Clock, AlertTriangle } from "lucide-react";
import { useDistributorCampaignsQuery } from "@/hooks/queries/useDistributorNetworkQuery";
import { useCreateSupportTicketMutation } from "@/hooks/queries/useDistributorNetworkQuery";
import StatCard from "@/components/dashboard/shared/StatCard";
import modalStyles from "@/app/(dashboard)/team/team.module.css";
import styles from "@/components/distributor/distributorList.module.css";

const STATUS_COLORS = { active: "#10b981", paused: "#f59e0b", ended: "#6b7280", draft: "#6b7280" };

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CampaignSupportPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data, isPending: loading } = useDistributorCampaignsQuery({ status: statusFilter });
  const campaigns = data?.campaigns || [];
  const metrics = data?.metrics || { total: 0, active: 0, endingSoon: 0, noScans: 0 };

  const escalateMutation = useCreateSupportTicketMutation();
  const [escalatingCampaign, setEscalatingCampaign] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const handleEscalate = async () => {
    if (!note.trim()) {
      setError("Add a short note describing the issue");
      return;
    }
    setError(null);
    try {
      await escalateMutation.mutateAsync({
        subject: `Campaign support: ${escalatingCampaign.campaignName} (${escalatingCampaign.retailerName})`,
        description: note.trim(),
        category: "Campaign",
        priority: "Medium",
      });
      setSent(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const closeModal = () => {
    setEscalatingCampaign(null);
    setNote("");
    setError(null);
    setSent(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Campaign Support</h1>
          <p className={styles.subtitle}>Campaigns across your retailer network — read-only, escalate issues to ScratchX</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard icon={<Megaphone />} label="Total Campaigns" value={metrics.total} tone="indigo" />
        <StatCard icon={<Zap />} label="Active" value={metrics.active} tone="green" />
        <StatCard icon={<Clock />} label="Ending Soon" value={metrics.endingSoon} tone={metrics.endingSoon > 0 ? "red" : "gray"} />
        <StatCard icon={<AlertTriangle />} label="No Scans Yet" value={metrics.noScans} tone={metrics.noScans > 0 ? "red" : "gray"} />
      </div>

      <div className={styles.filtersSection}>
        <div className={styles.filterControls}>
          <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="ended">Ended</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Retailer</th>
              <th>Status</th>
              <th>Dates</th>
              <th>Scans</th>
              <th>Allocated / Used</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className={styles.emptyCell}>Loading...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={7} className={styles.emptyCell}>No campaigns found across your retailer network.</td></tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c._id}>
                  <td className={styles.leadName}>
                    {c.campaignName}
                    {c.needsAttention && (
                      <span className={styles.leadSub} style={{ color: "#ef4444", display: "block" }}>No scans yet</span>
                    )}
                  </td>
                  <td>{c.retailerName}</td>
                  <td>
                    <span className={styles.statusPill} style={{ borderColor: STATUS_COLORS[c.status] || "#6b7280" }}>
                      <span className={styles.statusDot} style={{ background: STATUS_COLORS[c.status] || "#6b7280" }} />
                      {c.status}
                    </span>
                  </td>
                  <td>{formatDate(c.startDate)} – {formatDate(c.endDate)}</td>
                  <td>{c.scans}</td>
                  <td>{c.scratchesAllocated} / {c.scratchesUsed}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.kebabButton}
                      title="Escalate to ScratchX Admin"
                      onClick={() => setEscalatingCampaign(c)}
                    >
                      <MessageSquareWarning size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {escalatingCampaign && (
        <div className={modalStyles.modalOverlay} onClick={closeModal}>
          <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.modalHeader}>
              <h2 className={modalStyles.modalTitle}>Escalate Campaign Issue</h2>
              <button className={modalStyles.modalClose} onClick={closeModal}>
                <X size={24} />
              </button>
            </div>
            <div className={modalStyles.modalForm}>
              {error && (
                <div className={modalStyles.formError}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              {sent ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#059669", fontSize: 14, fontWeight: 600 }}>
                  <CheckCircle2 size={18} />
                  Ticket sent to ScratchX Admin. They&apos;ll follow up shortly.
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: "#637080", marginBottom: 4 }}>
                    {escalatingCampaign.campaignName} · {escalatingCampaign.retailerName}
                  </p>
                  <div className={modalStyles.formGroup}>
                    <label className={modalStyles.formLabel}>What&apos;s the issue?</label>
                    <textarea
                      className={modalStyles.formInput}
                      style={{ minHeight: 90, resize: "vertical", fontFamily: "inherit" }}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Describe what the retailer needs help with..."
                    />
                  </div>
                </>
              )}
            </div>
            <div className={modalStyles.modalFooter}>
              <button type="button" className={modalStyles.cancelButton} onClick={closeModal}>
                {sent ? "Close" : "Cancel"}
              </button>
              {!sent && (
                <button type="button" className={modalStyles.submitButton} disabled={escalateMutation.isPending} onClick={handleEscalate}>
                  {escalateMutation.isPending ? "Sending..." : "Send to Admin"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
