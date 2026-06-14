"use client";
import React from "react";
import { MapPin, CheckCircle, AlertCircle } from "lucide-react";
import PropTypes from "prop-types";
import styles from "./LocationStatus.module.css";

export default function LocationStatus({
  verified = false,
  latitude = null,
  longitude = null,
  distance = null,
  storeName = null,
}) {
  return (
    <div
      className={`${styles.container} ${verified ? styles.verified : styles.pending}`}
    >
      <div className={styles.header}>
        <div className={styles.iconContainer}>
          {verified ? (
            <CheckCircle size={24} className={styles.successIcon} />
          ) : (
            <AlertCircle size={24} className={styles.warningIcon} />
          )}
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>
            {verified ? "Location Verified" : "Verify Your Location"}
          </h3>
          <p className={styles.subtitle}>
            {verified
              ? "You are in the correct location"
              : "Please verify your location to continue"}
          </p>
        </div>
      </div>

      <div className={styles.details}>
        {storeName && (
          <div className={styles.detailRow}>
            <MapPin size={16} className={styles.detailIcon} />
            <div className={styles.detailContent}>
              <span className={styles.detailLabel}>Store</span>
              <span className={styles.detailValue}>{storeName}</span>
            </div>
          </div>
        )}

        {latitude && longitude && (
          <div className={styles.detailRow}>
            <MapPin size={16} className={styles.detailIcon} />
            <div className={styles.detailContent}>
              <span className={styles.detailLabel}>Coordinates</span>
              <span className={styles.detailValue}>
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </span>
            </div>
          </div>
        )}

        {distance !== null && (
          <div className={styles.detailRow}>
            <MapPin size={16} className={styles.detailIcon} />
            <div className={styles.detailContent}>
              <span className={styles.detailLabel}>Distance</span>
              <span className={styles.detailValue}>
                {distance < 1
                  ? (distance * 1000).toFixed(0) + "m"
                  : distance.toFixed(2) + "km"}
              </span>
            </div>
          </div>
        )}
      </div>

      {verified && (
        <div className={styles.footer}>
          <p className={styles.footerText}>✓ You can now claim your reward</p>
        </div>
      )}
    </div>
  );
}

LocationStatus.propTypes = {
  verified: PropTypes.bool,
  latitude: PropTypes.number,
  longitude: PropTypes.number,
  distance: PropTypes.number,
  storeName: PropTypes.string,
};
