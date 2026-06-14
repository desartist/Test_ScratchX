'use client';

import React, { useState } from 'react';
import { Star, CheckCircle } from 'lucide-react';
import styles from './StudioEarlyAccess.module.css';

export default function StudioEarlyAccess() {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleNotifyClick = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 4000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.gradient}></div>

      <div className={styles.content}>
        <div className={styles.header}>
          <Star size={28} className={styles.starIcon} />
          <h2 className={styles.title}>Get Early Access</h2>
        </div>

        <p className={styles.description}>
          Be among the first to try ScratchX Studio when it launches. Enjoy exclusive features and help shape the future of the platform.
        </p>

        <button
          className={styles.button}
          onClick={handleNotifyClick}
          disabled={showSuccess}
        >
          {showSuccess ? (
            <>
              <CheckCircle size={18} />
              <span>You'll be notified!</span>
            </>
          ) : (
            <>
              <span>Notify Me</span>
            </>
          )}
        </button>

        {showSuccess && (
          <div className={styles.successMessage}>
            ✓ You will be notified when ScratchX Studio launches.
          </div>
        )}
      </div>
    </div>
  );
}
