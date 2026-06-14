'use client';

import React, { useState, useMemo } from 'react';
import styles from './DataTable.module.css';

export default function DataTable({
  columns,
  data,
  loading = false,
  onRowClick,
  onEdit,
  onDelete,
}) {
  // State for sorting and pagination
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 10;

  // Handle column header sort click
  const handleSort = (field) => {
    if (sortField === field) {
      // Same field clicked: toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Different field: set new field and reset to ascending
      setSortField(field);
      setSortOrder('asc');
    }
    // Reset to page 1 when sorting changes
    setCurrentPage(1);
  };

  // Sort and paginate data
  const sortedAndPaginatedData = useMemo(() => {
    // Make a copy and sort
    let sortedData = [...data];

    if (sortField) {
      sortedData.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        // String comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortOrder === 'asc' ? comparison : -comparison;
        }

        // Number comparison
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // Fallback comparison
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Calculate pagination
    const totalPages = Math.ceil(sortedData.length / rowsPerPage);
    const startIdx = (currentPage - 1) * rowsPerPage;
    const paginatedData = sortedData.slice(startIdx, startIdx + rowsPerPage);

    return { sortedData, paginatedData, totalPages };
  }, [data, sortField, sortOrder, currentPage]);

  const { paginatedData, totalPages } = sortedAndPaginatedData;

  // Get sort icon for column header
  const getSortIcon = (field) => {
    if (sortField !== field) return ' ▢';
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  // Handle pagination controls
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.empty}>
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        {/* Table Header */}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.field}
                className={sortField === column.field ? styles.active : ''}
                onClick={() => handleSort(column.field)}
              >
                <div className={styles.sortable}>
                  <span>{column.label}</span>
                  <span className={styles.sortIcon}>{getSortIcon(column.field)}</span>
                </div>
              </th>
            ))}
            {/* Actions column header - only show if edit or delete callbacks provided */}
            {(onEdit || onDelete) && <th>Actions</th>}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody>
          {paginatedData.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className={styles.row}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((column) => (

                <td key={column.field}>
                  {column.render ? column.render(row[column.field], row) : row[column.field]}
                </td>
              ))}

              {/* Actions cell - only show if edit or delete callbacks provided */}
              {(onEdit || onDelete) && (
                <td>
                  <div className={styles.actions}>
                    {onEdit && (
                      <button
                        className={styles.editBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(row);
                        }}
                        aria-label="Edit row"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className={styles.deleteBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(row);
                        }}
                        aria-label="Delete row"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <div className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </div>
          <div className={styles.paginationControls}>
            <button
              className={styles.pageButton}
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button
              className={styles.pageButton}
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
