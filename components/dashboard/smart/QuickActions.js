"use client";
import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import styles from "./QuickActions.module.css";

export default function QuickActions({ actions }) {
  const list = Array.isArray(actions) ? actions : [];
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  if (list.length === 0) return null;

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 0.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 0.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={scrollRef}
      className={styles.slider}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.sliderTrack}>
        {list.map((action, index) => {
          const key = action.href || action.label || index;
          const content = (
            <>
              {action.icon != null && (
                <span className={styles.icon}>{action.icon}</span>
              )}
              <span className={styles.label}>{action.label}</span>
            </>
          );

          if (action.href) {
            return (
              <a
                key={key}
                className={styles.card}
                href={action.href}
                onClick={action.onClick}
                draggable="false"
              >
                {content}
              </a>
            );
          }

          return (
            <button
              key={key}
              type="button"
              className={styles.card}
              onClick={action.onClick}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}

QuickActions.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      icon: PropTypes.node,
      href: PropTypes.string,
      onClick: PropTypes.func,
    })
  ),
};
