import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/connectDB';
import Account from '@/models/accountModel';
import PasswordResetToken from '@/models/passwordResetTokenModel';
import jwtService from '@/lib/jwtService';
import nodemailer from 'nodemailer';

// Initialize email transporter (real SMTP — see SMTP_* vars in .env.local)
let transporter = null;

function initializeTransporter() {
  if (transporter) return transporter;

  // Only initialize if SMTP credentials are provided
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465', // 465 = implicit TLS, 587 = STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
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
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/auth/reset-password/confirm?token=${resetToken}`;

    let emailSent = false;
    const transporter = initializeTransporter();
    if (transporter) {
      try {
        const fromAddress = process.env.MAIL_FROM
          ? `${process.env.MAIL_FROM_NAME || 'ScratchX'} <${process.env.MAIL_FROM}>`
          : process.env.SMTP_USER;
        await transporter.sendMail({
          from: fromAddress,
          to: account.email,
          subject: 'Reset your ScratchX password',
          html: `
            <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
            <!-- Header -->
    <div style="padding: 14px 20px;text-align:center;border-bottom:1px solid #eeeeee;">

        <img
            src="https://test.thescratchx.com/horizontal_logo.png"
            alt="ScratchX"
            style="width:190px;height:auto;display:block;margin:0 auto 20px;">
    </div>

    <!-- Body -->
    <div style="padding: 20px 49px;">

        <h1 style="margin:0 0 35px;font-size:34px;font-weight:700;color:#111827;text-align:center;">
            Reset your password
        </h1>

        <p style="margin:0 0 25px;font-size:16px;color:#374151;line-height:28px;">
            Hi <strong>${account.name || 'there'}</strong>,
        </p>

        <p style="margin:0 0 25px;font-size:16px;color:#4b5563;line-height:30px;">
            Let's reset your password so you can get back to managing your ScratchX dashboard.
        </p>

        <!-- Button -->
        <div style="text-align:center;margin:35px 0;">

            <a
                href="${resetUrl}"
                style="display:inline-block;background:#ef9e1b;color:#ffffff;text-decoration:none;padding:16px 42px;border-radius:8px;font-size:16px;font-weight:600;">
                Reset Password
            </a>

        </div>

        <!-- Info Box -->
        <div style="background:#eff6ff;border-left:4px solid #ef9e1b;padding:18px 20px;border-radius:8px;margin-bottom:35px;">

            <span style="font-size:15px;color:#1e40af;font-weight:600;">
                ⏰ This password reset link will expire in 10 minutes.
            </span>

        </div>

        <p style="margin:0 0 30px;font-size:15px;color:#6b7280;line-height:28px;">
            If you didn't ask to reset your password, you can safely ignore this email.
            Your account will remain secure, and no changes will be made unless you use
            the button above.
        </p>

        <!-- Backup Link -->
        <div style="padding:20px;background:#f9fafb;border-radius:10px;margin-bottom:35px;">

            <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:10px;">
                Having trouble with the button?
            </div>

            <div style="font-size:14px;color:#6b7280;margin-bottom:10px;">
                Copy and paste this link into your browser:
            </div>

            <a
                href="${resetUrl}"
                style="font-size:14px;color:#2563eb;text-decoration:none;word-break:break-word;">
                ${resetUrl}
            </a>

        </div>

        <!-- Support -->
        <div style="border-top:1px solid #eeeeee;padding-top:30px;">

            <div style="font-size:16px;font-weight:600;color:#111827;margin-bottom:12px;">
                Need help?
            </div>

            <div style="font-size:15px;color:#6b7280;line-height:26px;">
                We're here to help if you need it.
            </div>

            <a
                href="mailto:support.scratchx@thedesartist.com"
                style="display:inline-block;margin-top:10px;color:#2563eb;font-size:15px;text-decoration:none;">
                support.scratchx@thedesartist.com
            </a>

        </div>

    </div>

    <!-- Footer -->
    <div style="background:#111827;padding:40px;text-align:center;">

        <img
            src="https://test.thescratchx.com/horizontal_logo_white.png"
            alt="ScratchX"
            style="width:150px;height:auto;margin-bottom:20px;">


        <div style="font-size:12px;color:#9ca3af;">
            © 2026 ScratchX. All rights reserved.
        </div>

    </div>

</div>



          `,
        });
        emailSent = true;
      } catch (emailError) {
        console.error('Email send error:', emailError);
        // Log but don't fail - token is still stored for manual access
      }
    } else {
      console.warn('Email transporter not configured. Reset token stored but email not sent.');
    }

    return NextResponse.json(
      {
        message: emailSent
          ? 'If email exists, reset link will be sent shortly'
          : 'Reset link generated (email delivery not configured)',
        emailSent,
      },
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
