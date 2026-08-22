'use client';

import React, { useState } from 'react';
import {
  LifeBuoy,
  Plus,
  AlertCircle,
  X,
  Clock,
  Hourglass,
  CheckCircle2,
  Archive,
} from 'lucide-react';
import {
  useAdminSupportTicketsQuery,
  useAdminSupportTicketDetailQuery,
  useCreateSupportTicketMutation,
  useUpdateSupportTicketMutation,
} from '@/hooks/queries/useAdminSupportTicketsQuery';
import { useDistributorMerchantsQuery } from '@/hooks/queries/useDistributorMerchantsQuery';
import { useAdminDistributorsQuery } from '@/hooks/queries/useAdminDistributorsQuery';
import StatCard from '@/components/dashboard/shared/StatCard';
import LoadingState from '@/components/common/LoadingState';
import styles from './admin-support.module.css';

function formatDateTime(date) {
  return date
    ? new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
}

function requesterName(r) {
  if (!r) return '—';
  return r.profile?.storeName || r.profile?.companyName || r.name || r.email;
}

const STATUS_TABS = ['all', 'Open', 'In Progress', 'Waiting', 'Resolved', 'Closed'];
const CATEGORIES = ['Payment', 'QR', 'Campaign', 'Scratch', 'Subscription', 'Account', 'Technical', 'Other'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

function NewTicketModal({ onClose }) {
  const createMutation = useCreateSupportTicketMutation();
  const [requesterType, setRequesterType] = useState('merchant');
  const [requesterId, setRequesterId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [priority, setPriority] = useState('Medium');
  const [formError, setFormError] = useState(null);

  const { data: merchantsData } = useDistributorMerchantsQuery({ limit: 200 });
  const { data: distributorsData } = useAdminDistributorsQuery({ limit: 200 });
  const options = requesterType === 'merchant' ? merchantsData?.merchants || [] : distributorsData?.distributors || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!requesterId || !subject.trim() || !description.trim()) {
      setFormError('Requester, subject and description are required');
      return;
    }
    try {
      await createMutation.mutateAsync({ requesterId, subject, description, category, priority });
      onClose();
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Log a Support Ticket</h2>
          <button className={styles.modalClose} onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {formError && <div className={styles.formError}>{formError}</div>}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Requester Type</label>
                <select className={styles.formSelect} value={requesterType} onChange={(e) => { setRequesterType(e.target.value); setRequesterId(''); }}>
                  <option value="merchant">Retailer</option>
                  <option value="distributor">Distributor</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Requester *</label>
                <select className={styles.formSelect} value={requesterId} onChange={(e) => setRequesterId(e.target.value)}>
                  <option value="">Select...</option>
                  {options.map((o) => (
                    <option key={o._id} value={o._id}>{requesterName(o)} ({o.email})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Subject *</label>
              <input type="text" className={styles.formInput} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description *</label>
              <textarea className={styles.formTextarea} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category</label>
                <select className={styles.formSelect} value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Priority</label>
                <select className={styles.formSelect} value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitButton} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TicketDetailModal({ ticketId, onClose }) {
  const { data: ticket, isPending: loading } = useAdminSupportTicketDetailQuery(ticketId);
  const updateMutation = useUpdateSupportTicketMutation();
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const handleReply = () => {
    if (!replyText.trim()) return;
    updateMutation.mutate(
      { id: ticketId, action: 'reply', message: replyText, isInternalNote: isInternal },
      { onSuccess: () => setReplyText('') },
    );
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{loading ? 'Loading...' : ticket?.subject}</h2>
          <button className={styles.modalClose} onClick={onClose}><X size={20} /></button>
        </div>
        {loading || !ticket ? (
          <div className={styles.modalBody}><LoadingState message="Loading ticket..." /></div>
        ) : (
          <>
            <div className={styles.modalBody}>
              <div className={styles.ticketMeta}>
                <span className={`${styles.badge} ${styles[`badge-${ticket.status.replace(' ', '')}`]}`}>{ticket.status}</span>
                <span className={`${styles.badge} ${styles[`priority-${ticket.priority}`]}`}>{ticket.priority}</span>
                <span className={styles.badge}>{ticket.category}</span>
              </div>
              <p className={styles.ticketRequester}>
                {requesterName(ticket.requesterId)} ({ticket.requesterId?.email}) · Raised {formatDateTime(ticket.createdAt)}
              </p>
              <p className={styles.ticketDescription}>{ticket.description}</p>

              <div className={styles.ticketActionsRow}>
                <select
                  className={styles.smallSelect}
                  value={ticket.status}
                  onChange={(e) => updateMutation.mutate({ id: ticketId, action: 'status', status: e.target.value })}
                >
                  {['Open', 'In Progress', 'Waiting', 'Resolved', 'Closed'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {ticket.priority !== 'Critical' && (
                  <button
                    className={`${styles.smallButton} ${styles.smallButtonDanger}`}
                    onClick={() => updateMutation.mutate({ id: ticketId, action: 'escalate' })}
                    disabled={updateMutation.isPending}
                  >
                    Escalate
                  </button>
                )}
              </div>

              {ticket.replies?.length > 0 && (
                <div className={styles.repliesList}>
                  {ticket.replies.map((r, i) => (
                    <div key={i} className={`${styles.replyItem} ${r.isInternalNote ? styles.replyItemInternal : ''}`}>
                      <div className={styles.replyMeta}>
                        <span>{r.authorName} {r.isInternalNote && <span className={styles.internalTag}>· Internal Note</span>}</span>
                        <span>{formatDateTime(r.createdAt)}</span>
                      </div>
                      <div className={styles.replyMessage}>{r.message}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Add Reply</label>
                <textarea className={styles.formTextarea} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply to requester, or add an internal note..." />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151' }}>
                  <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                  Internal note (not visible to requester)
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelButton} onClick={onClose}>Close</button>
              <button type="button" className={styles.submitButton} onClick={handleReply} disabled={updateMutation.isPending || !replyText.trim()}>
                {updateMutation.isPending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminSupportPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const limit = 20;

  const { data, isPending: loading, error: queryError, refetch } = useAdminSupportTicketsQuery({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit,
  });

  const tickets = data?.tickets || [];
  const metrics = data?.metrics || { Open: 0, 'In Progress': 0, Waiting: 0, Resolved: 0, Closed: 0 };
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const error = queryError ? queryError.message : null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Support &amp; Operations</h1>
            <p>Requests raised by retailers and distributors across the platform</p>
          </div>
          <button className={styles.primaryButton} onClick={() => setShowNewModal(true)}>
            <Plus size={16} />
            Log Ticket
          </button>
        </div>

        <div className={styles.statGrid}>
          <StatCard icon={<AlertCircle />} value={metrics.Open} label="Open" onClick={() => { setStatusFilter('Open'); setPage(1); }} />
          <StatCard icon={<Clock />} value={metrics['In Progress']} label="In Progress" onClick={() => { setStatusFilter('In Progress'); setPage(1); }} />
          <StatCard icon={<Hourglass />} value={metrics.Waiting} label="Waiting" onClick={() => { setStatusFilter('Waiting'); setPage(1); }} />
          <StatCard icon={<CheckCircle2 />} value={metrics.Resolved} label="Resolved" tone="green" onClick={() => { setStatusFilter('Resolved'); setPage(1); }} />
          <StatCard icon={<Archive />} value={metrics.Closed} label="Closed" tone="gray" onClick={() => { setStatusFilter('Closed'); setPage(1); }} />
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterTabs}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                className={`${styles.filterTab} ${statusFilter === tab ? styles.active : ''}`}
                onClick={() => { setStatusFilter(tab); setPage(1); }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingState message="Loading tickets..." />
        ) : error ? (
          <div className={styles.errorState}>
            <AlertCircle size={48} />
            <p>{error}</p>
            <button onClick={() => refetch()} className={styles.retryButton}>Try Again</button>
          </div>
        ) : (
          <div className={styles.tableSection}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th>Raised</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.emptyState}>
                      <LifeBuoy size={32} />
                      <p>No support tickets found</p>
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t._id} onClick={() => setSelectedTicketId(t._id)}>
                      <td>
                        <p className={styles.ticketSubject}>{t.subject}</p>
                        <p className={styles.ticketRequester}>{requesterName(t.requesterId)}</p>
                      </td>
                      <td>{t.category}</td>
                      <td><span className={`${styles.badge} ${styles[`priority-${t.priority}`]}`}>{t.priority}</span></td>
                      <td><span className={`${styles.badge} ${styles[`badge-${t.status.replace(' ', '')}`]}`}>{t.status}</span></td>
                      <td>{t.assignedTo?.name || '—'}</td>
                      <td>{formatDateTime(t.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button className={styles.pageButton} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </button>
                <span className={styles.pageLabel}>Page {page} of {totalPages}</span>
                <button className={styles.pageButton} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showNewModal && <NewTicketModal onClose={() => setShowNewModal(false)} />}
      {selectedTicketId && <TicketDetailModal ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} />}
    </div>
  );
}
