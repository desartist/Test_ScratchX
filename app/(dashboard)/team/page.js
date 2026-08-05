"use client";

import React, { useState } from "react";
import { UserPlus, Edit2, Trash2, AlertCircle, X, CreditCard, MoreVertical, Eye, EyeOff } from "lucide-react";
import { useAuthContext } from "@/components/auth/AuthContext";
import { useStoresQuery } from "@/hooks/queries/useStoresQuery";
import {
  useTeamMembersQuery,
  useCreateTeamMemberMutation,
  useUpdateTeamMemberMutation,
  useDeleteTeamMemberMutation,
  useOwnSeatRequestsQuery,
  useRequestTeamSeatMutation,
} from "@/hooks/queries/useTeamMembersQuery";
import TeamEmptyState from "@/components/team/TeamEmptyState";
import styles from "./team.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_LABELS = { Store_Manager: "Store Manager", Store_Staff: "Store Staff", Manager: "Manager" };
const PLAN_LABELS = { CORE: "Core", SMART: "Smart" };
const BUSINESS_MODEL_LABELS = { Retail: "Retailer", Wholesale: "Wholesaler" };

export default function TeamPage() {
  const { account } = useAuthContext();
  const businessModel = account?.profile?.businessModel;
  const activePlan = account?.activePlan;

  const { data: storesData, isPending: storesLoading } = useStoresQuery();
  const stores = storesData?.data || [];
  const [selectedStoreIdOverride, setSelectedStoreId] = useState(null);
  // Defaults to the first store until the user explicitly picks another —
  // derived during render instead of synced via effect, since stores load
  // asynchronously and there's nothing to clean up here.
  const selectedStoreId = selectedStoreIdOverride || stores[0]?._id || null;

  const { data, isPending: loading } = useTeamMembersQuery(selectedStoreId);
  const teamMembers = data?.members || [];
  const limitStatus = data?.limitStatus || null;

  // The Add Team Member modal can target a different store than the one the
  // page is currently showing, so it needs its own store selection + limits.
  const [modalStoreId, setModalStoreId] = useState(null);
  const { data: modalData } = useTeamMembersQuery(modalStoreId);
  const modalLimitStatus = modalData?.limitStatus || null;

  const { data: ownSeatRequests } = useOwnSeatRequestsQuery(selectedStoreId);
  const pendingRequestForRole = (role) =>
    (ownSeatRequests || []).find((r) => r.role === role && r.status === "pending");

  const createMemberMutation = useCreateTeamMemberMutation();
  const updateMemberMutation = useUpdateTeamMemberMutation();
  const deleteMemberMutation = useDeleteTeamMemberMutation();
  const requestSeatMutation = useRequestTeamSeatMutation();

  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "Store_Staff",
  });
  const [editFormData, setEditFormData] = useState({ name: "", email: "", phone: "" });
  const [formError, setFormError] = useState(null);
  const [editFormError, setEditFormError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingMember, setViewingMember] = useState(null);

  const [showRequestSeatModal, setShowRequestSeatModal] = useState(false);
  const [requestSeatRole, setRequestSeatRole] = useState("Store_Staff");
  const [requestSeatError, setRequestSeatError] = useState(null);
  const [requestSeatSuccess, setRequestSeatSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const submitting = createMemberMutation.isPending || updateMemberMutation.isPending;
  const deleting = deleteMemberMutation.isPending ? memberToDelete?._id : null;

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

  const getInitials = (name) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?";

  const openCreateModal = () => {
    setFormData({ name: "", email: "", phone: "", password: "", confirmPassword: "", role: "Store_Staff" });
    setModalStoreId(selectedStoreId);
    setFormError(null);
    setModalStep(1);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Indian mobile numbers are exactly 10 digits — strip anything else as it's typed.
    const nextValue = name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleContinueToStep2 = () => {
    setFormError(null);
    if (!formData.name || !formData.phone || !formData.email) {
      setFormError("Full name, phone number, and email address are required");
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
    setModalStep(2);
  };

  const handleCreateTeamMember = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!modalStoreId) {
      setFormError("Select a store");
      return;
    }
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      setFormError("All fields are required");
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
      await createMemberMutation.mutateAsync({ ...formData, storeId: modalStoreId });
      setSelectedStoreId(modalStoreId);
      setShowModal(false);
      setModalStep(1);
      setFormData({ name: "", email: "", phone: "", password: "", confirmPassword: "", role: "Store_Staff" });
    } catch (err) {
      setFormError(err.message);
    }
  };

  const toggleMemberMenu = (memberId) => {
    setOpenMenuId((prev) => (prev === memberId ? null : memberId));
  };

  const handleViewClick = (member) => {
    setOpenMenuId(null);
    setViewingMember(member);
    setShowViewModal(true);
  };

  const handleEditClick = (member) => {
    setOpenMenuId(null);
    setEditingMember(member);
    setEditFormData({ name: member.name, email: member.email, phone: member.phone });
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setEditFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleUpdateTeamMember = async (e) => {
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
      await updateMemberMutation.mutateAsync({ memberId: editingMember._id, ...editFormData });
      setShowEditModal(false);
      setEditingMember(null);
    } catch (err) {
      setEditFormError(err.message);
    }
  };

  const handleDeleteClick = (member) => {
    setOpenMenuId(null);
    setMemberToDelete(member);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    const memberId = memberToDelete._id;
    setShowDeleteConfirm(false);
    try {
      await deleteMemberMutation.mutateAsync(memberId);
      setMemberToDelete(null);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const openRequestSeatModal = (role) => {
    setRequestSeatRole(role);
    setRequestSeatError(null);
    setRequestSeatSuccess(false);
    setShowRequestSeatModal(true);
  };

  const handleRequestSeat = async () => {
    setRequestSeatError(null);
    try {
      await requestSeatMutation.mutateAsync({ storeId: selectedStoreId, role: requestSeatRole, quantity: 1 });
      setRequestSeatSuccess(true);
    } catch (err) {
      setRequestSeatError(err.message);
    }
  };

  if (loading || storesLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Loading team...</p>
        </div>
      </div>
    );
  }

  const currentStoreName = stores.find((s) => s._id === selectedStoreId)?.store_name;

  if (stores.length > 0 && teamMembers.length === 0) {
    return (
      <div className={styles.container}>
        <TeamEmptyState storeName={currentStoreName} onAddClick={openCreateModal} />
        {renderModals()}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.pageTitle}>Team Access</h1>
          <p className={styles.pageSubtitle}>
            Manage store managers and staff
            {/* {businessModel && activePlan && (
              <> · {BUSINESS_MODEL_LABELS[businessModel] || businessModel} · {PLAN_LABELS[activePlan] || activePlan} plan</>
            )} */}
          </p>
        </div>
        {stores.length > 0 && (
          <div className={styles.headerActions}>
            <button className={styles.inviteButton} onClick={openCreateModal}>
              <UserPlus size={18} />
              Add Team Member
            </button>
          </div>
        )}
      </div>

      {stores.length === 0 ? (
        <div className={styles.tableSection}>
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>🏬</div>
            <h3 className={styles.emptyStateTitle}>Create a store first</h3>
            <p className={styles.emptyStateDescription}>
              Team members are assigned to a specific store — add your store before inviting Staff or Managers.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Store selector */}
          {/* <div className={styles.formGroup} style={{ maxWidth: 320, marginBottom: 24 }}>
            <label className={styles.formLabel}>Store</label>
            <select
              className={styles.formInput}
              value={selectedStoreId || ""}
              onChange={(e) => setSelectedStoreId(e.target.value)}
            >
              {stores.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.store_name}
                </option>
              ))}
            </select>
          </div> */}

          {/* Usage Stats — one combined card, not three peer-level ones, since
              Managers/Staff/Total aren't independent budgets (they sum to Total). */}
          {limitStatus && (
            <div className={styles.teamStatCard}>
              <div className={styles.statValue}>
                {limitStatus.totalCount}/{limitStatus.maxTotal}
              </div>
              <div className={styles.statLabel}>Team Seats Used</div>
              <div className={styles.teamStatBreakdown}>
                {limitStatus.managerCount}/{limitStatus.maxManagers} Manager ·{" "}
                {limitStatus.staffCount} Staff
              </div>
            </div>
          )}

          {/* Limit reached banner — this is specifically about total seat
              capacity (buyable via an extra seat), not the fixed 1-Manager
              rule, which has no "buy more" path and is instead surfaced
              inline on the disabled Manager button in the Add modal. */}
          {limitStatus && !limitStatus.canAddStaff && (
            <div className={styles.planLimitCard}>
              <div className={styles.planLimitIcon}>
                <AlertCircle size={24} />
              </div>
              <div className={styles.planLimitContent}>
                <h3 className={styles.planLimitTitle}>Team seat limit reached</h3>
                <p className={styles.planLimitDescription}>
                  This store is at its {PLAN_LABELS[activePlan] || activePlan} plan limit of {limitStatus.maxTotal}{" "}
                  team seat{limitStatus.maxTotal === 1 ? "" : "s"} total (max {limitStatus.maxManagers} Manager, rest
                  Staff). Request an extra seat (₹{limitStatus.extraSeatPriceINR}, collected by your distributor) to
                  add more.
                </p>
                {pendingRequestForRole("Store_Manager") || pendingRequestForRole("Store_Staff") ? (
                  <span className={styles.roleOptionHint}>Seat request pending with distributor</span>
                ) : (
                  <button className={styles.upgradeLink} onClick={() => openRequestSeatModal("Store_Staff")}>
                    <CreditCard size={16} /> Request Extra Seat
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Team Members List */}
          <div className={styles.memberList}>
            {teamMembers.map((member) => (
              <div key={member._id} className={styles.memberCard}>
                <div className={styles.memberInfo}>
                  <div className={styles.memberAvatar}>{getInitials(member.name)}</div>
                  <div className={styles.memberDetails}>
                    <div className={styles.memberName}>{member.name}</div>
                    <div className={styles.memberRole}>{ROLE_LABELS[member.role] || member.role}</div>
                  </div>
                </div>

                <div className={styles.memberMeta}>
                  {/* <span className={`${styles.statusBadge} ${styles[member.status]}`}>
                    {member.status === "active" ? "✓" : ""}
                    {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                  </span> */}
                  <span className={styles.memberLastLogin}>Last login: {formatDate(member.lastLoginAt)}</span>
                </div>

                <div className={styles.memberMenuWrap}>
                  <button
                    className={styles.kebabButton}
                    title="More options"
                    onClick={() => toggleMemberMenu(member._id)}
                  >
                    <MoreVertical size={18} />
                  </button>
                  {openMenuId === member._id && (
                    <>
                      <div className={styles.menuOverlay} onClick={() => setOpenMenuId(null)} />
                      <div className={styles.kebabMenu}>
                        <button className={styles.kebabMenuItem} onClick={() => handleViewClick(member)}>
                          <Eye size={14} /> View
                        </button>
                        <button className={styles.kebabMenuItem} onClick={() => handleEditClick(member)}>
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          className={`${styles.kebabMenuItem} ${styles.kebabMenuDanger}`}
                          disabled={deleting === member._id}
                          onClick={() => handleDeleteClick(member)}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {renderModals()}
    </div>
  );

  function renderModals() {
    return (
      <>

      {/* Add Team Member Modal — 2-step wizard: details, then access & login */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {modalStep === 1 ? "Team Member Details" : "Team Member Details" }
              </h2>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>

            {formError && (
              <div className={styles.formError} style={{ margin: "0 24px" }}>
                <AlertCircle size={16} />
                {formError}
              </div>
            )}

            {modalStep === 1 ? (
              
              <div className={styles.modalForm}>
                
                <div className={styles.formGroup}>
                  <div className={styles.para}><p>Team Member Details</p></div>
                  <label htmlFor="name" className={styles.formLabel}>Full Name</label>
                  <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange}
                    placeholder="Enter full name" className={styles.formInput} required />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="phone" className={styles.formLabel}>Phone Number</label>
                  <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange}
                    placeholder="Enter 10-digit phone number" className={styles.formInput}
                    inputMode="numeric" maxLength={10} required />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email" className={styles.formLabel}>Email Address</label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange}
                    placeholder="Enter email address" className={styles.formInput} required />
                </div>

                <div className={styles.modalFooter}>
                  <button type="button" className={styles.cancelButton} onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="button" className={styles.submitButton} onClick={handleContinueToStep2}>
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateTeamMember} className={styles.modalForm}>
                
                <div className={styles.formGroup}>
                  <div className={styles.para}><p>Access & Login Details</p></div>
                  <label htmlFor="team-store" className={styles.formLabel}>Assign Store</label>
                  <select
                    id="team-store"
                    className={styles.formInput}
                    value={modalStoreId || ""}
                    onChange={(e) => setModalStoreId(e.target.value)}
                  >
                    {stores.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.store_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Role</label>
                  <div className={styles.roleOptionsRow}>
                    {["Store_Manager", "Store_Staff"].map((r) => {
                      const disabled = r === "Store_Manager" ? !modalLimitStatus?.canAddManager : !modalLimitStatus?.canAddStaff;
                      const active = formData.role === r;
                      return (
                        <button
                          type="button"
                          key={r}
                          disabled={disabled}
                          className={`${styles.roleOption} ${active ? styles.roleOptionActive : ""} ${
                            disabled ? styles.roleOptionDisabled : ""
                          }`}
                          onClick={() => setFormData((prev) => ({ ...prev, role: r }))}
                        >
                          {ROLE_LABELS[r]}
                          {disabled && <span className={styles.roleOptionHint}>Limit reached</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="password" className={styles.formLabel}>Password</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password" name="password" value={formData.password} onChange={handleInputChange}
                      placeholder="Enter password (min 6 characters)" className={styles.formInput} required
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="confirmPassword" className={styles.formLabel}>Confirm Password</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange}
                      placeholder="Re-enter password" className={styles.formInput} required
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button type="button" className={styles.cancelButton} onClick={() => setModalStep(1)}>Back</button>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={
                      submitting ||
                      !modalStoreId ||
                      (formData.role === "Store_Manager" ? !modalLimitStatus?.canAddManager : !modalLimitStatus?.canAddStaff)
                    }
                  >
                    {submitting ? "Creating..." : "Create & Send Invite"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Team Member Modal */}
      {showEditModal && editingMember && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Team Member</h2>
              <button className={styles.modalClose} onClick={() => setShowEditModal(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateTeamMember} className={styles.modalForm}>
              {editFormError && (
                <div className={styles.formError}>
                  <AlertCircle size={16} />
                  {editFormError}
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="edit-name" className={styles.formLabel}>Full Name</label>
                <input type="text" id="edit-name" name="name" value={editFormData.name} onChange={handleEditInputChange}
                  placeholder="Enter full name" className={styles.formInput} required />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-email" className={styles.formLabel}>Email Address</label>
                <input type="email" id="edit-email" name="email" value={editFormData.email} onChange={handleEditInputChange}
                  placeholder="Enter email address" className={styles.formInput} required />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-phone" className={styles.formLabel}>Phone Number</label>
                <input type="tel" id="edit-phone" name="phone" value={editFormData.phone} onChange={handleEditInputChange}
                  placeholder="Enter 10-digit phone number" className={styles.formInput}
                  inputMode="numeric" maxLength={10} required />
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className={styles.submitButton} disabled={submitting}>
                  {submitting ? "Updating..." : "Update Team Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Team Member Modal */}
      {showViewModal && viewingMember && (
        <div className={styles.modalOverlay} onClick={() => setShowViewModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Team Member Details</h2>
              <button className={styles.modalClose} onClick={() => setShowViewModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalForm}>
              <div className={styles.viewProfile}>
                <div className={styles.memberAvatar}>{getInitials(viewingMember.name)}</div>
                <div>
                  <div className={styles.memberName}>{viewingMember.name}</div>
                  <div className={styles.memberRole}>{ROLE_LABELS[viewingMember.role] || viewingMember.role}</div>
                </div>
              </div>

              <div className={styles.viewRow}>
                <span>Email Address</span>
                <strong>{viewingMember.email}</strong>
              </div>
              <div className={styles.viewRow}>
                <span>Phone Number</span>
                <strong>{viewingMember.phone || "—"}</strong>
              </div>
              <div className={styles.viewRow}>
                <span>Status</span>
                <strong className={styles.viewRowStatus}>
                  <span className={`${styles.statusBadge} ${styles[viewingMember.status]}`}>
                    {viewingMember.status.charAt(0).toUpperCase() + viewingMember.status.slice(1)}
                  </span>
                </strong>
              </div>
              <div className={styles.viewRow}>
                <span>Last Login</span>
                <strong>{formatDate(viewingMember.lastLoginAt)}</strong>
              </div>
              <div className={styles.viewRow}>
                <span>Added On</span>
                <strong>{formatDate(viewingMember.createdAt)}</strong>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelButton} onClick={() => setShowViewModal(false)}>
                Close
              </button>
              <button
                type="button"
                className={styles.submitButton}
                onClick={() => {
                  setShowViewModal(false);
                  handleEditClick(viewingMember);
                }}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && memberToDelete && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIcon}>
              <AlertCircle size={48} />
            </div>
            <h2 className={styles.confirmTitle}>Delete Team Member?</h2>
            <p className={styles.confirmMessage}>
              Are you sure you want to delete <strong>{memberToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className={styles.confirmFooter}>
              <button className={styles.confirmCancelBtn} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button
                className={styles.confirmDeleteBtn}
                onClick={handleConfirmDelete}
                disabled={deleting === memberToDelete._id}
              >
                {deleting === memberToDelete._id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Extra Seat Modal — no payment here; the distributor collects it manually */}
      {showRequestSeatModal && limitStatus && (
        <div className={styles.modalOverlay} onClick={() => setShowRequestSeatModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Request Extra Team Seat</h2>
              <button className={styles.modalClose} onClick={() => setShowRequestSeatModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className={styles.modalForm}>
              {requestSeatError && (
                <div className={styles.formError}>
                  <AlertCircle size={16} />
                  {requestSeatError}
                </div>
              )}
              {requestSeatSuccess ? (
                <p style={{ fontSize: 14, color: "#0a7d3d", lineHeight: 1.6 }}>
                  Request sent. Your distributor will collect ₹{limitStatus.extraSeatPriceINR} and activate the seat
                  from their panel — you&apos;ll be notified once it&apos;s active.
                </p>
              ) : (
                <>
                  <p style={{ fontSize: 14, color: "#637080", lineHeight: 1.6, marginBottom: 20 }}>
                    This sends a request to your distributor for one extra team seat on this store — usable for a
                    Manager or a Staff member, whichever you need. They&apos;ll collect payment from you directly and
                    activate it — no online payment here.
                  </p>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>This seat is for a</label>
                    <div className={styles.roleOptionsRow}>
                      {["Store_Manager", "Store_Staff"].map((r) => (
                        <button
                          type="button"
                          key={r}
                          className={`${styles.roleOption} ${requestSeatRole === r ? styles.roleOptionActive : ""}`}
                          onClick={() => setRequestSeatRole(r)}
                        >
                          {ROLE_LABELS[r]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.buySeatPriceBox}>
                    <span>1 extra seat (collected by distributor)</span>
                    <span className={styles.buySeatPrice}>₹{limitStatus.extraSeatPriceINR}</span>
                  </div>
                </>
              )}
            </div>
            <div className={styles.modalFooter}>
              {requestSeatSuccess ? (
                <button type="button" className={styles.submitButton} onClick={() => setShowRequestSeatModal(false)}>
                  Done
                </button>
              ) : (
                <>
                  <button type="button" className={styles.cancelButton} onClick={() => setShowRequestSeatModal(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.submitButton}
                    onClick={handleRequestSeat}
                    disabled={requestSeatMutation.isPending}
                  >
                    {requestSeatMutation.isPending ? "Sending..." : "Send Request"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </>
    );
  }
}
