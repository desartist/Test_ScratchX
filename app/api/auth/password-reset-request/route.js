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
           <body style="margin: 0; padding: 35px 0px; background: #f9fafb">
    <div
      style="
        max-width: 640px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        font-family: Arial, Helvetica, sans-serif;
      "
    >
      <!-- Header -->
      <div style="padding: 14px 50px; text-align: center">
        <img
          src="https://test.thescratchx.com/ScratchXlogo.png"
          alt="ScratchX"
          style="width: 190px; height: auto; display: block"
        />
      </div>

      <!-- Body -->
      <div style="padding: 20px 49px">
        <h1
          style="
            margin: 0 0 35px;
            font-size: 34px;
            font-weight: 700;
            color: #111827;
            text-align: left;
          "
        >
          Reset your password
        </h1>

        <p
          style="
            margin: 0 0 10px;
            font-size: 16px;
            color: #374151;
            line-height: 28px;
          "
        >
          Hi <strong>${account.name || 'there'}</strong>,
        </p>

        <p
          style="
            margin: 0 0 25px;
            font-size: 16px;
            color: #4b5563;
            line-height: 30px;
          "
        >
          Let’s reset your password so you can get back to growing your business with ScratchX.
        </p>

        <!-- Button -->
        <div style="text-align: left; margin: 28px 0">
          <a
            href="${resetUrl}"
            style="
              display: inline-block;
              background: #ef9e1b;
              color: #ffffff;
              text-decoration: none;
              padding: 16px 60px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
            "
          >
            Reset Password
          </a>
          <p  style="
            margin: 0 0 25px;
            font-size: 10px;
            color: #4b5563;
            line-height: 30px;
            font-style: italic;
          ">This password reset request will expire in <b>10 minutes.</b></p>
        </div>

        <p
          style="
            margin: 0 0 30px;
            font-size: 15px;
            color: #6b7280;
            line-height: 22px;
          "
        >
         If you didn’t request a password reset, you can safely ignore this email. Your account will remain secure unless this link is used.
        </p>

        <!-- Backup Link -->
        <div style="margin-bottom: 35px">
          <div
            style="
              font-size: 14px;
              color: #111827;
              margin-bottom: 10px;
              font-weight: 500;
            "
          >
            Need another way to reset your password??
          </div>

          <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px">
            Use the secure password reset link below to continue.
          </div>

          <a
            href="${resetUrl}"
            style="
              font-size: 14px;
              color: #6b7280;
              text-decoration: none;
              word-break: break-word;
              font-style: italic;
            "
          >
            ${resetUrl}
          </a>
        </div>

        <!-- Support -->
        <div style="padding-top: 4px">
          <div style="font-size: 15px; color: #6b7280; line-height: 26px">
            We're here to assist if you need it. 
          </div>

          <a
            href="mailto:support.scratchx@thedesartist.com"
            style="
              display: inline-block;
              margin-top: 0px;
              color: #6c7280;
              font-size: 15px;
              text-decoration: none;
            "
          >
            support.scratchx@thedesartist.com
          </a>
        </div>
         <p
          style="
            margin: 30px 0 30px;
            font-size: 15px;
            color: #000000;
            line-height: 22px;
            font-weight: 600;
          "
        >
          The ScratchX Team
        </p>
      </div>
     


   
    </div>
  </body>
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
