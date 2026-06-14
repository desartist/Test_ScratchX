"use client";
import React from "react";
import PropTypes from "prop-types";
import {
  CreditCard,
  Package,
  AlertTriangle,
  XCircle,
  PlusCircle,
  PlayCircle,
  Bell,
  Activity,
} from "lucide-react";
import EmptyState from "./EmptyState";
import styles from "./RecentActivity.module.css";

const TYPE_ICON = {
  plan_purchased: CreditCard,
  scratch_pack_purchased: Package,
  scratch_expiry_warning: AlertTriangle,
  scratch_expired: XCircle,
  campaign_created: PlusCircle,
  campaign_activated: PlayCircle,
  system_alert: Bell,
  other: Activity,
};

function timeAgo(value) {
  if (!value) return "";
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return "";
  const diffMs = Date.now() - then.getTime();
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}

export default function RecentActivity({ items }) {
  const list = Array.isArray(items) ? items : [];

  if (list.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon="🕓"
        title="No recent activity"
        description="Activity from your stores will appear here."
      />
    );
  }

  return (
    <ul className={styles.timeline}>
      {list.map((item, index) => {
        const Icon = TYPE_ICON[item.type] || TYPE_ICON.other;
        const severity = item.severity || "info";
        const key = item.id != null ? item.id : index;
        const rel = timeAgo(item.createdAt);

        const body = (
          <>
            <span
              className={`${styles.dot} ${styles[severity] || styles.info}`}
              aria-hidden="true"
            >
              <Icon size={14} />
            </span>
            <div className={styles.content}>
              <div className={styles.topLine}>
                {item.title && (
                  <span className={styles.title}>{item.title}</span>
                )}
                {rel && <span className={styles.time}>{rel}</span>}
              </div>
              {item.message && (
                <p className={styles.message}>{item.message}</p>
              )}
            </div>
          </>
        );

        return (
          <li key={key} className={styles.row}>
            {item.actionUrl ? (
              <a className={styles.link} href={item.actionUrl}>
                {body}
              </a>
            ) : (
              <div className={styles.link}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

RecentActivity.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      type: PropTypes.string,
      title: PropTypes.string,
      message: PropTypes.string,
      severity: PropTypes.string,
      createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      actionUrl: PropTypes.string,
    })
  ),
};
