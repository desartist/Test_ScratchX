'use client'
import React from 'react';;

import { useAuthContext } from '@/components/auth/AuthContext';
import styles from './DashboardLayout.module.css';

export function DashboardLayout({ children }) {
  const { account, logout } = useAuthContext();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            Scratch<span className={styles.logoX}>X</span>
          </div>
          {account && (
            <div className={styles.userInfo}>
              <span className={styles.userName}>{account.firstName} {account.lastName}</span>
              <button onClick={handleLogout} className={styles.logoutBtn}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
