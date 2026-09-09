"use client";

import React, { useMemo, useState } from "react";
import { UserPlus, Search, MoreVertical, Eye, X, AlertCircle, ClipboardList, Video, Clock, CheckCircle2 } from "lucide-react";
import { useLeadsQuery, useCreateLeadMutation, useUpdateLeadMutation } from "@/hooks/queries/useLeadsQuery";
import { useSalesExecutivesQuery } from "@/hooks/queries/useSalesExecutivesQuery";
import { useAuthContext } from "@/components/auth/AuthContext";
import StatCard from "@/components/dashboard/shared/StatCard";
import LeadDetailDrawer from "@/components/leads/LeadDetailDrawer";
import { sanitizeNameInput } from "@/lib/nameInput";
import { LEAD_STATUSES, LEAD_INTEREST_LEVELS, STATUS_COLORS, INTEREST_CLASS } from "@/lib/leadDisplay";
// Cross-import Team Access's modal/form styles — see sales-executives/page.js
// for the same reuse rationale.
import modalStyles from "@/app/(dashboard)/team/team.module.css";
import styles from "./leads.module.css";

const EMPTY_FORM = {
  businessName: "", ownerName: "", phone: "", email: "",
  businessCategory: "", city: "", state: "", territory: "", assignedTo: "",
};

