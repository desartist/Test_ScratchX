/**
 * Email Service
 *
 * Handles all email communications for ScratchX
 * Supports multiple email events (payment, trial, quota, etc)
 */

import nodemailer from 'nodemailer';
import EmailLog from '@/models/emailLogModel';

// Configure email transporter (real SMTP — see SMTP_* vars in .env.local)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465', // 465 = implicit TLS, 587 = STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const EMAIL_FROM_ADDRESS = process.env.MAIL_FROM
  ? `${process.env.MAIL_FROM_NAME || 'ScratchX'} <${process.env.MAIL_FROM}>`
  : process.env.SMTP_USER;

// Email templates
const emailTemplates = {
  paymentConfirmation: (data) => ({
    subject: `Payment Confirmed - ScratchX Plan Activated`,
    html: `
      <h2>🎉 Welcome to ScratchX!</h2>
      <p>Hi ${data.merchantName},</p>
      <p>Your payment has been successfully processed.</p>
      <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Plan:</strong> ${data.planName}</p>
        <p><strong>Amount Paid:</strong> ₹${data.amount}</p>
        <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
        <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
      </div>
      <p>Your subscription is now active and you can start creating campaigns immediately.</p>
      <p><a href="${process.env.APP_URL}/dashboard" style="background: #ef9e1b; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Go to Dashboard</a></p>
      <p>Best regards,<br>ScratchX Team</p>
    `,
  }),

  trialExpiring: (data) => ({
    subject: `⏰ Your Trial Expires in ${data.daysRemaining} Days`,
    html: `
      <h2>Your Free Trial is Ending Soon</h2>
      <p>Hi ${data.merchantName},</p>
      <p>Your ScratchX trial expires in <strong>${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''}</strong> on ${new Date(data.expiryDate).toLocaleDateString()}.</p>
      <p>Don't lose access to your campaigns! Upgrade now to continue using ScratchX.</p>
      <div style="background: #fffbf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef9e1b;">
        <p><strong>Upgrade Options:</strong></p>
        <ul>
          <li>Single Store Plan - ₹2,099 (30% off)</li>
          <li>Multi-Store Plan - ₹2,999 (40% off)</li>
        </ul>
      </div>
      <p><a href="${process.env.APP_URL}/billing/upgrade" style="background: #ef9e1b; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Upgrade Now</a></p>
      <p>Best regards,<br>ScratchX Team</p>
    `,
  }),

  quotaWarning: (data) => ({
    subject: `⚠️ Quota Alert: ${data.metric} Usage at ${data.percentage}%`,
    html: `
      <h2>Quota Usage Alert</h2>
      <p>Hi ${data.merchantName},</p>
      <p>Your ${data.metric} usage has reached <strong>${data.percentage}%</strong> of your monthly limit.</p>
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>${data.metric}:</strong> ${data.current}/${data.limit}</p>
        <p><strong>Plan:</strong> ${data.planName}</p>
      </div>
      <p>To avoid service disruption, please consider upgrading your plan.</p>
      <p><a href="${process.env.APP_URL}/billing/upgrade" style="background: #ef9e1b; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">View Upgrade Options</a></p>
      <p>Best regards,<br>ScratchX Team</p>
    `,
  }),

  upgradeSuccess: (data) => ({
    subject: `✅ Plan Upgraded Successfully`,
    html: `
      <h2>Plan Upgraded!</h2>
      <p>Hi ${data.merchantName},</p>
      <p>Your plan has been successfully upgraded to <strong>${data.newPlanName}</strong>.</p>
      <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>From:</strong> ${data.oldPlanName}</p>
        <p><strong>To:</strong> ${data.newPlanName}</p>
        <p><strong>Upgrade Amount:</strong> ₹${data.proratedAmount}</p>
        <p><strong>Valid Until:</strong> ${new Date(data.expiryDate).toLocaleDateString()}</p>
      </div>
      <p>You now have access to all features of your new plan.</p>
      <p><a href="${process.env.APP_URL}/dashboard" style="background: #ef9e1b; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Go to Dashboard</a></p>
      <p>Best regards,<br>ScratchX Team</p>
    `,
  }),

  cancellationConfirm: (data) => ({
    subject: `📋 Subscription Cancellation Confirmed`,
    html: `
      <h2>Subscription Cancelled</h2>
      <p>Hi ${data.merchantName},</p>
      <p>Your ScratchX subscription has been successfully cancelled.</p>
      <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Plan:</strong> ${data.planName}</p>
        <p><strong>Cancellation Date:</strong> ${new Date(data.cancellationDate).toLocaleDateString()}</p>
        <p><strong>Data Retention:</strong> Your data will be retained for 30 days.</p>
      </div>
      <p>If you change your mind, you can reactivate your subscription within 30 days without losing your data.</p>
      <p><a href="${process.env.APP_URL}/billing/upgrade" style="background: #ef9e1b; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Reactivate Subscription</a></p>
      <p>We'd love to hear feedback about your experience. Please reply to this email with any suggestions.</p>
      <p>Best regards,<br>ScratchX Team</p>
    `,
  }),

  invoiceEmail: (data) => ({
    subject: `📄 Invoice ${data.invoiceNumber} from ScratchX`,
    html: `
      <h2>Invoice</h2>
      <p>Hi ${data.merchantName},</p>
      <p>Your invoice for your ScratchX subscription is ready.</p>
      <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Invoice Number:</strong> ${data.invoiceNumber}</p>
        <p><strong>Plan:</strong> ${data.planName}</p>
        <p><strong>Amount:</strong> ₹${data.amount}</p>
        <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
        <p><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString()}</p>
      </div>
      <p><a href="${process.env.APP_URL}/billing/invoices/${data.invoiceNumber}/pdf" style="background: #ef9e1b; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Download Invoice PDF</a></p>
      <p>Best regards,<br>ScratchX Team</p>
    `,
  }),
};

