'use client';

import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './CountdownTimer.module.css';

export default function CountdownTimer({ expiryDate, onExpire, size = 'medium' }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiryDate).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft(null);
        onExpire?.();
        return;
      }

      setIsExpired(false);
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiryDate, onExpire]);

  if (isExpired) {
    return (
      <div className={`${styles.container} ${styles[size]} ${styles.expired}`}>
        <span className={styles.expiredText}>Coupon Expired</span>
      </div>
    );
  }

  if (!timeLeft) {
    return null;
  }

  return (
    <div className={`${styles.container} ${styles[size]}`}>
      <div className={styles.timerBox}>
        <span className={styles.digit}>{String(timeLeft.days).padStart(2, '0')}</span>
        <span className={styles.label}>Days</span>
      </div>
      <span className={styles.separator}>:</span>
      <div className={styles.timerBox}>
        <span className={styles.digit}>{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className={styles.label}>Hrs</span>
      </div>
      <span className={styles.separator}>:</span>
      <div className={styles.timerBox}>
        <span className={styles.digit}>{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className={styles.label}>Min</span>
      </div>
      <span className={styles.separator}>:</span>
      <div className={styles.timerBox}>
        <span className={styles.digit}>{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className={styles.label}>Sec</span>
      </div>
    </div>
  );
}

CountdownTimer.propTypes = {
  expiryDate: PropTypes.string.isRequired,
  onExpire: PropTypes.func,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
};
