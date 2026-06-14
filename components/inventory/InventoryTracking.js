'use client';

import { useState, useMemo } from 'react';
import styles from './InventoryTracking.module.css';

const InventoryTracking = ({ trackingData = [], loading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  const ROWS_PER_PAGE = 10;

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  // Get status badge class for styling
  const getStatusBadgeClass = (status) => {
    const statusMap = {
      allocated: styles.statusAllocated,
      redeemed: styles.statusRedeemed,
      transferred: styles.statusTransferred,
      expired: styles.statusExpired
    };
    return statusMap[status?.toLowerCase()] || styles.statusDefault;
  };

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) {
      return trackingData;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    return trackingData.filter(item => {
      return (
        (item.campaign?.toLowerCase().includes(lowerSearchTerm)) ||
        (item.location?.toLowerCase().includes(lowerSearchTerm)) ||
        (item.movementType?.toLowerCase().includes(lowerSearchTerm))
      );
    });
  }, [trackingData, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
  const startIndex = currentPage * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Reset to first page when search term changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(0);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <p>Loading inventory tracking data...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (trackingData.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.filterGroup}>
          <input
            type="text"
            placeholder="Search by campaign, location, or movement type..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.filterInput}
            disabled
          />
        </div>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📦</div>
          <h3>No tracking data available</h3>
          <p>Start tracking inventory movements to see them here.</p>
        </div>
      </div>
    );
  }

  // No results state
  if (filteredData.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.filterGroup}>
          <input
            type="text"
            placeholder="Search by campaign, location, or movement type..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.filterInput}
          />
        </div>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔍</div>
          <h3>No results found</h3>
          <p>Try adjusting your search terms.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Search Input */}
      <div className={styles.filterGroup}>
        <input
          type="text"
          placeholder="Search by campaign, location, or movement type..."
          value={searchTerm}
          onChange={handleSearchChange}
          className={styles.filterInput}
        />
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Location</th>
              <th>Movement Type</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((item, index) => (
              <tr key={item.id || index}>
                <td>{item.campaign || '-'}</td>
                <td>{item.location || '-'}</td>
                <td>{item.movementType || '-'}</td>
                <td className={styles.quantityCell}>
                  {item.quantity || 0}
                </td>
                <td>
                  <span className={`${styles.statusBadge} ${getStatusBadgeClass(item.status)}`}>
                    {item.status || 'Unknown'}
                  </span>
                </td>
                <td>{formatDate(item.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={styles.pagination}>
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 0}
          className={styles.paginationButton}
        >
          Previous
        </button>
        <span className={styles.pageInfo}>
          Page {currentPage + 1} of {totalPages || 1}
        </span>
        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages - 1}
          className={styles.paginationButton}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default InventoryTracking;
