import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import Account from '@/models/accountModel';
import PasswordResetToken from '@/models/passwordResetTokenModel';
import jwtService from '@/lib/jwtService';
import nodemailer from 'nodemailer';

// Initialize email transporter (configure with your email service)
let transporter = null;

function initializeTransporter() {
  if (transporter) return transporter;

  // Only initialize if email credentials are provided
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  return transporter;
}

export async function POST(request) {
  try {
    await connectDB();

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find account
    const account = await Account.findOne({ email: normalizedEmail });
    if (!account) {
      // Don't reveal if email exists - security best practice
      return NextResponse.json(
        { message: 'If email exists, reset link will be sent shortly' },
        { status: 200 }
      );
    }

    // Generate reset token (10 minute expiry)
    const resetToken = jwtService.createResetToken(account._id);

    // Store reset token metadata
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await PasswordResetToken.create({
      accountId: account._id,
      token: resetToken,
      email: account.email,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      expiresAt,
    });

    // Send reset email
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

    const transporter = initializeTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: account.email,
          subject: 'Password Reset Request - ScratchX',
          html: `
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your ScratchX account.</p>
            <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
            <p>Or copy this link: ${resetUrl}</p>
            <p><strong>This link expires in 10 minutes.</strong></p>
            <p>If you didn't request this, please ignore this email.</p>
          `,
        });
      } catch (emailError) {
        console.error('Email send error:', emailError);
        // Log but don't fail - token is still stored for manual access
      }
    } else {
      console.warn('Email transporter not configured. Reset token stored but email not sent.');
    }

    // Always return same message for security
    return NextResponse.json(
      { message: 'If email exists, reset link will be sent shortly' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
