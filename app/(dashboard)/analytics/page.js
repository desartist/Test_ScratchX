"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthContext";
import { criticalFetchService } from "@/lib/criticalFetchService";
import { QrCode, Users, Gift, ShoppingBag, TrendingUp, Store, UserPlus, Repeat2 } from "lucide-react";
import styles from "./page.module.css";

export default function AnalyticsPage() {
  const router = useRouter();
  const { account, loading: authLoading } = useAuthContext();

  const [campaigns, setCampaigns] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !account?.id) return;

    async function fetchData() {
      try {
        const result = await criticalFetchService.fetchCriticalFirst(
          'analytics-campaigns',
          [
            {
              key: 'campaigns',
              url: '/api/campaigns',
              options: {
                headers: {
                  'x-user-id': account.id,
                  'x-user-role': account.role || 'merchant',
                  'x-user-email': account.email || '',
                },
              },
            },
            {
              key: 'customers',
              url: '/api/customers',
              options: {
                headers: {
                  'x-user-id': account.id,
                  'x-user-role': account.role || 'merchant',
                },
              },
            },
          ],
          []
        );

        const campaignsData = result.critical?.campaigns;
        const customersData = result.critical?.customers;
        setCampaigns(campaignsData?.data || []);
        setCustomers(customersData?.data || []);
      } catch {
        setCampaigns([]);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [account, authLoading]);

  // Calculate new vs repeat customers
  const customerStats = (() => {
    const mobileCount = {};

    // Count occurrences of each mobile number
    customers.forEach(c => {
      const mobile = c.customer_mobile;
      mobileCount[mobile] = (mobileCount[mobile] || 0) + 1;
    });

    // Categorize as new (1 occurrence) or repeat (2+ occurrences)
    let newCustomers = 0;
    let repeatCustomers = 0;

    Object.values(mobileCount).forEach(count => {
      if (count === 1) newCustomers++;
      else if (count > 1) repeatCustomers++;
    });

    return { newCustomers, repeatCustomers };
  })();

  // Aggregate stats across all campaigns
  const stats = campaigns.reduce(
    (acc, c) => {
      const t = c.tracking || {};
      acc.qrScanned += Number(t.qrCodesScanned || 0);
      acc.uniqueCustomers += Number(t.uniqueCustomers || 0);
      acc.scratchesUsed += Number(c.scratchCardsUsed || c.used_scratch_cards || 0);
      acc.redeemed += Number(c.redeemed_scratch_cards || 0);
      acc.stores += Number(c.storeCount || 0);
      return acc;
    },
    { qrScanned: 0, uniqueCustomers: 0, scratchesUsed: 0, redeemed: 0, stores: 0 },
  );

  const activeCampaigns = campaigns.filter(
    (c) => String(c.status || "").toLowerCase() === "active",
  ).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Analytics</h1>
      </div>

      {loading ? (
        <div className={styles.loadingGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        /* ── No campaigns → empty state ── */
        <div className={styles.emptyState}>
          <div className={styles.illustration}>
            <Image
              src="/ScratchXCampaign.svg"
              alt="Analytics illustration"
              width={320}
              height={280}
              priority
            />
          </div>
          <h2 className={styles.emptyTitle}>
            Analytics are ready to<br />track your campaign
          </h2>
          <p className={styles.emptyDesc}>
            Once customers scan your QR and play a ScratchX campaign, your scans,
            rewards, redemptions, and repeat customer insights will appear here.
          </p>
          <p className={styles.emptyHint}>
            No activity yet. Launch a campaign to start collecting data.
          </p>
          <button className={styles.ctaBtn} onClick={() => router.push("/campaign")}>
            Go to Campaigns
          </button>
        </div>
      ) : (
        /* ── Campaigns exist → show analytics ── */
        <>
          <div className={styles.kpiGrid}>
            <KpiCard icon={<QrCode size={22} />} label="QR Scans" value={stats.qrScanned} color="#6c5ce7" />
            <KpiCard icon={<UserPlus size={22} />} label="New Customers" value={customerStats.newCustomers} color="#0984e3" />
            <KpiCard icon={<Repeat2 size={22} />} label="Repeat Customers" value={customerStats.repeatCustomers} color="#00b894" />
            <KpiCard icon={<Gift size={22} />} label="Scratches Used" value={stats.scratchesUsed} color="#ef9e1b" />
            <KpiCard icon={<ShoppingBag size={22} />} label="Redeemed" value={stats.redeemed} color="#d63031" />
          </div>

          <div className={styles.summaryRow}>
            <div className={styles.summaryCard}>
              <TrendingUp size={18} className={styles.summaryIcon} />
              <div>
                <p className={styles.summaryVal}>{activeCampaigns}</p>
                <p className={styles.summaryLbl}>Active Campaign{activeCampaigns !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <Store size={18} className={styles.summaryIcon} />
              <div>
                <p className={styles.summaryVal}>{stats.stores}</p>
                <p className={styles.summaryLbl}>Store{stats.stores !== 1 ? "s" : ""} Covered</p>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <Gift size={18} className={styles.summaryIcon} />
              <div>
                <p className={styles.summaryVal}>{campaigns.length}</p>
                <p className={styles.summaryLbl}>Total Campaigns</p>
              </div>
            </div>
          </div>

          <div className={styles.campaignList}>
            <h2 className={styles.listTitle}>Campaign Breakdown</h2>
            {campaigns.map((c) => {
              const t = c.tracking || {};
              const allocated = Number(c.allocated_scratch_cards || c.scratchCardsLimit || 0);
              const used = Number(c.scratchCardsUsed || c.used_scratch_cards || 0);
              const pct = allocated > 0 ? Math.round((used / allocated) * 100) : 0;
              return (
                <div key={c._id} className={styles.campaignRow}>
                  <div className={styles.campaignRowLeft}>
                    <p className={styles.campaignRowName}>{c.campaignName || c.name}</p>
                    <span className={`${styles.statusPill} ${styles["status_" + String(c.status || "draft").toLowerCase().replace(/\s+/g, "_")]}`}>
                      {c.status || "Draft"}
                    </span>
                  </div>
                  <div className={styles.campaignRowStats}>
                    <span className={styles.rowStat}><QrCode size={13} /> {t.qrCodesScanned || 0} scans</span>
                    <span className={styles.rowStat}><Users size={13} /> {t.uniqueCustomers || 0} customers</span>
                    <span className={styles.rowStat}><Gift size={13} /> {c.redeemed_scratch_cards || 0} redeemed</span>
                  </div>
                  <div className={styles.campaignRowBar}>
                    <div className={styles.barBg}>
                      <div className={styles.barFill} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className={styles.barPct}>{pct}% used</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, color }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiIcon} style={{ background: color + "1a", color }}>
        {icon}
      </div>
      <p className={styles.kpiValue}>{Number(value).toLocaleString()}</p>
      <p className={styles.kpiLabel}>{label}</p>
    </div>
  );
}
