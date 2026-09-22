"use client";

import React, { useState } from "react";
import { UserPlus, Edit2, AlertCircle, X, MoreVertical, Eye, EyeOff, Power } from "lucide-react";
import {
  useSalesExecutivesQuery,
  useCreateSalesExecutiveMutation,
  useUpdateSalesExecutiveMutation,
} from "@/hooks/queries/useSalesExecutivesQuery";
import { sanitizeNameInput } from "@/lib/nameInput";
// Reuses Team Access's stylesheet — a Sales Executive is, structurally, the
// same "team member under me" concept as a Store_Manager/Store_Staff, just
// owned by a Distributor instead of a Merchant. Same cards, modal, and form
// styling keeps this feeling like part of the same application.
import styles from "@/app/(dashboard)/team/team.module.css";
import { SkeletonCardList } from "@/components/ui/SkeletonCard";
import { SALES_EXECUTIVE_ENABLED } from "@/lib/featureFlags";
import { notFound } from "next/navigation";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The real page. Left completely intact — it is only unreachable while the
// feature is hidden.
function SalesExecutivesPageInner() {
  const { data, isPending: loading } = useSalesExecutivesQuery();
  const executives = data?.executives || [];

  const createMutation = useCreateSalesExecutiveMutation();
  const updateMutation = useUpdateSalesExecutiveMutation();

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExec, setEditingExec] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", territory: "", password: "", confirmPassword: "" });
  const [editFormData, setEditFormData] = useState({ name: "", email: "", phone: "", territory: "" });
  const [formError, setFormError] = useState(null);
  const [editFormError, setEditFormError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const submitting = createMutation.isPending || updateMutation.isPending;

  const formatDate = (date) => {
    if (!date) return "Never";
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  };

  const getInitials = (name) => name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?";

  const openCreateModal = () => {
    setFormData({ name: "", email: "", phone: "", territory: "", password: "", confirmPassword: "" });
    setFormError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
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

    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      setFormError("Name, email, phone, and password are required");
      return;
    }
    if (formData.phone.length !== 10) {
      setFormError("Phone number must be exactly 10 digits");
      return;
    }
    if (!EMAIL_PATTERN.test(formData.email)) {
      setFormError("Please enter a valid email address");
      return;
    }
    if (formData.password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }

    try {
      await createMutation.mutateAsync(formData);
      setShowModal(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const toggleMenu = (id) => setOpenMenuId((prev) => (prev === id ? null : id));

  const handleEditClick = (exec) => {
    setOpenMenuId(null);
    setEditingExec(exec);
    setEditFormData({ name: exec.name, email: exec.email, phone: exec.phone, territory: exec.territory || "" });
    setEditFormError(null);
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setEditFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setEditFormError(null);

    if (!editFormData.name || !editFormData.email || !editFormData.phone) {
      setEditFormError("All fields are required");
      return;
    }
    if (editFormData.phone.length !== 10) {
      setEditFormError("Phone number must be exactly 10 digits");
      return;
    }
    if (!EMAIL_PATTERN.test(editFormData.email)) {
      setEditFormError("Please enter a valid email address");
      return;
    }

    try {
      await updateMutation.mutateAsync({ executiveId: editingExec._id, ...editFormData });
      setShowEditModal(false);
      setEditingExec(null);
    } catch (err) {
      setEditFormError(err.message);
    }
  };

  const handleToggleStatus = async (exec) => {
    setOpenMenuId(null);
    const nextStatus = exec.status === "deactivated" ? "active" : "deactivated";
    try {
      await updateMutation.mutateAsync({ executiveId: exec._id, status: nextStatus });
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };


  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.pageTitle}>Sales Team</h1>
          <p className={styles.pageSubtitle}>Manage your sales executives and track their lead performance</p>
        </div>
        {executives.length > 0 && (
          <div className={styles.headerActions}>
            <button className={styles.inviteButton} onClick={openCreateModal}>
              <UserPlus size={18} />
              Add Sales Executive
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className={styles.memberList}>
          <SkeletonCardList count={3} lines={2} />
        </div>
      ) : executives.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>🧑‍💼</div>
          <h3 className={styles.emptyStateTitle}>No sales executives yet</h3>
          <p className={styles.emptyStateDescription}>
            Add a sales executive to start assigning leads and tracking demo/conversion performance.
          </p>
          <button className={styles.emptyStateButton} onClick={openCreateModal}>
            <UserPlus size={18} />
            Add Your First Sales Executive
          </button>
        </div>
      ) : (
        <div className={styles.memberList}>
          {executives.map((exec) => (
            <div key={exec._id} className={styles.memberCard}>
              <div className={styles.memberInfo}>
                <div className={styles.memberAvatar}>{getInitials(exec.name)}</div>
                <div className={styles.memberDetails}>
                  <div className={styles.memberName}>{exec.name}</div>
                  <div className={styles.memberRole}>
                    {exec.territory || "No territory set"}
                    {exec.status === "deactivated" && (
                      <span className={`${styles.statusBadge} ${styles.inactive}`} style={{ marginLeft: 8 }}>
                        Deactivated
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.memberMeta}>
                <span className={styles.memberScanCount} title="Leads assigned to this executive">
                  {exec.leadsAssigned} lead{exec.leadsAssigned === 1 ? "" : "s"}
                </span>
                <span className={styles.memberScanCount} title="Demos scheduled">
                  {exec.demosScheduled} demo{exec.demosScheduled === 1 ? "" : "s"}
                </span>
                <span className={styles.memberScanCount} title="Retailers converted">
                  {exec.plansSold} converted · {exec.conversionRate}%
                </span>
                <span className={styles.memberLastLogin}>Last login: {formatDate(exec.lastLoginAt)}</span>
              </div>

              <div className={styles.memberMenuWrap}>
                <button className={styles.kebabButton} title="More options" onClick={() => toggleMenu(exec._id)}>
                  <MoreVertical size={18} />
                </button>
                {openMenuId === exec._id && (
                  <>
                    <div className={styles.menuOverlay} onClick={() => setOpenMenuId(null)} />
                    <div className={styles.kebabMenu}>
                      <button className={styles.kebabMenuItem} onClick={() => handleEditClick(exec)}>
                        <Edit2 size={14} /> Edit
                      </button>
                      <button className={styles.kebabMenuItem} onClick={() => handleToggleStatus(exec)}>
                        <Power size={14} /> {exec.status === "deactivated" ? "Activate" : "Deactivate"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Sales Executive Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add Sales Executive</h2>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreate} className={styles.modalForm}>
              {formError && (
                <div className={styles.formError}>
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="se-name" className={styles.formLabel}>Full Name</label>
                <input
                  type="text" id="se-name" name="name" value={formData.name}
                  onChange={(e) => handleInputChange({ target: { name: "name", value: sanitizeNameInput(e.target.value) } })}
                  placeholder="Enter full name" className={styles.formInput} required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="se-phone" className={styles.formLabel}>Phone Number</label>
                <input
                  type="tel" id="se-phone" name="phone" value={formData.phone} onChange={handleInputChange}
                  placeholder="Enter 10-digit phone number" className={styles.formInput}
                  inputMode="numeric" maxLength={10} required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="se-email" className={styles.formLabel}>Email Address</label>
                <input
                  type="email" id="se-email" name="email" value={formData.email} onChange={handleInputChange}
                  placeholder="Enter email address" className={styles.formInput} required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="se-territory" className={styles.formLabel}>Assigned Area / Territory (optional)</label>
                <input
                  type="text" id="se-territory" name="territory" value={formData.territory} onChange={handleInputChange}
                  placeholder="e.g. North Delhi, Gurgaon" className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="se-password" className={styles.formLabel}>Password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="se-password" name="password" value={formData.password} onChange={handleInputChange}
                    placeholder="Enter password (min 6 characters)" className={styles.formInput} required
                  />
                  <button type="button" className={styles.eyeBtn} tabIndex={-1} onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="se-confirmPassword" className={styles.formLabel}>Confirm Password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="se-confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange}
                    placeholder="Re-enter password" className={styles.formInput} required
                  />
                  <button type="button" className={styles.eyeBtn} tabIndex={-1} onClick={() => setShowConfirmPassword((v) => !v)}>
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className={styles.submitButton} disabled={submitting}>
                  {submitting ? "Adding..." : "Add Sales Executive"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sales Executive Modal */}
      {showEditModal && editingExec && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Sales Executive</h2>
              <button className={styles.modalClose} onClick={() => setShowEditModal(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className={styles.modalForm}>
              {editFormError && (
                <div className={styles.formError}>
                  <AlertCircle size={16} />
                  {editFormError}
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="edit-se-name" className={styles.formLabel}>Full Name</label>
                <input
                  type="text" id="edit-se-name" name="name" value={editFormData.name}
                  onChange={(e) => handleEditInputChange({ target: { name: "name", value: sanitizeNameInput(e.target.value) } })}
                  placeholder="Enter full name" className={styles.formInput} required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-se-email" className={styles.formLabel}>Email Address</label>
                <input
                  type="email" id="edit-se-email" name="email" value={editFormData.email} onChange={handleEditInputChange}
                  placeholder="Enter email address" className={styles.formInput} required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-se-phone" className={styles.formLabel}>Phone Number</label>
                <input
                  type="tel" id="edit-se-phone" name="phone" value={editFormData.phone} onChange={handleEditInputChange}
                  placeholder="Enter 10-digit phone number" className={styles.formInput}
                  inputMode="numeric" maxLength={10} required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-se-territory" className={styles.formLabel}>Assigned Area / Territory</label>
                <input
                  type="text" id="edit-se-territory" name="territory" value={editFormData.territory} onChange={handleEditInputChange}
                  placeholder="e.g. North Delhi, Gurgaon" className={styles.formInput}
                />
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className={styles.submitButton} disabled={submitting}>
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Hidden while the Sales Executive feature is unfinished. The nav entry is
// gone, so this only catches someone hitting /sales-executives directly.
// A wrapper rather than an early return inside the page, so the hooks below
// stay unconditional. Flip SALES_EXECUTIVE_ENABLED to bring it all back.
export default function SalesExecutivesPage() {
  if (!SALES_EXECUTIVE_ENABLED) return notFound();
  return <SalesExecutivesPageInner />;
}
