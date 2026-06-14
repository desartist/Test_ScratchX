'use client';

import React, { useRef, useEffect, useState } from 'react';
import styles from './CanvasScratchCard.module.css';

export default function CanvasScratchCard({
  coupon,
  onSelect,
  isSelected = false,
  disabled = false
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [scratchPercentage, setScratchPercentage] = useState(0);
  const contextRef = useRef(null);
  const imageDataRef = useRef(null);

  // Initialize canvas with scratch-off effect
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const context = canvas.getContext('2d');
    contextRef.current = context;

    // Draw scratch layer (golden overlay)
    context.fillStyle = '#fcd34d';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add border styling
    context.strokeStyle = '#ef9e1b';
    context.lineWidth = 2;
    context.strokeRect(0, 0, canvas.width, canvas.height);

    // Add shine/gradient effect for realism
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Store original image data for scratch effect
    imageDataRef.current = context.getImageData(0, 0, canvas.width, canvas.height);

    // Prevent default touch behaviors
    canvas.addEventListener('touchstart', handleTouchStart, false);
    canvas.addEventListener('touchmove', handleTouchMove, false);
    canvas.addEventListener('touchend', handleTouchEnd, false);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Calculate scratch percentage
  const calculateScratchPercentage = () => {
    if (!canvasRef.current || !contextRef.current) return 0;

    const canvas = canvasRef.current;
    const imageData = contextRef.current.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let scratchedPixels = 0;
    // Check alpha channel (every 4th byte, starting at 3)
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 128) {
        scratchedPixels++;
      }
    }

    const percentage = Math.round((scratchedPixels / (data.length / 4)) * 100);
    return Math.min(percentage, 100);
  };

  // Handle scratch effect
  const scratch = (x, y) => {
    if (!contextRef.current || !canvasRef.current || disabled) return;

    const canvas = canvasRef.current;
    const context = contextRef.current;
    const rect = canvas.getBoundingClientRect();
    const brushSize = 35; // Size of scratch brush
    const offsetX = x - rect.left;
    const offsetY = y - rect.top;

    // Clear the scratched area with circular brush
    context.globalCompositeOperation = 'destination-out';
    context.beginPath();
    context.arc(offsetX, offsetY, brushSize, 0, Math.PI * 2);
    context.fill();

    // Update scratch percentage
    const percentage = calculateScratchPercentage();
    setScratchPercentage(percentage);
  };

  // Mouse events
  const startScratching = (e) => {
    if (disabled) return;
    setIsDrawing(true);
  };

  const stopScratching = () => {
    setIsDrawing(false);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || disabled) return;
    scratch(e.clientX, e.clientY);
  };

  // Touch events
  const handleTouchStart = (e) => {
    if (disabled) return;
    e.preventDefault();
    setIsDrawing(true);
    if (e.touches.length > 0) {
      scratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    if (e.touches.length > 0) {
      scratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  return (
    <div
      className={`${styles.cardContainer} ${isSelected ? styles.selected : ''} ${
        disabled ? styles.disabled : ''
      }`}
      onClick={() => !disabled && onSelect(coupon)}
    >
      {/* Canvas - Scratch layer */}
      <canvas
        ref={canvasRef}
        className={styles.scratchCanvas}
        onMouseDown={startScratching}
        onMouseUp={stopScratching}
        onMouseMove={handleMouseMove}
        onMouseLeave={stopScratching}
        onContextMenu={(e) => e.preventDefault()}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      />

      {/* Underneath content - reveals on scratch */}
      <div className={styles.revealedContent}>
        <div className={styles.couponAmount}>₹ {coupon.amount}</div>
        <div className={styles.couponIcon}>🎁</div>
      </div>

      {/* Scratch percentage indicator */}
      {scratchPercentage > 0 && scratchPercentage < 100 && (
        <div className={styles.scratchIndicator}>
          <span className={styles.percentage}>{scratchPercentage}%</span>
        </div>
      )}

      {/* Selection checkmark */}
      <div className={styles.checkmark}>✓</div>
    </div>
  );
}
