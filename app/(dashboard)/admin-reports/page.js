'use client';

import React from 'react';
import {
  Download,
  Store,
  Users,
  Megaphone,
  Wallet,
  CreditCard,
  Building2,
  Info,
} from 'lucide-react';
import styles from './admin-reports.module.css';

const REPORTS = [
  {
    type: 'retailers',
    icon: <Store size={22} />,
    title: 'Retailer Report',
    description: 'Every retailer: business model, distributor, plan, status, and join date.',
  },
  {
    type: 'distributors',
    icon: <Users size={22} />,
    title: 'Distributor Report',
    description: 'Every distributor: territory, commission rate, total earned, and status.',
  },
  {
    type: 'campaigns',
    icon: <Megaphone size={22} />,
    title: 'Campaign Report',
    description: 'Every campaign: retailer, dates, QR scans, and scratch allocation/usage.',
  },
  {
    type: 'stores',
    icon: <Building2 size={22} />,
    title: 'Store Performance Report',
    description: 'Every store: retailer, location, scratch allocation, and status.',
  },
  {
    type: 'payments',
    icon: <CreditCard size={22} />,
    title: 'Payment Report',
    description: 'Every payment transaction: retailer, amount, tax, method, and status.',
  },
  {
    type: 'subscriptions',
    icon: <Wallet size={22} />,
    title: 'Subscription Report',
    description: 'Every subscription: owner, plan, distributor, status, and entitlement expiry.',
  },
];

export default function AdminReportsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Reports &amp; Exports</h1>
          <p>Download platform datasets as CSV, ready for Excel or Google Sheets</p>
        </div>

        <div className={styles.reportsGrid}>
          {REPORTS.map((r) => (
            <div key={r.type} className={styles.reportCard}>
              <div className={styles.reportIcon}>{r.icon}</div>
              <h3 className={styles.reportTitle}>{r.title}</h3>
              <p className={styles.reportDescription}>{r.description}</p>
              <a href={`/api/admin/reports/${r.type}`} className={styles.downloadBtn} download>
                <Download size={16} />
                Download CSV
              </a>
            </div>
          ))}
        </div>

        <div className={styles.note}>
          <Info size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Exports are capped at 5,000 rows per report and reflect live data at the moment of download.
        </div>
      </div>
    </div>
  );
}