export default function LeadsPage() {
  const { account } = useAuthContext();
  const isDistributorOrAdmin = ["Distributor", "Super_Admin"].includes(account?.role);
  // Lead creation is Sales_Executive-only for now — Distributor is
  // view/manage (assign, status, notes, convert) but not creation. This is
  // a deliberate, temporary product decision; Distributor-side creation is
  // planned for later, not a gap to "fix" by reverting this.
  const canCreateLead = account?.role === "Sales_Executive";

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [interestFilter, setInterestFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const params = useMemo(
    () => ({ page, limit, search: searchQuery, status: statusFilter, assignedTo: assignedFilter, interestLevel: interestFilter }),
    [page, searchQuery, statusFilter, assignedFilter, interestFilter],
  );

  const { data, isPending: loading, error: queryError } = useLeadsQuery(params);
  const leads = data?.leads || [];
  const metrics = data?.metrics || { total: 0, conversionRate: 0, followUpsPending: 0, demosScheduled: 0 };
  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  const { data: execData } = useSalesExecutivesQuery();
  const executives = execData?.executives || [];

  const createMutation = useCreateLeadMutation();
  const updateMutation = useUpdateLeadMutation();

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const openCreateModal = () => {
    setFormData(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.businessName || !formData.ownerName || !formData.phone) {
      setFormError("Business name, owner name, and phone are required");
      return;
    }
    if (formData.phone.length !== 10) {
      setFormError("Phone number must be exactly 10 digits");
      return;
    }
    try {
      await createMutation.mutateAsync({ ...formData, assignedTo: formData.assignedTo || null });
      setShowModal(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleRowClick = (leadId) => {
    setSelectedLeadId(leadId);
    setShowDrawer(true);
  };

  const handleMarkLost = async (leadId) => {
    setOpenMenuId(null);
    try {
      await updateMutation.mutateAsync({ leadId, status: "Not Interested" });
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Leads</h1>
          <p className={styles.subtitle}>Track retailer/wholesaler prospects from first contact to conversion</p>
        </div>
        {canCreateLead && (
          <button className={styles.addButton} onClick={openCreateModal}>
            <UserPlus size={18} />
            Add Lead
          </button>
        )}
      </div>

      <div className={styles.statsGrid}>
        <StatCard icon={<ClipboardList />} label="Total Leads" value={metrics.total} tone="indigo" />
        <StatCard icon={<Video />} label="Demos Scheduled" value={metrics.demosScheduled} tone="indigo" />
        <StatCard icon={<Clock />} label="Follow-ups Pending" value={metrics.followUpsPending} tone={metrics.followUpsPending > 0 ? "red" : "gray"} />
        <StatCard icon={<CheckCircle2 />} label="Conversion Rate" value={`${metrics.conversionRate}%`} tone="green" />
      </div>

      <div className={styles.filtersSection}>
        <div className={styles.searchBar}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by business, owner, phone, or city..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterControls}>
          <select className={styles.select} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Status</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {isDistributorOrAdmin && (
            <select className={styles.select} value={assignedFilter} onChange={(e) => { setAssignedFilter(e.target.value); setPage(1); }}>
              <option value="all">All Executives</option>
              <option value="unassigned">Unassigned</option>
              {executives.map((ex) => (
                <option key={ex._id} value={ex._id}>{ex.name}</option>
              ))}
            </select>
          )}
          <select className={styles.select} value={interestFilter} onChange={(e) => { setInterestFilter(e.target.value); setPage(1); }}>
            <option value="all">All Interest Levels</option>
            {LEAD_INTEREST_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {queryError && (
        <div className={styles.errorBanner}>{queryError.message}</div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Lead</th>
              <th>Contact</th>
              <th>Assigned To</th>
              <th>Status</th>
              <th>Interest</th>
              <th>Next Follow-up</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className={styles.emptyCell}>Loading leads...</td></tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyCell}>
                  {canCreateLead ? "No leads found. Add your first lead to get started." : "No leads found."}
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead._id} className={styles.tableRow} onClick={() => handleRowClick(lead._id)}>
                  <td>
                    <div className={styles.leadName}>{lead.businessName}</div>
                    <div className={styles.leadSub}>{lead.ownerName}</div>
                  </td>
                  <td>
                    <div>{lead.phone}</div>
                    {lead.city && <div className={styles.leadSub}>{lead.city}</div>}
                  </td>
                  <td>{lead.assignedTo?.name || "—"}</td>
                  <td>
                    <span className={styles.statusPill} style={{ borderColor: STATUS_COLORS[lead.status] }}>
                      <span className={styles.statusDot} style={{ background: STATUS_COLORS[lead.status] }} />
                      {lead.status}
                    </span>
                  </td>
                  <td>
                    {lead.interestLevel ? (
                      <span className={`${styles.interestPill} ${styles[INTEREST_CLASS[lead.interestLevel]]}`}>
                        {lead.interestLevel}
                      </span>
                    ) : "—"}
                  </td>
                  <td>{formatDate(lead.nextFollowUpDate)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className={styles.kebabWrap}>
                      <button className={styles.kebabButton} onClick={() => setOpenMenuId((p) => (p === lead._id ? null : lead._id))}>
                        <MoreVertical size={16} />
                      </button>
                      {openMenuId === lead._id && (
                        <>
                          <div className={styles.menuOverlay} onClick={() => setOpenMenuId(null)} />
                          <div className={styles.kebabMenu}>
                            <button className={styles.kebabMenuItem} onClick={() => { setOpenMenuId(null); handleRowClick(lead._id); }}>
                              <Eye size={14} /> View Details
                            </button>
                            {isDistributorOrAdmin && lead.status !== "Not Interested" && lead.status !== "Converted" && (
                              <button className={`${styles.kebabMenuItem} ${styles.kebabMenuDanger}`} onClick={() => handleMarkLost(lead._id)}>
                                <X size={14} /> Mark Not Interested
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageButton} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
          <button className={styles.pageButton} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}

      {/* Add Lead Modal — reuses Team Access's modal chrome */}
      {showModal && (
        <div className={modalStyles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.modalHeader}>
              <h2 className={modalStyles.modalTitle}>Add Lead</h2>
              <button className={modalStyles.modalClose} onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className={modalStyles.modalForm}>
              {formError && (
                <div className={modalStyles.formError}>
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}

              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Business Name</label>
                <input
                  type="text" name="businessName" value={formData.businessName} onChange={handleInputChange}
                  placeholder="e.g. Shreeji Plywood" className={modalStyles.formInput} required
                />
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Owner / Contact Name</label>
                <input
                  type="text" name="ownerName" value={formData.ownerName}
                  onChange={(e) => handleInputChange({ target: { name: "ownerName", value: sanitizeNameInput(e.target.value) } })}
                  placeholder="Enter owner's name" className={modalStyles.formInput} required
                />
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Phone Number</label>
                <input
                  type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                  placeholder="Enter 10-digit phone number" className={modalStyles.formInput}
                  inputMode="numeric" maxLength={10} required
                />
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>Email (optional)</label>
                <input
                  type="email" name="email" value={formData.email} onChange={handleInputChange}
                  placeholder="Enter email address" className={modalStyles.formInput}
                />
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>City</label>
                <input
                  type="text" name="city" value={formData.city} onChange={handleInputChange}
                  placeholder="City" className={modalStyles.formInput}
                />
              </div>
              <div className={modalStyles.formGroup}>
                <label className={modalStyles.formLabel}>State</label>
                <input
                  type="text" name="state" value={formData.state} onChange={handleInputChange}
                  placeholder="State" className={modalStyles.formInput}
                />
              </div>
              {isDistributorOrAdmin && executives.length > 0 && (
                <div className={modalStyles.formGroup}>
                  <label className={modalStyles.formLabel}>Assign To (optional)</label>
                  <select name="assignedTo" value={formData.assignedTo} onChange={handleInputChange} className={modalStyles.formInput}>
                    <option value="">Unassigned</option>
                    {executives.map((ex) => (
                      <option key={ex._id} value={ex._id}>{ex.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className={modalStyles.modalFooter}>
                <button type="button" className={modalStyles.cancelButton} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className={modalStyles.submitButton} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <LeadDetailDrawer isOpen={showDrawer} onClose={() => setShowDrawer(false)} leadId={selectedLeadId} />
    </div>
  );
}
