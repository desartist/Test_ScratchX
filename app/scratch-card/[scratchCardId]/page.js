import React from 'react';
import ScratchCard from '@/components/customer/ScratchCard';
import styles from './page.module.css';

/**
 * Scratch Card Page
 * Displays an interactive scratch card for customer participation
 * URL: /scratch-card/[scratchCardId]
 */
export const metadata = {
  title: 'Scratch Card - Coupon Campaign',
  description: 'Scratch the card to reveal your reward'
};

export default function ScratchCardPage({ params }) {
  const { scratchCardId } = params;
  const participationId = scratchCardId; // In real scenario, extract from URL or query params

  const handleRedeemSuccess = (data) => {
    console.log('Redemption successful:', data);
    // Trigger confetti or celebration effect
    if (typeof window !== 'undefined' && window.confetti) {
      window.confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  return (
    <main className={styles.pageWrapper}>
      <div className={styles.pageContent}>
        <ScratchCard
          scratchCardId={scratchCardId}
          participationId={participationId}
          onRedeemSuccess={handleRedeemSuccess}
        />
      </div>
    </main>
  );
}
