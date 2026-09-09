"use client";

import React from "react";
import { Download, Users, ClipboardList, Wallet, Megaphone, Store, CheckCircle2 } from "lucide-react";
import { useDistributorDashboardQuery } from "@/hooks/queries/useDistributorDashboardQuery";
import { useLeadsQuery } from "@/hooks/queries/useLeadsQuery";
import StatCard from "@/components/dashboard/shared/StatCard";
import styles from "@/components/distributor/distributorList.module.css";
import reportStyles from "./distributorReports.module.css";

const REPORTS = [
  { type: "retailers", label: "Retailer Report", description: "Every retailer in your network, plan, and status", icon: Users },
  { type: "leads", label: "Lead Report", description: "Full lead pipeline with status, interest, and assignment", icon: ClipboardList },
  { type: "payments", label: "Payment Report", description: "Retailer payments attributed to your network", icon: Wallet },
  { type: "campaigns", label: "Campaign Report", description: "Campaign performance across your retailers", icon: Megaphone },
];

export default function DistributorReportsPage() {
  const { data: dashboard } = useDistributorDashboardQuery();
  const { data: leadsData } = useLeadsQuery({ limit: 1 });

  const metrics = dashboard?.metrics;
  const leadMetrics = leadsData?.metrics;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reports</h1>
          <p className={styles.subtitle}>Summary of your network, with CSV export for deeper analysis</p>
        </div>
      </div>

      {metrics && (
        <div className={styles.statsGrid}>
          <StatCard icon={<Store />} label="Total Retailers" value={metrics.totalRetailers} tone="indigo" />
          <StatCard icon={<ClipboardList />} label="Total Leads" value={leadMetrics?.total ?? 0} tone="indigo" />
          <StatCard icon={<CheckCircle2 />} label="Lead Conversion" value={`${leadMetrics?.conversionRate ?? 0}%`} tone="green" />
          <StatCard icon={<Wallet />} label="Monthly Margin" value={`₹${(metrics.monthlyMargin || 0).toLocaleString("en-IN")}`} tone="indigo" />
        </div>
      )}

      <div className={reportStyles.reportGrid}>
        {REPORTS.map((r) => (
          <div key={r.type} className={reportStyles.reportCard}>
            <div className={reportStyles.reportIcon}>
              <r.icon size={20} />
            </div>
            <div className={reportStyles.reportBody}>
              <h3 className={reportStyles.reportTitle}>{r.label}</h3>
              <p className={reportStyles.reportDescription}>{r.description}</p>
            </div>
            <a href={`/api/distributor/reports/${r.type}`} className={reportStyles.downloadBtn} download>
              <Download size={16} />
              CSV
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
