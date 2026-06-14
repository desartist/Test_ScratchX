'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MoreVertical,
  Plus,
  Store,
  CalendarPlus,
  Pencil,
  Pause,
  Play,
  BarChart3,
  Copy,
} from 'lucide-react';
import styles from './CampaignCardMenu.module.css';

export default function CampaignCardMenu({ onAction, isPaused = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const menuItems = [
    { icon: Plus, label: 'Scratches', action: 'scratches' },
    { icon: Store, label: 'Assign', action: 'assign' },
    { icon: CalendarPlus, label: 'Extend', action: 'extend' },
    { icon: Pencil, label: 'Edit', action: 'edit' },
    isPaused
      ? { icon: Play, label: 'Resume', action: 'resume' }
      : { icon: Pause, label: 'Pause', action: 'pause' },
    { icon: BarChart3, label: 'Stats', action: 'stats' },
    { icon: Copy, label: 'Clone', action: 'clone' },
  ];

  const toggleOpen = useCallback((event) => {
    event.stopPropagation();
    setIsOpen((prev) => !prev);
  }, []);

  const handleMenuClick = useCallback(
    (event, action) => {
      event.stopPropagation();
      setIsOpen(false);
      onAction(action);
    },
    [onAction],
  );

  return (
    <div className={styles.menuContainer} ref={menuRef}>
      <button
        type="button"
        className={styles.menuButton}
        onClick={toggleOpen}
        aria-label="Campaign menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <MoreVertical size={18} />
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.action}
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={(event) => handleMenuClick(event, item.action)}
              >
                <Icon size={16} className={styles.menuIcon} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
