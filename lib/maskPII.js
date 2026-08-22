// Shared PII masking for Super Admin customer-facing views (Customers, QR &
// Redemptions modules) — customer identity is never exposed in full to the
// platform admin by default, only to the merchant who owns the relationship.

export function maskName(name) {
  if (!name) return "—";
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0];
  if (parts.length === 1) return `${first.slice(0, 3)}${"*".repeat(Math.max(2, first.length - 3))}`;
  return `${first} ${"*".repeat(4)}`;
}

export function maskMobile(mobile) {
  if (!mobile) return "—";
  const digits = String(mobile).replace(/\D/g, "");
  if (digits.length <= 4) return "*".repeat(digits.length);
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}
