"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import ParticipationTimeline from "./ParticipationTimeline";
import styles from "./CustomerDetailDrawer.module.css";

function RewardCard({ card }) {
  if (!card) return null;
  const { reward_type, reward_value, reward_description, reward_image, coupon_code } = card;

  const isDiscount = reward_type === 'discount' || reward_type === 'voucher';
  const isCashback = reward_type === 'cashback';
  const isGift = reward_type === 'freeItem';

  return (
    <div className={styles.rewardCard}>
      {/* Visual hero */}
      {isDiscount && (
        <div className={`${styles.rewardHero} ${styles.rewardHeroDiscount}`}>
          <span className={styles.rewardHeroAmount}>₹{reward_value}</span>
          <span className={styles.rewardHeroLabel}>OFF</span>
          <div className={styles.rewardHeroTag}>Flat Discount</div>
        </div>
      )}

      {isCashback && (
        <div className={`${styles.rewardHero} ${styles.rewardHeroCashback}`}>
          <span className={styles.rewardHeroAmount}>{reward_value}%</span>
          <span className={styles.rewardHeroLabel}>CASHBACK</span>
          <div className={styles.rewardHeroTag}>On Purchase</div>
        </div>
      )}

      {isGift && (
        <div className={styles.rewardGiftCard}>
          {reward_image ? (
            <img
              src={reward_image}
              alt={reward_description || 'Gift'}
              className={styles.rewardGiftFullImg}
            />
          ) : (
            <div className={styles.rewardGiftPlaceholder}>
              <svg viewBox="0 0 200 160" className={styles.rewardGiftSvg} xmlns="http://www.w3.org/2000/svg">
                <rect width="200" height="160" rx="12" fill="url(#giftGrad)"/>
                <defs>
                  <linearGradient id="giftGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6d5df6"/>
                    <stop offset="100%" stopColor="#4c6ef5"/>
                  </linearGradient>
                </defs>
                {/* Box body */}
                <rect x="55" y="85" width="90" height="55" rx="4" fill="rgba(255,255,255,0.25)"/>
                {/* Lid */}
                <rect x="50" y="73" width="100" height="16" rx="4" fill="rgba(255,255,255,0.35)"/>
                {/* Ribbon vertical */}
                <rect x="94" y="73" width="12" height="67" fill="rgba(255,255,255,0.5)"/>
                {/* Ribbon horizontal on lid */}
                <rect x="50" y="75" width="100" height="12" fill="rgba(255,255,255,0.5)"/>
                {/* Bow left loop */}
                <ellipse cx="84" cy="66" rx="14" ry="10" fill="#ef9e1b" transform="rotate(-20 84 66)"/>
                {/* Bow right loop */}
                <ellipse cx="116" cy="66" rx="14" ry="10" fill="#ef9e1b" transform="rotate(20 116 66)"/>
                {/* Bow center */}
                <circle cx="100" cy="70" r="7" fill="#f59e0b"/>
              </svg>
              <span className={styles.rewardGiftPlaceholderLabel}>
                {reward_description || 'Gift'}
              </span>
            </div>
          )}
          <div className={styles.rewardGiftOverlay}>
            <span className={styles.rewardGiftBadge}>🎁 Gift Reward</span>
            <span className={styles.rewardGiftName}>{reward_description || 'Free Gift'}</span>
          </div>
        </div>
      )}

      {/* Meta */}
      <div className={styles.rewardMeta}>
        {/* Reward value — skip for gift since image is the value */}
        {!isGift && (
          <div className={styles.rewardMetaRow}>
            <span className={styles.rewardMetaLabel}>Reward Value</span>
            <span className={`${styles.rewardMetaValue} ${styles.rewardMetaHighlight}`}>
              {isDiscount
                ? `₹${reward_value} OFF`
                : isCashback
                ? `${reward_value}% Cashback`
                : `₹${reward_value}`}
            </span>
          </div>
        )}

        {reward_description && !isGift && (
          <div className={styles.rewardMetaRow}>
            <span className={styles.rewardMetaLabel}>Description</span>
            <span className={styles.rewardMetaValue}>{reward_description}</span>
          </div>
        )}
        {coupon_code && (
          <div className={styles.rewardMetaRow}>
            <span className={styles.rewardMetaLabel}>Coupon Code</span>
            <span className={styles.rewardCode}>{coupon_code}</span>
          </div>
        )}
        {card.revealed_at && (
          <div className={styles.rewardMetaRow}>
            <span className={styles.rewardMetaLabel}>Revealed At</span>
            <span className={styles.rewardMetaValue}>
              {new Date(card.revealed_at).toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomerDetailDrawer({ isOpen, onClose, customer }) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const statusColors = {
    initiated: "#6b7280",
    verified: "#3b82f6",
    scratched: "#f59e0b",
    revealed: "#f59e0b",
    redeemed: "#10b981",
    expired: "#ef4444",
    failed: "#ef4444",
  };

  const statusLabels = {
    initiated: "Initiated",
    verified: "Verified",
    scratched: "Scratched",
    revealed: "Revealed",
    redeemed: "Claimed",
    expired: "Expired",
    failed: "Failed",
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`${styles.overlay} ${isAnimating ? styles.visible : ""}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`${styles.drawer} ${isAnimating ? styles.visible : ""}`}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Customer Details</h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Customer Information */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Customer Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Name</span>
                <span className={styles.value}>{customer.customer_name}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Mobile</span>
                <span className={styles.value}>{customer.customer_mobile}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Email</span>
                <span className={styles.value}>
                  {customer.customer_email || "Not provided"}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Bill Amount</span>
                <span className={styles.value}>₹{customer.bill_amount}</span>
              </div>
            </div>
          </section>

          {/* Campaign Information */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Campaign Details</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Campaign Name</span>
                <span className={styles.value}>
                  {customer.campaign_id?.campaignName ||
                    customer.campaign_id?.name ||
                    "N/A"}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Campaign Status</span>
                <span className={styles.value}>
                  {customer.campaign_id?.status || "N/A"}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Participation Date</span>
                <span className={styles.value}>
                  {new Date(customer.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Billing Range</span>
                <span className={styles.value}>
                  ₹{customer.range_id?.minAmount || 0} - ₹
                  {customer.range_id?.maxAmount || 0}
                </span>
              </div>
            </div>
          </section>

          {/* Won Reward */}
          {customer.scratch_card_id && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Won Reward</h3>
              <RewardCard card={{
                ...customer.scratch_card_id,
                revealed_at: customer.revealed_at,
              }} />
            </section>
          )}

          {/* Store Information */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Store Details</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Store Name</span>
                <span className={styles.value}>
                  {customer.store_id?.store_name || "N/A"}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Store Code</span>
                <span className={styles.value}>
                  {customer.store_id?.store_code || "N/A"}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Location</span>
                <span className={styles.value}>
                  {customer.store_id?.city}, {customer.store_id?.state}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Distance from Store</span>
                <span className={styles.value}>
                  {customer.distance_from_store_meters?.toFixed(0) || 0}m
                </span>
              </div>
            </div>

            {/* Matched Store (if different) */}
            {customer.matched_store_name &&
              customer.matched_store_name !== customer.store_id?.store_name && (
                <div className={styles.matchedStore}>
                  <div className={styles.matchedStoreTitle}>
                    Matched Store (from location)
                  </div>
                  <div className={styles.value}>
                    {customer.matched_store_name}
                  </div>
                </div>
              )}
          </section>

          {/* Participation Status */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Participation Status</h3>
            <div
              className={styles.statusBadge}
              style={{ borderColor: statusColors[customer.status] }}
            >
              <div
                className={styles.statusDot}
                style={{ backgroundColor: statusColors[customer.status] }}
              />
              <span>{statusLabels[customer.status]}</span>
            </div>
          </section>

          {/* Timeline */}
          <ParticipationTimeline participation={customer} />
        </div>
      </div>
    </>
  );
}
