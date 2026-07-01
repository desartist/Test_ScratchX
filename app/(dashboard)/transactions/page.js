'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  AlertCircle,
  Calendar,
  Download,
} from 'lucide-react';
import styles from './transactions.module.css';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [typeFilter, setTypeFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [balance, setBalance] = useState(0);
  const [summary, setSummary] = useState({
    totalCredit: 0,
    totalDebit: 0,
    netAmount: 0,
  });

  useEffect(() => {
    fetchTransactions();
    fetchBalance();
    fetchSummary();
  }, [page, typeFilter, directionFilter, searchTerm]);

  // Auto-refetch transactions when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[Transactions] Page visible - refetching");
        setPage(1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit,
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(directionFilter !== 'all' && { direction: directionFilter }),
        ...(searchTerm && { search: searchTerm }),
      });

      const res = await fetch(`/api/distributor/transactions?${params}`, {
        credentials: 'include',
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.error);

      setTransactions(json.data.transactions || []);
      setError(null);
    } catch (err) {
      console.error('[Transactions] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/distributor/transactions?endpoint=balance', {
        credentials: 'include',
      });
      const json = await res.json();

      if (json.success) {
        setBalance(json.data.balance || 0);
      }
    } catch (err) {
      console.error('[Balance] Error:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const res = await fetch(
        `/api/distributor/transactions?endpoint=summary&startDate=${startDate}&endDate=${endDate}`,
        {
          credentials: 'include',
        }
      );
      const json = await res.json();

      if (json.success) {
        setSummary(json.data);
      }
    } catch (err) {
      console.error('[Summary] Error:', err);
    }
  };

  const getTransactionIcon = (type) => {
    return type === 'credit' ? (
      <TrendingUp size={20} />
    ) : (
      <TrendingDown size={20} />
    );
  };

  const getTransactionColor = (type) => {
    return type === 'credit' ? styles.credit : styles.debit;
  };

  if (loading && transactions.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>Transactions Ledger</h1>
          </div>
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{error}</p>
            <button onClick={fetchTransactions} className={styles.retryButton}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Transactions Ledger</h1>
            <p>Complete financial history and balance tracking</p>
          </div>
          <button className={styles.primaryButton}>
            <Download size={20} />
            Export
          </button>
        </div>

        {/* Current Balance */}
        <div className={styles.balanceCard}>
          <div className={styles.balanceInfo}>
            <p className={styles.balanceLabel}>Current Balance</p>
            <p className={styles.balanceAmount}>₹{balance.toLocaleString()}</p>
            <p className={styles.balanceSubtext}>Available credit in account</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles['card-green']}`}>
            <div className={styles.cardIcon}>
              <TrendingUp size={24} />
            </div>
            <div className={styles.cardContent}>
              <p className={styles.cardLabel}>Total Credit</p>
              <p className={styles.cardValue}>₹{(summary.totalCredit || 0).toLocaleString()}</p>
              <p className={styles.cardSubtext}>Money in</p>
            </div>
          </div>

          <div className={`${styles.summaryCard} ${styles['card-red']}`}>
            <div className={styles.cardIcon}>
              <TrendingDown size={24} />
            </div>
            <div className={styles.cardContent}>
              <p className={styles.cardLabel}>Total Debit</p>
              <p className={styles.cardValue}>₹{(summary.totalDebit || 0).toLocaleString()}</p>
              <p className={styles.cardSubtext}>Money out</p>
            </div>
          </div>

          <div className={`${styles.summaryCard} ${styles['card-blue']}`}>
            <div className={styles.cardIcon}>
              <TrendingUp size={24} />
            </div>
            <div className={styles.cardContent}>
              <p className={styles.cardLabel}>Net Amount</p>
              <p className={styles.cardValue}>
                ₹{(summary.netAmount || 0).toLocaleString()}
              </p>
              <p className={styles.cardSubtext}>This month</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filterSection}>
          <div className={styles.searchBox}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className={styles.searchInput}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className={styles.filterSelect}
          >
            <option value="all">All Types</option>
            <option value="purchase">Purchase</option>
            <option value="assignment">Assignment</option>
            <option value="commission">Commission</option>
            <option value="payout">Payout</option>
          </select>

          <select
            value={directionFilter}
            onChange={(e) => {
              setDirectionFilter(e.target.value);
              setPage(1);
            }}
            className={styles.filterSelect}
          >
            <option value="all">All Directions</option>
            <option value="credit">Credit (In)</option>
            <option value="debit">Debit (Out)</option>
          </select>
        </div>

        {/* Table */}
        <div className={styles.tableSection}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Balance After</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.emptyState}>
                    <AlertCircle size={32} />
                    <p>No transactions found</p>
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn._id}>
                    <td>
                      {new Date(txn.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      <div className={`${styles.typeCell} ${getTransactionColor(txn.transactionDirection)}`}>
                        {getTransactionIcon(txn.transactionDirection)}
                        <span>{txn.transactionType}</span>
                      </div>
                    </td>
                    <td className={styles.descCell}>{txn.description || '-'}</td>
                    <td className={`${styles.amount} ${getTransactionColor(txn.transactionDirection)}`}>
                      {txn.transactionDirection === 'debit' ? '-' : '+'}₹
                      {(txn.amount || 0).toLocaleString()}
                    </td>
                    <td>₹{(txn.balanceAfter || 0).toLocaleString()}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[`badge-${txn.status}`]}`}>
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {transactions.length > 0 && (
          <div className={styles.pagination}>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className={styles.paginationBtn}
            >
              Previous
            </button>
            <span className={styles.pageInfo}>Page {page}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={transactions.length < limit}
              className={styles.paginationBtn}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