/**
 * Send email
 */
export async function sendEmail(recipient, templateName, data) {
  try {
    const template = emailTemplates[templateName];
    if (!template) {
      throw new Error(`Email template "${templateName}" not found`);
    }

    const emailContent = template(data);

    // Send email
    const info = await transporter.sendMail({
      from: EMAIL_FROM_ADDRESS,
      to: recipient,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    // Log email
    await EmailLog.create({
      recipient,
      templateName,
      subject: emailContent.subject,
      status: 'sent',
      messageId: info.messageId,
      metadata: data,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Error sending email (${templateName}):`, error);

    // Log failed email
    try {
      await EmailLog.create({
        recipient,
        templateName,
        status: 'failed',
        error: error.message,
        metadata: data,
      });
    } catch (logError) {
      console.error('Error logging failed email:', logError);
    }

    throw error;
  }
}

/**
 * Send bulk emails
 */
export async function sendBulkEmails(recipients, templateName, data) {
  const results = [];

  for (const recipient of recipients) {
    try {
      const result = await sendEmail(recipient, templateName, data);
      results.push({ recipient, success: true, ...result });
    } catch (error) {
      results.push({ recipient, success: false, error: error.message });
    }
  }

  return results;
}

/**
 * Scratch-Specific Email Methods
 */

/**
 * Send plan purchase/activation email
 */
export async function sendPlanPurchaseEmail(userEmail, merchantName, planName, unlimitedDays = 365) {
  const expiryDate = new Date(Date.now() + unlimitedDays * 24 * 60 * 60 * 1000).toLocaleDateString();
  return sendEmail(userEmail, 'paymentConfirmation', {
    merchantName,
    planName,
    amount: '0',
    transactionId: 'PLAN_ACTIVATION',
    date: new Date(),
  });
}

/**
 * Send scratch pack purchase email
 */
export async function sendScratchPackPurchaseEmail(userEmail, merchantName, quantity, price) {
  const html = `
    <h2>✅ Scratch Pack Purchase Confirmed</h2>
    <p>Hi ${merchantName},</p>
    <p>Thank you for purchasing a scratch pack from ScratchX!</p>
    <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Scratches Purchased:</strong> ${quantity.toLocaleString()}</p>
      <p><strong>Amount Paid:</strong> ₹${price}</p>
      <p><strong>Validity:</strong> 1 Year</p>
    </div>
    <p>Your scratches have been added to your account and you can start using them immediately to create campaigns.</p>
    <p><a href="${process.env.APP_URL}/dashboard" style="background: #ef9e1b; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Go to Dashboard</a></p>
    <p>Best regards,<br>ScratchX Team</p>
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_FROM_ADDRESS,
      to: userEmail,
      subject: `✅ Scratch Pack Purchase Confirmed - ${quantity.toLocaleString()} Scratches`,
      html,
    });

    await EmailLog.create({
      recipient: userEmail,
      templateName: 'scratchPurchaseConfirmation',
      subject: `✅ Scratch Pack Purchase Confirmed - ${quantity.toLocaleString()} Scratches`,
      status: 'sent',
      metadata: { quantity, price },
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending scratch pack purchase email:', error);
    await EmailLog.create({
      recipient: userEmail,
      templateName: 'scratchPurchaseConfirmation',
      status: 'failed',
      error: error.message,
      metadata: { quantity, price },
    });
    throw error;
  }
}

/**
 * Send expiry warning email (15, 7, 3, or 1 day warning)
 */
export async function sendExpiryWarningEmail(userEmail, merchantName, daysRemaining) {
  let severity = 'low';
  let color = '#3b82f6'; // blue for 15 days
  let message = `Your unlimited scratches will expire in ${daysRemaining} days.`;

  if (daysRemaining <= 1) {
    severity = 'critical';
    color = '#ef4444'; // red for 1 day
    message = `⚠️ URGENT: Your unlimited scratches expire TOMORROW!`;
  } else if (daysRemaining <= 3) {
    severity = 'high';
    color = '#f97316'; // orange for 3 days
    message = `⚠️ Your unlimited scratches will expire in ${daysRemaining} days.`;
  } else if (daysRemaining <= 7) {
    severity = 'medium';
    color = '#eab308'; // yellow for 7 days
    message = `Your unlimited scratches will expire in ${daysRemaining} days. Plan ahead!`;
  }

  const html = `
    <h2 style="color: ${color};">Scratch Entitlement Expiring Soon</h2>
    <p>Hi ${merchantName},</p>
    <p style="font-size: 16px; color: ${color}; font-weight: bold;">${message}</p>
    <div style="background: ${color}20; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${color};">
      <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
      <p><strong>Action Required:</strong> After expiry, you'll need to purchase scratch packs to continue creating campaigns.</p>
    </div>
    <p>We recommend purchasing a scratch pack now to avoid service disruption. Browse our available packs below:</p>
    <ul>
      <li>1K Scratches - ₹49.99</li>
      <li>5K Scratches - ₹224.99 (10% OFF)</li>
      <li>10K Scratches - ₹399.99 (20% OFF) - Best Value</li>
      <li>50K Scratches - ₹1799.99 (25% OFF)</li>
    </ul>
    <p><a href="${process.env.APP_URL}/billing/scratch-packs" style="background: ${color}; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Purchase Scratch Pack</a></p>
    <p>Best regards,<br>ScratchX Team</p>
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_FROM_ADDRESS,
      to: userEmail,
      subject: `⏰ Scratch Entitlement Expires in ${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''}`,
      html,
    });

    await EmailLog.create({
      recipient: userEmail,
      templateName: 'expiryWarning',
      subject: `⏰ Scratch Entitlement Expires in ${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''}`,
      status: 'sent',
      severity,
      metadata: { daysRemaining },
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending expiry warning email:', error);
    await EmailLog.create({
      recipient: userEmail,
      templateName: 'expiryWarning',
      status: 'failed',
      error: error.message,
      metadata: { daysRemaining },
    });
    throw error;
  }
}

/**
 * Send entitlement expired email (no more scratches available)
 */
export async function sendEntitlementExpiredEmail(userEmail, merchantName) {
  const html = `
    <h2 style="color: #ef4444;">🚨 Scratch Entitlement Expired</h2>
    <p>Hi ${merchantName},</p>
    <p style="font-size: 16px; color: #ef4444; font-weight: bold;">Your unlimited scratches have expired. Your account is now out of scratches.</p>
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
      <p><strong>What This Means:</strong></p>
      <ul>
        <li>You cannot create new campaigns</li>
        <li>You cannot activate or allocate scratches to existing campaigns</li>
        <li>Active campaigns cannot receive new scratch assignments</li>
      </ul>
      <p><strong>How to Restore Access:</strong> Purchase a scratch pack immediately to resume campaign operations.</p>
    </div>
    <h3>Available Scratch Packs:</h3>
    <ul style="font-size: 14px;">
      <li><strong>1K Scratches</strong> - ₹49.99 (perfect for testing)</li>
      <li><strong>5K Scratches</strong> - ₹224.99 (10% discount)</li>
      <li><strong>10K Scratches</strong> - ₹399.99 (20% discount) ⭐ Best Value</li>
      <li><strong>50K Scratches</strong> - ₹1799.99 (25% discount) (bulk purchase)</li>
    </ul>
    <p><a href="${process.env.APP_URL}/billing/scratch-packs" style="background: #ef4444; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold; font-size: 16px;">Buy Scratches Now</a></p>
    <p>Questions? Reply to this email or contact our support team at support@scratchx.app</p>
    <p>Best regards,<br>ScratchX Team</p>
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_FROM_ADDRESS,
      to: userEmail,
      subject: `🚨 Action Required: Your Scratches Have Expired`,
      html,
    });

    await EmailLog.create({
      recipient: userEmail,
      templateName: 'entitlementExpired',
      subject: `🚨 Action Required: Your Scratches Have Expired`,
      status: 'sent',
      severity: 'critical',
      metadata: { expiryTime: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending entitlement expired email:', error);
    await EmailLog.create({
      recipient: userEmail,
      templateName: 'entitlementExpired',
      status: 'failed',
      error: error.message,
      metadata: { expiryTime: new Date() },
    });
    throw error;
  }
}

/**
 * Send distributor plan/license order confirmation email (to the purchaser)
 */
export async function sendDistributorOrderConfirmationEmail(distributor, order) {
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.planName || item.planType}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${item.unitCostPrice.toLocaleString()}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${item.lineTotal.toLocaleString()}</td>
      </tr>`
    )
    .join('');

  const html = `
    <h2>✅ Order Confirmed</h2>
    <p>Hi ${distributor.name || distributor.email},</p>
    <p>Your ScratchX plan license order has been confirmed and credited to your inventory.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px;text-align:left;">License</th>
          <th style="padding:8px;text-align:center;">Qty</th>
          <th style="padding:8px;text-align:right;">Unit Price</th>
          <th style="padding:8px;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Subtotal:</strong> ₹${order.pricing.subtotal.toLocaleString()}</p>
      <p><strong>GST (18%):</strong> ₹${order.pricing.gst.toLocaleString()}</p>
      <p><strong>Total Paid:</strong> ₹${order.pricing.grandTotal.toLocaleString()}</p>
    </div>
    <p><a href="${process.env.APP_URL}/distributor-overview" style="background: #ef9e1b; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Go to Dashboard</a></p>
    <p>Best regards,<br>ScratchX Team</p>
  `;

  const subject = `✅ Order Confirmed - #${order.orderNumber}`;

  try {
    await transporter.sendMail({ from: EMAIL_FROM_ADDRESS, to: distributor.email, subject, html });
    await EmailLog.create({
      recipient: distributor.email,
      templateName: 'distributorOrderConfirmation',
      subject,
      status: 'sent',
      metadata: { orderNumber: order.orderNumber, grandTotal: order.pricing.grandTotal },
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending distributor order confirmation email:', error);
    await EmailLog.create({
      recipient: distributor.email,
      templateName: 'distributorOrderConfirmation',
      status: 'failed',
      error: error.message,
      metadata: { orderNumber: order.orderNumber },
    }).catch(() => {});
    throw error;
  }
}

/**
 * Send a purchase alert email to platform admins (Super_Admin accounts).
 *
 * @param {string[]} adminEmails
 * @param {{ name?: string, email: string, phone?: string, role?: string }} purchaser
 * @param {{ orderNumber: string, purchaseType: string, itemsSummary: string, amount: number }} purchase
 */
export async function sendAdminPurchaseAlertEmail(adminEmails, purchaser, purchase) {
  if (!adminEmails || adminEmails.length === 0) {
    return { success: false, reason: 'no_admin_recipients' };
  }

  const html = `
    <h2>💰 New Purchase on ScratchX</h2>
    <p>${purchaser.name || purchaser.email} (${purchaser.role || 'account'}) just completed a purchase.</p>
    <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Purchased By:</strong> ${purchaser.name || '—'}</p>
      <p><strong>Email:</strong> ${purchaser.email}</p>
      <p><strong>Phone:</strong> ${purchaser.phone || '—'}</p>
      <p><strong>Role:</strong> ${purchaser.role || '—'}</p>
    </div>
    <div style="background: #fffbf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef9e1b;">
      <p><strong>Purchase Type:</strong> ${purchase.purchaseType}</p>
      <p><strong>Order Number:</strong> ${purchase.orderNumber}</p>
      <p><strong>Items:</strong> ${purchase.itemsSummary}</p>
      <p><strong>Amount Paid:</strong> ₹${purchase.amount.toLocaleString()}</p>
    </div>
    <p>Best regards,<br>ScratchX System</p>
  `;

  const subject = `💰 ${purchase.purchaseType} - ₹${purchase.amount.toLocaleString()} by ${purchaser.name || purchaser.email}`;

  const results = [];
  for (const email of adminEmails) {
    try {
      await transporter.sendMail({ from: EMAIL_FROM_ADDRESS, to: email, subject, html });
      await EmailLog.create({
        recipient: email,
        templateName: 'adminPurchaseAlert',
        subject,
        status: 'sent',
        metadata: { orderNumber: purchase.orderNumber, purchaserEmail: purchaser.email },
      });
      results.push({ email, success: true });
    } catch (error) {
      console.error('Error sending admin purchase alert email:', error);
      await EmailLog.create({
        recipient: email,
        templateName: 'adminPurchaseAlert',
        status: 'failed',
        error: error.message,
        metadata: { orderNumber: purchase.orderNumber },
      }).catch(() => {});
      results.push({ email, success: false });
    }
  }
  return results;
}

/**
 * Send a new store team member (Store_Manager/Store_Staff) their account
 * invite. Deliberately does NOT include the plaintext password in the
 * email body — emailing credentials in plaintext is unencrypted in transit,
 * persists indefinitely in inboxes, and has no expiry. The business owner
 * sets the password directly when creating the account and shares it with
 * the team member separately.
 */
export async function sendTeamMemberInviteEmail(memberEmail, memberName, role, storeName) {
  const roleLabel = role === 'Store_Manager' ? 'Store Manager' : 'Store Staff';
  const html = `
    <h2>🎉 Welcome to ScratchX!</h2>
    <p>Hi ${memberName},</p>
    <p>Your business owner has created a ScratchX account for you as <strong>${roleLabel}</strong> at <strong>${storeName}</strong>.</p>
    <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Login Email:</strong> ${memberEmail}</p>
      <p><strong>Role:</strong> ${roleLabel}</p>
      <p><strong>Store:</strong> ${storeName}</p>
    </div>
    <p>Your password was set by your business owner — contact them directly if you need it. For security, we don't include passwords in email.</p>
    <p><a href="${process.env.APP_URL}/auth/login" style="background: #ef9e1b; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Log In to ScratchX</a></p>
    <p>Best regards,<br>ScratchX Team</p>
  `;

  const subject = `🎉 You've been added to ${storeName} on ScratchX`;

  try {
    await transporter.sendMail({ from: EMAIL_FROM_ADDRESS, to: memberEmail, subject, html });
    await EmailLog.create({
      recipient: memberEmail,
      templateName: 'teamMemberInvite',
      subject,
      status: 'sent',
      metadata: { role, storeName },
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending team member invite email:', error);
    await EmailLog.create({
      recipient: memberEmail,
      templateName: 'teamMemberInvite',
      status: 'failed',
      error: error.message,
      metadata: { role, storeName },
    }).catch(() => {});
    throw error;
  }
}

/**
 * Test email service
 */
export async function testEmailService() {
  try {
    await transporter.verify();
    console.log('✅ Email service is configured correctly');
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error);
    return false;
  }
}

export default {
  sendEmail,
  sendBulkEmails,
  sendPlanPurchaseEmail,
  sendScratchPackPurchaseEmail,
  sendExpiryWarningEmail,
  sendEntitlementExpiredEmail,
  sendDistributorOrderConfirmationEmail,
  sendAdminPurchaseAlertEmail,
  sendTeamMemberInviteEmail,
  testEmailService,
};
