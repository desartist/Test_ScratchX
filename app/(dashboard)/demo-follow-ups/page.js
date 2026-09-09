"use client";

import React from "react";
import { CalendarClock, Video, AlertTriangle } from "lucide-react";
import { useLeadsQuery } from "@/hooks/queries/useLeadsQuery";
import { STATUS_COLORS, INTEREST_CLASS } from "@/lib/leadDisplay";
import StatCard from "@/components/dashboard/shared/StatCard";
import styles from "@/components/distributor/distributorList.module.css";

// A focused work-queue view of the same Lead data as /leads — every lead
// currently in "Demo Scheduled" or "Follow-up Pending", soonest
// next-follow-up first. Deliberately reuses the Leads API/model (with its
// multi-status + sortBy=followUp support) rather than a parallel dataset —
// this is a filtered lens on the same pipeline, not a different one.
const QUEUE_PARAMS = { status: "Demo Scheduled,Follow-up Pending", sortBy: "followUp", limit: 50 };

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function DemoFollowUpsPage() {
  const { data, isPending: loading } = useLeadsQuery(QUEUE_PARAMS);
  const leads = data?.leads || [];

  const now = new Date();
  const overdueCount = leads.filter((l) => l.nextFollowUpDate && new Date(l.nextFollowUpDate) < now).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Demo Follow-ups</h1>
          <p className={styles.subtitle}>Leads with a scheduled demo or a pending follow-up, soonest first</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard icon={<Video />} label="In Queue" value={leads.length} tone="indigo" />
        <StatCard icon={<AlertTriangle />} label="Overdue" value={overdueCount} tone={overdueCount > 0 ? "red" : "gray"} />
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Lead</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Interest</th>
              <th>Next Action Due</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className={styles.emptyCell}>Loading...</td></tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyCell}>
                  <CalendarClock size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
                  <div>No demos or follow-ups pending right now.</div>
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const isOverdue = lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < now;
                return (
                  <tr key={lead._id}>
                    <td>
                      <div className={styles.leadName}>{lead.businessName}</div>
                      <div className={styles.leadSub}>{lead.ownerName}</div>
                    </td>
                    <td>{lead.phone}</td>
                    <td>
                      <span className={styles.statusPill} style={{ borderColor: STATUS_COLORS[lead.status] }}>
                        <span className={styles.statusDot} style={{ background: STATUS_COLORS[lead.status] }} />
                        {lead.status}
                      </span>
                    </td>
                    <td>
                      {lead.interestLevel ? (
                        <span className={`${styles.interestPill} ${styles[INTEREST_CLASS[lead.interestLevel]]}`}>
                          {lead.interestLevel}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ color: isOverdue ? "#ef4444" : undefined, fontWeight: isOverdue ? 700 : undefined }}>
                      {formatDateTime(lead.nextFollowUpDate || lead.demoDate)}
                      {isOverdue && " (overdue)"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
