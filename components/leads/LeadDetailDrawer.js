"use client";

import React, { useEffect, useState } from "react";
import { X, AlertCircle } from "lucide-react";
import {
  useLeadDetailQuery,
  useUpdateLeadMutation,
  useAddLeadNoteMutation,
  useConvertLeadMutation,
} from "@/hooks/queries/useLeadsQuery";
import { useSalesExecutivesQuery } from "@/hooks/queries/useSalesExecutivesQuery";
import { useAuthContext } from "@/components/auth/AuthContext";
import AddBusinessModal from "@/components/distributor/AddBusinessModal";
import { LEAD_STATUSES, LEAD_INTEREST_LEVELS, STATUS_COLORS } from "@/lib/leadDisplay";
// Base drawer chrome reused verbatim from the Customer detail drawer so this
// feels like the same application, not a bolted-on CRM screen.
import drawerStyles from "@/components/customers/CustomerDetailDrawer.module.css";
import styles from "./LeadDetailDrawer.module.css";
import { SALES_EXECUTIVE_ENABLED } from "@/lib/featureFlags";

function toDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

export default function LeadDetailDrawer({ isOpen, onClose, leadId }) {
  const { account } = useAuthContext();
  const isDistributorOrAdmin = ["Distributor", "Super_Admin"].includes(account?.role);

  const { data: lead, isPending: loading } = useLeadDetailQuery(leadId);
  const { data: execData } = useSalesExecutivesQuery();
  const executives = execData?.executives || [];

  const updateMutation = useUpdateLeadMutation();
  const addNoteMutation = useAddLeadNoteMutation();
  const convertMutation = useConvertLeadMutation();

  const [noteText, setNoteText] = useState("");
  const [error, setError] = useState(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Same open/close-reset-on-open pattern as CustomerDetailDrawer.js —
    // deliberate, precedented elsewhere in this codebase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    // Deferred to next frame so the drawer mounts at its closed transform
    // first, then transitions in — a synchronous setState here would skip
    // straight to the open state with no animation.
    const raf = requestAnimationFrame(() => setIsAnimating(true));
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFieldUpdate = async (updates) => {
    setError(null);
    try {
      await updateMutation.mutateAsync({ leadId, ...updates });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setError(null);
    try {
      await addNoteMutation.mutateAsync({ leadId, message: noteText.trim() });
      setNoteText("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConverted = async (merchant) => {
    if (!merchant?._id) return;
    setError(null);
    try {
      await convertMutation.mutateAsync({ leadId, retailerId: merchant._id });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className={`${drawerStyles.overlay} ${isAnimating ? drawerStyles.visible : ""}`} onClick={onClose} />
      <div className={`${drawerStyles.drawer} ${isAnimating ? drawerStyles.visible : ""}`}>
        <div className={drawerStyles.header}>
          <h2 className={drawerStyles.title}>Lead Details</h2>
          <button className={drawerStyles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        <div className={drawerStyles.content}>
          {loading || !lead ? (
            <p className={styles.emptyText}>Loading...</p>
          ) : (
            <>
              {error && (
                <div className={styles.errorBanner}>
                  <AlertCircle size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
                  {error}
                </div>
              )}

              <section className={drawerStyles.section}>
                <h3 className={drawerStyles.sectionTitle}>Business Information</h3>
                <div className={drawerStyles.infoGrid}>
                  <div className={drawerStyles.infoItem}>
                    <span className={drawerStyles.label}>Business Name</span>
                    <span className={drawerStyles.value}>{lead.businessName}</span>
                  </div>
                  <div className={drawerStyles.infoItem}>
                    <span className={drawerStyles.label}>Owner / Contact</span>
                    <span className={drawerStyles.value}>{lead.ownerName}</span>
                  </div>
                  <div className={drawerStyles.infoItem}>
                    <span className={drawerStyles.label}>Phone</span>
                    <span className={drawerStyles.value}>{lead.phone}</span>
                  </div>
                  <div className={drawerStyles.infoItem}>
                    <span className={drawerStyles.label}>Email</span>
                    <span className={drawerStyles.value}>{lead.email || "Not provided"}</span>
                  </div>
                  <div className={drawerStyles.infoItem}>
                    <span className={drawerStyles.label}>Location</span>
                    <span className={drawerStyles.value}>
                      {[lead.city, lead.state].filter(Boolean).join(", ") || "—"}
                    </span>
                  </div>
                  <div className={drawerStyles.infoItem}>
                    <span className={drawerStyles.label}>Category</span>
                    <span className={drawerStyles.value}>{lead.businessCategory || "—"}</span>
                  </div>
                </div>
              </section>

              <section className={drawerStyles.section}>
                <h3 className={drawerStyles.sectionTitle}>Pipeline</h3>
                <div className={styles.actionsRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Status</label>
                    <select
                      className={styles.fieldSelect}
                      value={lead.status}
                      disabled={lead.status === "Converted"}
                      onChange={(e) => handleFieldUpdate({ status: e.target.value })}
                    >
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Interest Level</label>
                    <select
                      className={styles.fieldSelect}
                      value={lead.interestLevel || ""}
                      onChange={(e) => handleFieldUpdate({ interestLevel: e.target.value || null })}
                    >
                      <option value="">Not set</option>
                      {LEAD_INTEREST_LEVELS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  {SALES_EXECUTIVE_ENABLED && isDistributorOrAdmin && (
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Assigned To</label>
                      <select
                        className={styles.fieldSelect}
                        value={lead.assignedTo?._id || ""}
                        onChange={(e) => handleFieldUpdate({ assignedTo: e.target.value || null })}
                      >
                        <option value="">Unassigned</option>
                        {executives.map((ex) => (
                          <option key={ex._id} value={ex._id}>{ex.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Demo Date</label>
                    <input
                      type="datetime-local"
                      className={styles.fieldInput}
                      value={toDateInputValue(lead.demoDate)}
                      onChange={(e) => handleFieldUpdate({ demoDate: e.target.value || null })}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Next Follow-up</label>
                    <input
                      type="datetime-local"
                      className={styles.fieldInput}
                      value={toDateInputValue(lead.nextFollowUpDate)}
                      onChange={(e) => handleFieldUpdate({ nextFollowUpDate: e.target.value || null })}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <span
                    className={drawerStyles.statusBadge}
                    style={{ borderColor: STATUS_COLORS[lead.status] }}
                  >
                    <span className={drawerStyles.statusDot} style={{ background: STATUS_COLORS[lead.status] }} />
                    {lead.status}
                  </span>
                </div>

                {isDistributorOrAdmin && lead.status !== "Converted" && (
                  <button
                    type="button"
                    className={styles.convertBtn}
                    style={{ marginTop: 14 }}
                    onClick={() => setShowConvertModal(true)}
                  >
                    Convert to Retailer
                  </button>
                )}
                {lead.status === "Converted" && lead.convertedRetailerId && (
                  <p className={styles.emptyText} style={{ marginTop: 10 }}>
                    Converted to <strong>{lead.convertedRetailerId.name}</strong> on{" "}
                    {new Date(lead.convertedAt).toLocaleDateString("en-IN")}
                  </p>
                )}
              </section>

              <section className={drawerStyles.section}>
                <h3 className={drawerStyles.sectionTitle}>Notes</h3>
                <div className={styles.notesList}>
                  {(lead.notes || []).length === 0 ? (
                    <p className={styles.emptyText}>No notes yet.</p>
                  ) : (
                    lead.notes.map((note) => (
                      <div key={note._id} className={styles.noteCard}>
                        <div className={styles.noteMeta}>
                          <span className={styles.noteAuthor}>{note.authorName}</span>
                          <span>{new Date(note.createdAt).toLocaleString("en-IN")}</span>
                        </div>
                        <div className={styles.noteText}>{note.message}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className={styles.noteForm}>
                  <textarea
                    className={styles.noteTextarea}
                    placeholder="Add a follow-up note..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.noteSubmitBtn}
                    disabled={!noteText.trim() || addNoteMutation.isPending}
                    onClick={handleAddNote}
                  >
                    {addNoteMutation.isPending ? "Adding..." : "Add"}
                  </button>
                </div>
              </section>

              <section className={drawerStyles.section}>
                <h3 className={drawerStyles.sectionTitle}>Timeline</h3>
                {(lead.timeline || []).length === 0 ? (
                  <p className={styles.emptyText}>No activity yet.</p>
                ) : (
                  <div className={styles.timeline}>
                    {[...lead.timeline].reverse().map((event) => (
                      <div key={event._id} className={styles.timelineItem}>
                        <div className={styles.timelineDot} />
                        <div className={styles.timelineBody}>
                          <span className={styles.timelineEvent}>{event.event.replace(/_/g, " ")}</span>
                          {event.detail && <span className={styles.timelineDetail}>{event.detail}</span>}
                          <span className={styles.timelineMeta}>
                            {event.actorName || "System"} · {new Date(event.createdAt).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {lead && (
        <AddBusinessModal
          isOpen={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          onCreated={handleConverted}
          initialValues={{
            storeName: lead.businessName,
            name: lead.ownerName,
            phoneNumber: lead.phone?.slice(-10) || "",
            email: lead.email || "",
          }}
        />
      )}
    </>
  );
}
