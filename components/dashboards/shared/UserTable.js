'use client'
import React from 'react';;

import styles from './UserTable.module.css';

function formatStatus(status) {
  if (!status) return '—';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function UserTable({ title, users = [], columns }) {
  const hasRows = users.length > 0;

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {hasRows && (
          <span className={styles.count}>
            {users.length} {users.length === 1 ? 'record' : 'records'}
          </span>
        )}
      </header>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} scope="col">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hasRows ? (
              users.map((user) => (
                <tr key={user._id || user.id || user.email}>
                  <td className={styles.emailCell}>{user.email}</td>
                  <td>
                    {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td>{user.role || '—'}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[user.status] || ''}`}>
                      {formatStatus(user.status)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className={styles.emptyCell}>
                  <div className={styles.emptyState}>
                    <p className={styles.emptyTitle}>No records yet</p>
                    <p className={styles.emptyText}>
                      Data will appear here once items are added to your account.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
