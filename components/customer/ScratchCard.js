'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import CountdownTimer from './CountdownTimer';
import styles from './ScratchCard.module.css';

/**
 * ScratchCard Component
 * Interactive scratch card with reveal animation, expiry timer, and redemption flow
 */
const ScratchCard = ({ scratchCardId, participationId, onRedeemSuccess }) => {
  // States
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [cardState, setCardState] = useState('generating'); // generating, revealed, redeemed, expired
  const [scratchCard, setScratchCard] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds
  const [isRevealing, setIsRevealing] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scratchPercentage, setScratchPercentage] = useState(0);
  const [hasRevealed, setHasRevealed] = useState(false);

  // Load scratch card on mount
  // NOTE: Scratch card is already created by participate API, just fetch the existing one
  useEffect(() => {
    const loadScratchCard = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch existing scratch card (created during participate flow)
        const response = await fetch(`/api/customer/scratch/${scratchCardId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Failed to load scratch card');
          setCardState('error');
          return;
        }

        setScratchCard(data.data);
        setCardState('generating');

        // Calculate time remaining based on expiresAt
        if (data.data.expiresAt) {
          const expiresAtTime = new Date(data.data.expiresAt).getTime();
          const now = new Date().getTime();
          const remainingMs = expiresAtTime - now;
          const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
          setTimeRemaining(remainingSeconds);
        } else {
          // Default to 5 minutes if expiry not set
          setTimeRemaining(5 * 60);
        }
      } catch (err) {
        console.error('Error loading scratch card:', err);
        setError('Failed to load scratch card');
        setCardState('error');
      } finally {
        setLoading(false);
      }
    };

    if (scratchCardId) {
      loadScratchCard();
    }
  }, [scratchCardId]);

  // Initialize canvas for scratch effect
  useEffect(() => {
    if (cardState !== 'generating' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const context = canvas.getContext('2d');
    contextRef.current = context;

    // Draw overlay (scratch-off area)
    context.fillStyle = '#c0c0c0';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add texture
    context.fillStyle = 'rgba(0,0,0,0.1)';
    for (let i = 0; i < canvas.height; i += 10) {
      context.fillRect(0, i, canvas.width, 5);
    }

    // Draw "Scratch to reveal" text
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.font = 'bold 20px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('Scratch to reveal', canvas.width / 2, canvas.height / 2);

    setCardState('generating');
  }, [cardState]);

  // Handle scratch mouse/touch events
  const handleMouseDown = useCallback((e) => {
    if (cardState !== 'generating' || isRevealing) return;
    startScratching(e);
  }, [cardState, isRevealing]);

  const handleMouseMove = useCallback((e) => {
    if (cardState !== 'generating' || isRevealing) return;
    scratch(e);
  }, [cardState, isRevealing]);

  const handleMouseUp = useCallback(() => {
    if (cardState !== 'generating' || isRevealing) return;
    stopScratching();
  }, [cardState, isRevealing]);

  const handleTouchStart = useCallback((e) => {
    if (cardState !== 'generating' || isRevealing) return;
    startScratching(e.touches[0]);
  }, [cardState, isRevealing]);

  const handleTouchMove = useCallback((e) => {
    if (cardState !== 'generating' || isRevealing) return;
    e.preventDefault();
    scratch(e.touches[0]);
  }, [cardState, isRevealing]);

  const handleTouchEnd = useCallback(() => {
    if (cardState !== 'generating' || isRevealing) return;
    stopScratching();
  }, [cardState, isRevealing]);

  let isScratching = false;

  const startScratching = (e) => {
    isScratching = true;
    scratch(e);
  };

  const stopScratching = () => {
    isScratching = false;
  };

  const scratch = (e) => {
    if (!isScratching || !contextRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const context = contextRef.current;
    context.clearRect(x - 15, y - 15, 30, 30);

    // Calculate scratch percentage
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let clearPixels = 0;

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) clearPixels++;
    }

    const percentage = (clearPixels / (data.length / 4)) * 100;
    setScratchPercentage(percentage);

    // Trigger reveal at ~30% scratched
    if (percentage > 30 && !hasRevealed) {
      revealCard();
    }
  };

  const revealCard = async () => {
    if (hasRevealed || isRevealing) return;

    try {
      setIsRevealing(true);
      setHasRevealed(true);

      // Clear canvas completely
      if (contextRef.current && canvasRef.current) {
        contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      const response = await fetch(`/api/customer/participate/${participationId}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scratchCardId })
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to reveal scratch card');
        return;
      }

      setScratchCard((prev) => ({
        ...prev,
        status: 'revealed'
      }));
      setCardState('revealed');
    } catch (err) {
      console.error('Error revealing scratch card:', err);
      setError('Failed to reveal scratch card');
    } finally {
      setIsRevealing(false);
    }
  };

  // Timer effect
  useEffect(() => {
    if (cardState === 'expired' || !scratchCard) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setCardState('expired');
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cardState, scratchCard]);

  // Handle redeem
  const handleRedeem = async () => {
    try {
      setIsRedeeming(true);
      setError(null);

      const response = await fetch('/api/customer/scratch/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scratchCardId, participationId })
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to redeem scratch card');
        return;
      }

      setScratchCard((prev) => ({
        ...prev,
        status: 'redeemed'
      }));
      setCardState('redeemed');

      if (onRedeemSuccess) {
        onRedeemSuccess(data.data);
      }
    } catch (err) {
      console.error('Error redeeming scratch card:', err);
      setError('Failed to redeem scratch card');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className={styles.scratchCardContainer}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading scratch...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (cardState === 'error' || !scratchCard) {
    return (
      <div className={styles.scratchCardContainer}>
        <div className={styles.errorState}>
          <p>✗ {error || 'Unable to load scratch'}</p>
        </div>
      </div>
    );
  }

  // Render expired state
  if (cardState === 'expired') {
    return (
      <div className={styles.scratchCardContainer}>
        <div className={styles.card}>
          <div className={styles.cardContent}>
            <div className={styles.expiredState}>
              <p className={styles.expiredIcon}>✗</p>
              <p className={styles.expiredText}>Coupon Expired</p>
              <p className={styles.expiredSubtext}>This scratch is no longer valid</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render generating state (with scratch overlay)
  if (cardState === 'generating') {
    return (
      <div className={styles.scratchCardContainer}>
        <div className={styles.card}>
          <div className={styles.timerSection}>
            <CountdownTimer
              expiresAt={scratchCard?.expiresAt}
              showLabel={true}
              size="medium"
              onExpired={() => setCardState('expired')}
            />
          </div>

          <div className={styles.cardContent}>
            <div className={styles.rewardPlaceholder}>
              <p>Scratch to Reveal</p>
            </div>

            <canvas
              ref={canvasRef}
              className={styles.scratchCanvas}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />

            <div className={styles.scratchHint}>
              Scratched: {Math.round(scratchPercentage)}%
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render revealed state
  if (cardState === 'revealed') {
    return (
      <div className={styles.scratchCardContainer}>
        <div className={styles.card}>
          <div className={styles.timerSection}>
            <CountdownTimer
              expiresAt={scratchCard?.expiresAt}
              showLabel={true}
              size="medium"
              onExpired={() => setCardState('expired')}
            />
          </div>

          <div className={styles.cardContent}>
            <div className={styles.revealedContent}>
              <div className={styles.rewardSection}>
                <h3 className={styles.rewardType}>{scratchCard.reward_type}</h3>
                <p className={styles.rewardValue}>{scratchCard.reward_value}</p>
                {scratchCard.reward_description && (
                  <p className={styles.rewardDescription}>{scratchCard.reward_description}</p>
                )}
              </div>
            </div>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <button
            className={styles.redeemButton}
            onClick={handleRedeem}
            disabled={isRedeeming || cardState === 'expired'}
          >
            {isRedeeming ? 'Processing...' : 'Redeem Now'}
          </button>
        </div>
      </div>
    );
  }

  // Render redeemed state
  if (cardState === 'redeemed') {
    return (
      <div className={styles.scratchCardContainer}>
        <div className={styles.card}>
          <div className={styles.cardContent}>
            <div className={styles.redeemedState}>
              <p className={styles.redeemedIcon}>✓</p>
              <p className={styles.redeemedText}>Coupon Redeemed!</p>
              <p className={styles.redeemedSubtext}>
                Valid until {new Date(scratchCard.expires_at).toLocaleDateString()}
              </p>
              <div className={styles.rewardSummary}>
                <p>{scratchCard.reward_type}: {scratchCard.reward_value}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

ScratchCard.propTypes = {
  scratchCardId: PropTypes.string.isRequired,
  participationId: PropTypes.string.isRequired,
  onRedeemSuccess: PropTypes.func
};

export default ScratchCard;
