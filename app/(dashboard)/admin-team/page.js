"use client";

import React, { useState } from "react";
import { Users, Plus, X, AlertCircle, ShieldCheck } from "lucide-react";
import { ADMIN_ROLES } from "@/lib/adminPermissions";
import {
  useAdminTeamQuery,
  useInviteTeamMemberMutation,
  useUpdateTeamMemberMutation,
} from "@/hooks/queries/useAdminTeamQuery";
import styles from "./admin-team.module.css";

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function InviteModal({ onClose }) {
  const inviteMutation = useInviteTeamMemberMutation();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", adminRole: ADMIN_ROLES[0] });
  const [formError, setFormError] = useState("");

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.email || !form.password) {
      setFormError("Name, email and password are required");
      return;
    }
    if (form.password.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }
    try {
      await inviteMutation.mutateAsync(form);
      onClose();
    } catch (err) {
      setFormError(err.message || "Failed to invite team member");
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Invite Team Member</h3>
          <button className={styles.modalClose} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {formError && (
              <div className={styles.formError}>{formError}</div>
            )}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Full Name</label>
              <input
                className={styles.formInput}
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Priya Sharma"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email</label>
              <input
                type="email"
                className={styles.formInput}
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="priya@scratchx.in"
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Phone</label>
                <input
                  className={styles.formInput}
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="9876543210"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Admin Role</label>
                <select
                  className={styles.formSelect}
                  value={form.adminRole}
                  onChange={(e) => handleChange("adminRole", e.target.value)}
                >
                  {ADMIN_ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Temporary Password</label>
              <input
                type="password"
                className={styles.formInput}
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="At least 8 characters"
              />
              <span className={styles.formHint}>Share this with the team member securely — they can change it after logging in.</span>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitButton} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Inviting..." : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminTeamPage() {
  const { data: members, isLoading, isError, refetch } = useAdminTeamQuery();
  const updateMutation = useUpdateTeamMemberMutation();
  const [showInviteModal, setShowInviteModal] = useState(false);

  function toggleStatus(member) {
    const nextStatus = member.status === "suspended" ? "active" : "suspended";
    updateMutation.mutate({ id: member._id, status: nextStatus });
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Team &amp; Roles</h1>
            <p>Manage internal admin staff and their module permissions</p>
          </div>
          <button className={styles.primaryButton} onClick={() => setShowInviteModal(true)}>
            <Plus size={18} />
            Invite Team Member
          </button>
        </div>

        <div className={styles.roleNote}>
          <ShieldCheck size={16} />
          Internal Admin accounts are scoped by role (Finance, Support, Sales, Operations, Analyst) — each role&apos;s module access is enforced on the backend, not just hidden in the UI.
        </div>

        {isError ? (
          <div className={styles.errorState}>
            <AlertCircle size={40} />
            <p>Failed to load team members</p>
            <button className={styles.retryButton} onClick={() => refetch()}>Retry</button>
          </div>
        ) : (
          <div className={styles.tableSection}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className={styles.emptyState}>Loading team members...</td></tr>
                ) : !members || members.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyState}>
                      <Users size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <div>No internal team members yet</div>
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member._id}>
                      <td>
                        <div className={styles.memberInfo}>
                          <div className={styles.avatar}>{initials(member.name)}</div>
                          <div>
                            <p className={styles.name}>{member.name}</p>
                            <p className={styles.email}>{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className={styles.roleBadge}>{member.profile?.adminRole || "—"}</span></td>
                      <td>{member.phone || "—"}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[`badge-${member.status}`] || ""}`}>
                          {member.status}
                        </span>
                      </td>
                      <td>{formatDate(member.createdAt)}</td>
                      <td>
                        <button
                          className={`${styles.statusToggleBtn} ${member.status === "suspended" ? styles.activate : styles.suspend}`}
                          onClick={() => toggleStatus(member)}
                          disabled={updateMutation.isPending}
                        >
                          {member.status === "suspended" ? "Reactivate" : "Suspend"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInviteModal && <InviteModal onClose={() => setShowInviteModal(false)} />}
    </div>
  );
}
