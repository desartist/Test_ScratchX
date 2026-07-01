import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import Account from '@/models/accountModel';
import PasswordResetToken from '@/models/passwordResetTokenModel';
import passwordService from '@/lib/passwordService';
import jwtService from '@/lib/jwtService';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;

export async function POST(request) {
  try {
    await connectDB();

    const { token, newPassword, confirmPassword } = await request.json();

    if (!token || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Token and password fields are required' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwtService.verifyToken(token);
      if (decoded.type !== 'password_reset') {
        return NextResponse.json(
          { error: 'Invalid or expired reset token' },
          { status: 401 }
        );
      }
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 401 }
      );
    }

    // Find reset token record
    const resetTokenRecord = await PasswordResetToken.findOne({ token });
    if (!resetTokenRecord || resetTokenRecord.usedAt) {
      return NextResponse.json(
        { error: 'Reset token has already been used' },
        { status: 400 }
      );
    }

    if (new Date() > resetTokenRecord.expiresAt) {
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 401 }
      );
    }

    // Find account
    const account = await Account.findById(decoded.accountId).select('+password');
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Validate new password policy
    const validation = passwordService.validatePasswordPolicy(newPassword);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: `Password requirements: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    // Check password not reused from history
    const passwordHistory = account.passwordHistory || [];
    for (const oldHash of passwordHistory) {
      const matches = await passwordService.comparePassword(newPassword, oldHash.hash);
      if (matches) {
        return NextResponse.json(
          { error: 'Cannot reuse a recent password. Choose a different one.' },
          { status: 400 }
        );
      }
    }

    // Update password directly (no current password validation needed)
    // Hash new password
    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update history
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

    // Mark token as used
    resetTokenRecord.usedAt = new Date();
    await resetTokenRecord.save();

    // Generate new tokens
    const tokenPair = jwtService.createTokenPair(account);

    return NextResponse.json(
      {
        success: true,
        message: 'Password reset successfully. You can now login.',
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
        redirectTo: '/dashboard',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
