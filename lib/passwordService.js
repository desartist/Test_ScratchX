import bcrypt from 'bcrypt';
import Account from '@/models/accountModel';
import { validatePasswordPolicy } from '@/lib/passwordUtils';

const BCRYPT_ROUNDS = 10;
const PASSWORD_HISTORY_LIMIT = 3; // Can't reuse last 3 passwords

class PasswordService {
  /**
   * Hash a password with bcrypt
   */
  async hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Compare plain password with hash
   */
  async comparePassword(password, hash) {
    if (!password || !hash) {
      return false;
    }
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password against policy
   */
  validatePasswordPolicy(password) {
    return validatePasswordPolicy(password);
  }

  /**
   * Update account password with validation & history tracking
   */
  async updatePassword(accountId, currentPassword, newPassword) {
    const account = await Account.findById(accountId).select('+password');

    if (!account) {
      throw new Error('Account not found');
    }

    // Verify current password
    if (!account.password) {
      throw new Error('Account has no password set');
    }

    const isValid = await this.comparePassword(currentPassword, account.password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password policy
    const validation = this.validatePasswordPolicy(newPassword);
    if (!validation.isValid) {
      throw new Error(`Password policy violation: ${validation.errors.join(', ')}`);
    }

    // Check password history - prevent reusing recent passwords
    const newHash = await this.hashPassword(newPassword);

    if (account.passwordHistory && account.passwordHistory.length > 0) {
      const recentHashes = account.passwordHistory
        .slice(-PASSWORD_HISTORY_LIMIT)
        .map((h) => h.hash);

      for (const oldHash of recentHashes) {
        const isSameAsOld = await bcrypt.compare(newPassword, oldHash);
        if (isSameAsOld) {
          throw new Error(
            `Password was recently used. Choose a different password.`
          );
        }
      }
    }

    // Update password & history
    if (!account.passwordHistory) {
      account.passwordHistory = [];
    }

    account.passwordHistory.push({
      hash: account.password,
      changedAt: new Date(),
    });

    // Keep only last 5 in history
    if (account.passwordHistory.length > 5) {
      account.passwordHistory = account.passwordHistory.slice(-5);
    }

    account.password = newHash;
    account.passwordChangedAt = new Date();

    await account.save();

    return {
      message: 'Password updated successfully',
      changedAt: account.passwordChangedAt,
    };
  }

  /**
   * Set password for new account
   */
  async setPassword(accountId, newPassword) {
    const account = await Account.findById(accountId);

    if (!account) {
      throw new Error('Account not found');
    }

    // Validate policy
    const validation = this.validatePasswordPolicy(newPassword);
    if (!validation.isValid) {
      throw new Error(`Password policy violation: ${validation.errors.join(', ')}`);
    }

    // Hash and save
    account.password = await this.hashPassword(newPassword);
    account.passwordChangedAt = new Date();

    await account.save();

    return {
      message: 'Password set successfully',
    };
  }

  /**
   * Verify password is correct
   */
  async verifyPassword(accountId, password) {
    const account = await Account.findById(accountId).select('+password');

    if (!account || !account.password) {
      return false;
    }

    return this.comparePassword(password, account.password);
  }
}

export default new PasswordService();
