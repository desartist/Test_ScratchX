'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ChevronRight,
  AlertCircle,
  Eye,
  Download,
  Filter,
  Search,
  X,
} from 'lucide-react';
import styles from './orders.module.css';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [metrics, setMetrics] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, searchTerm, dateRange]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
        ...(dateRange.startDate && { startDate: dateRange.startDate }),
        ...(dateRange.endDate && { endDate: dateRange.endDate }),
      });

      const res = await fetch(`/api/dashboard/orders?${params}`, {
        credentials: 'include',
      });
      const json = await res.json();

      if (!json.success) throw new Error(json.error);

      setOrders(json.data.orders || []);
      if (json.data.metrics) {
        setMetrics(json.data.metrics);
      }
      setError(null);
    } catch (err) {
      console.error('[Orders] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };

  const handleDownloadInvoice = (orderNumber) => {
    // In production, would generate actual PDF
    alert(`Invoice for ${orderNumber} would be downloaded`);
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setSearchTerm('');
    setDateRange({ startDate: '', endDate: '' });
    setPage(1);
  };

  const hasActiveFilters =
    statusFilter !== 'all' || searchTerm || dateRange.startDate || dateRange.endDate;

  if (loading && orders.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>Purchase Orders</h1>
          </div>
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{error}</p>
            <button onClick={fetchOrders} className={styles.retryButton}>
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
            <h1>Purchase Orders</h1>
            <p>Manage and track all your plan purchases</p>
          </div>
          <Link href="/dashboard/marketplace" className={styles.primaryButton}>
            Buy Plans
          </Link>
        </div>

        {/* Metrics */}
        <div className={styles.metricsGrid}>
          <div className={`${styles.metricCard} ${styles['metric-blue']}`}>
            <div className={styles.metricIcon}>📦</div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Total Orders</p>
              <p className={styles.metricValue}>{metrics.total}</p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-green']}`}>
            <div className={styles.metricIcon}>✓</div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Completed</p>
              <p className={styles.metricValue}>{metrics.completed}</p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-orange']}`}>
            <div className={styles.metricIcon}>⏱</div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Pending</p>
              <p className={styles.metricValue}>{metrics.pending}</p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-red']}`}>
            <div className={styles.metricIcon}>✕</div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Failed</p>
              <p className={styles.metricValue}>{metrics.failed}</p>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles['metric-purple']}`}>
            <div className={styles.metricIcon}>💰</div>
            <div className={styles.metricContent}>
              <p className={styles.metricLabel}>Total Spent</p>
              <p className={styles.metricValue}>₹{(metrics.totalSpent || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filtersSection}>
          <div className={styles.filterRow}>
            <div className={styles.searchBox}>
              <Search size={20} />
              <input
                type="text"
                placeholder="Search by order number..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <Filter size={20} />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className={styles.filterSelect}
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className={styles.dateInput}>
              <Calendar size={20} />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => {
                  setDateRange({ ...dateRange, startDate: e.target.value });
                  setPage(1);
                }}
                className={styles.dateField}
                placeholder="Start date"
              />
              <span>to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => {
                  setDateRange({ ...dateRange, endDate: e.target.value });
                  setPage(1);
                }}
                className={styles.dateField}
                placeholder="End date"
              />
            </div>

            {hasActiveFilters && (
              <button onClick={handleClearFilters} className={styles.clearBtn}>
                <X size={16} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableSection}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className={styles.emptyState}>
                    <AlertCircle size={32} />
                    <p>No orders found</p>
                    <Link href="/dashboard/marketplace" className={styles.createLink}>
                      Start buying plans
                    </Link>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <div className={styles.orderInfo}>
                        <p className={styles.orderNumber}>{order.orderNumber}</p>
                        <p className={styles.orderId}>ID: {order._id.slice(-8)}</p>
                      </div>
                    </td>
                    <td>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className={styles.itemsCell}>
                      {order.items?.length || 0} items
                      <span className={styles.itemsDetail}>
                        {order.items?.map((i) => `${i.quantity} ${i.planType}`).join(', ')}
                      </span>
                    </td>
                    <td className={styles.amountCell}>
                      <span className={styles.amount}>
                        ₹{(order.pricing?.grandTotal || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles[`badge-${order.orderStatus}`]}`}>
                        {order.orderStatus}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.paymentBadge} ${styles[`payment-${order.paymentStatus}`]}`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          onClick={() => handleViewDetails(order)}
                          className={styles.actionBtn}
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleDownloadInvoice(order.orderNumber)}
                          className={styles.actionBtn}
                          title="Download Invoice"
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {orders.length > 0 && (
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
              disabled={orders.length < limit}
              className={styles.paginationBtn}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => {
            setShowDetails(false);
            setSelectedOrder(null);
          }}
          onDownload={handleDownloadInvoice}
        />
      )}
    </div>
  );
}

// Order Details Modal Component
function OrderDetailsModal({ order, onClose, onDownload }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Order Details</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Order Info */}
          <div className={styles.section}>
            <h3>Order Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <label>Order Number</label>
                <value>{order.orderNumber}</value>
              </div>
              <div className={styles.infoRow}>
                <label>Invoice Number</label>
                <value>{order.invoiceNumber || 'N/A'}</value>
              </div>
              <div className={styles.infoRow}>
                <label>Date</label>
                <value>
                  {new Date(order.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </value>
              </div>
              <div className={styles.infoRow}>
                <label>Status</label>
                <value>
                  <span className={`${styles.badge} ${styles[`badge-${order.orderStatus}`]}`}>
                    {order.orderStatus}
                  </span>
                </value>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className={styles.section}>
            <h3>Items Ordered</h3>
            <div className={styles.itemsList}>
              {order.items?.map((item, idx) => (
                <div key={idx} className={styles.itemRow}>
                  <div className={styles.itemDetails}>
                    <p className={styles.itemName}>{item.planName || item.planType}</p>
                    <p className={styles.itemQty}>Quantity: {item.quantity}</p>
                  </div>
                  <div className={styles.itemPricing}>
                    <p className={styles.unitPrice}>₹{item.unitMRP?.toLocaleString()}</p>
                    <p className={styles.lineTotal}>
                      ₹{(item.lineTotal || item.unitMRP * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className={styles.section}>
            <h3>Pricing Breakdown</h3>
            <div className={styles.pricingBreakdown}>
              <div className={styles.pricingRow}>
                <span>Subtotal (MRP)</span>
                <strong>₹{(order.pricing?.subtotalMRP || 0).toLocaleString()}</strong>
              </div>
              <div className={styles.pricingRow}>
                <span>Your Discount</span>
                <strong className={styles.discount}>
                  -₹{(order.pricing?.totalDiscount || 0).toLocaleString()}
                </strong>
              </div>
              <div className={styles.pricingRow}>
                <span>Subtotal</span>
                <strong>₹{(order.pricing?.subtotal || 0).toLocaleString()}</strong>
              </div>
              <div className={styles.pricingRow}>
                <span>GST (18%)</span>
                <strong>₹{(order.pricing?.gst || 0).toLocaleString()}</strong>
              </div>
              <div className={styles.pricingRow + ' ' + styles.total}>
                <span>Total</span>
                <strong>₹{(order.pricing?.grandTotal || 0).toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className={styles.section}>
            <h3>Payment Information</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <label>Payment Method</label>
                <value>{order.paymentMethod || 'N/A'}</value>
              </div>
              <div className={styles.infoRow}>
                <label>Payment Status</label>
                <value>
                  <span
                    className={`${styles.paymentBadge} ${styles[`payment-${order.paymentStatus}`]}`}
                  >
                    {order.paymentStatus}
                  </span>
                </value>
              </div>
              {order.paymentDate && (
                <div className={styles.infoRow}>
                  <label>Payment Date</label>
                  <value>
                    {new Date(order.paymentDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </value>
                </div>
              )}
              {order.paymentGatewayReference && (
                <div className={styles.infoRow}>
                  <label>Reference</label>
                  <value className={styles.refValue}>{order.paymentGatewayReference}</value>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            onClick={() => onDownload(order.orderNumber)}
            className={styles.downloadBtn}
          >
            <Download size={18} />
            Download Invoice
          </button>
          <button onClick={onClose} className={styles.closeModalBtn}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
