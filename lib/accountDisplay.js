/** Human-readable display name from account fields. */
export function getAccountDisplayName(account) {
  if (!account) return 'Your Name';

  if (account.firstName || account.lastName) {
    return [account.firstName, account.lastName].filter(Boolean).join(' ');
  }

  return account.name || account.email || 'Your Name';
}

/** Two-letter initials for avatar. */
export function getAccountInitials(account) {
  const name = getAccountDisplayName(account);
  if (!name || name === 'Your Name') return 'SX';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
