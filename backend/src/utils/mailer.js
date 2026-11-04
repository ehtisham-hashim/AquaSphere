import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let transporter = null;

/**
 * Initializes and returns a singleton nodemailer transporter for ZeptoMail SMTP.
 */
function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.MAIL_HOST || 'smtp.zeptomail.com';
  const port = parseInt(process.env.MAIL_PORT, 10) || 587;
  const user = process.env.MAIL_USERNAME || 'emailapikey';
  const pass = process.env.MAIL_PASSWORD || '';

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transporter;
}

/**
 * Generates an elegant, high-end HTML email template for 2FA OTP verification,
 * patterned directly after modern enterprise confirmation emails (Cloudinary style).
 * Features:
 * - Brand green top header banner with crisp logo
 * - Overlaid clean white card with subtle rounded corners and soft elevation
 * - Central security cloud & padlock emblem
 * - Bold, unadorned, high-readability plain black OTP text
 * - Professional salutation, instructions, security disclaimer, and team signature
 * - Minimalist footer with brand icon, copyright, and support link
 *
 * @param {object} params
 * @param {string} params.otp - OTP verification code
 * @param {string} [params.tenant='aquasphere'] - 'aquasphere' | 'wadaana'
 * @param {string} [params.userName=''] - Recipient's display name
 * @returns {string} HTML string
 */
export function build2FAEmailHtml({ otp, tenant = 'aquasphere', userName = '' }) {
  const isWadaana = String(tenant).toLowerCase() === 'wadaana';

  // Company theme tokens
  const companyName = isWadaana ? 'Wadaana Industries' : 'AquaSphere';
  const teamName = `The ${companyName} Team`;
  const contactUrl = isWadaana ? 'mailto:support@wadaanaindustries.com' : 'mailto:support@theaquasphere.org';
  const year = new Date().getFullYear();

  // Clean greeting name (fallback gracefully)
  const greetingName = userName && userName.trim() ? userName.trim() : 'there';

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no" />
  <title>${companyName} Confirmation Code</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, span { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #1e293b;">
  <!-- Main Outer Wrapper -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; background-color: #f4f6f8; margin: 0; padding: 0;">
    
    <!-- Top Royal Blue Header Banner -->
    <tr>
      <td align="center" bgcolor="#0062ff" style="background-color: #0062ff; padding: 36px 20px 80px 20px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px;">
          <tr>
            <td align="center">
              <img src="cid:companylogowhite" alt="${companyName}" height="90" style="display: block; max-height: 90px; height: 90px; width: auto; border: 0; outline: none; text-decoration: none; margin: 0 auto;" />
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Card Container (overlaid directly below banner) -->
    <tr>
      <td align="center" style="padding: 0 16px 40px 16px;">
        <!--[if mso]>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="540" align="center" style="margin-top: -46px;">
        <tr>
        <td>
        <![endif]-->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; margin-top: -46px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Inner Card Body -->
          <tr>
            <td style="padding: 44px 44px 38px 44px;">

              <!-- Security Cloud + Padlock Graphic -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 28px;">
                    <img src="cid:securitybadge" alt="Security Verification" width="80" height="60" style="display: block; margin: 0 auto; border: 0; outline: none;" />
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1e293b; line-height: 1.5;">
                Hi ${greetingName},
              </p>

              <!-- Instructions -->
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.5;">
                Here&apos;s the confirmation code you requested:
              </p>

              <!-- OTP Code: Simple, Large, Bold Text -->
              <div style="font-size: 36px; font-weight: 800; color: #0f172a; letter-spacing: 4px; line-height: 1.2; margin: 0 0 22px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                ${otp}
              </div>

              <!-- Security Advice -->
              <p style="margin: 0 0 32px 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                If you didn&apos;t request this, you can ignore this email or let us know.
              </p>

              <!-- Sign-off -->
              <p style="margin: 0; font-size: 15px; color: #1e293b; line-height: 1.6;">
                Thanks,<br />
                <strong style="font-weight: 600; color: #0f172a;">${teamName}</strong>
              </p>

            </td>
          </tr>

        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->

        <!-- Footer Section -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; margin-top: 32px;">
          <!-- Centered Footer Logo -->
          <tr>
            <td align="center" style="padding-bottom: 14px;">
              <img src="cid:companylogofooter" alt="${companyName}" height="64" style="display: block; margin: 0 auto; max-height: 64px; height: 64px; width: auto; border: 0; outline: none;" />
            </td>
          </tr>

          <!-- Copyright -->
          <tr>
            <td align="center" style="padding-bottom: 6px;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5; font-weight: 400;">
                &copy; ${year} ${companyName}. All rights reserved.
              </p>
            </td>
          </tr>

          <!-- Contact Us Link -->
          <tr>
            <td align="center">
              <a href="${contactUrl}" style="font-size: 12px; color: #0062ff; text-decoration: underline; font-weight: 600;">
                Contact Us
              </a>
            </td>
          </tr>
        </table>

      </td>
    </tr>

  </table>
</body>
</html>
  `.trim();
}

/**
 * Sends the 2FA verification email to Owner recipient(s) using ZeptoMail.
 *
 * @param {object} params
 * @param {string|string[]} [params.to] - Target email(s). If omitted, falls back to .env settings.
 * @param {string} params.otp - 6-digit OTP code
 * @param {string} [params.tenant='aquasphere'] - 'aquasphere' | 'wadaana'
 * @param {string} [params.userName=''] - Name of recipient user
 */
export async function sendOwner2FAEmail({ to, otp, tenant = 'aquasphere', userName = '' }) {
  if (!process.env.MAIL_PASSWORD?.trim()) {
    console.warn('[2FA Mailer] MAIL_PASSWORD is not configured. Cannot dispatch 2FA email.');
    return { success: false, disabled: true, error: 'MAIL_PASSWORD not configured' };
  }

  const mailer = getTransporter();

  // Resolve recipients
  let recipients = [];
  if (to) {
    recipients = Array.isArray(to) ? to : [to];
  } else {
    if (process.env.OWNER_2FA_PRIMARY_EMAIL) recipients.push(process.env.OWNER_2FA_PRIMARY_EMAIL);
    if (process.env.OWNER_2FA_SECONDARY_EMAIL) recipients.push(process.env.OWNER_2FA_SECONDARY_EMAIL);
  }

  // Deduplicate and filter valid emails
  const validRecipients = [...new Set(recipients.map(e => String(e).trim()).filter(Boolean))];

  if (validRecipients.length === 0) {
    console.warn('[2FA Mailer] No recipient email configured in OWNER_2FA_PRIMARY_EMAIL or parameter');
    return { success: false, error: 'No recipient email configured' };
  }

  const isWadaana = String(tenant).toLowerCase() === 'wadaana';
  const companyName = isWadaana ? 'Wadaana Industries' : 'AquaSphere';
  const fromAddress = process.env.MAIL_FROM_ADDRESS || 'noreply@theaquasphere.org';
  const fromName = process.env.MAIL_FROM_NAME || companyName;

  // Resolve user display name
  const resolvedUserName = userName && userName.trim()
    ? userName.trim()
    : (validRecipients[0] ? validRecipients[0].split('@')[0] : 'there');

  const html = build2FAEmailHtml({ otp, tenant, userName: resolvedUserName });
  const subject = `${companyName} Confirmation Code: ${otp}`;
  const text = `Hi ${resolvedUserName},\n\nHere's the confirmation code you requested:\n\n${otp}\n\nIf you didn't request this, you can ignore this email or let us know.\n\nThanks,\nThe ${companyName} Team`;

  // Attach brand & security graphics with Content-ID for instant, unblocked rendering
  const logoWhitePath = path.resolve(__dirname, '../assets/logo-white.png');
  const logoFooterPath = path.resolve(__dirname, '../assets/logo.png');
  const securityBadgePath = path.resolve(__dirname, '../assets/security-badge.png');

  const attachments = [];
  if (fs.existsSync(logoWhitePath)) {
    attachments.push({
      filename: 'logo-white.png',
      path: logoWhitePath,
      cid: 'companylogowhite',
    });
  }
  if (fs.existsSync(logoFooterPath)) {
    attachments.push({
      filename: 'logo.png',
      path: logoFooterPath,
      cid: 'companylogofooter',
    });
  }
  if (fs.existsSync(securityBadgePath)) {
    attachments.push({
      filename: 'security-badge.png',
      path: securityBadgePath,
      cid: 'securitybadge',
    });
  }

  try {
    const info = await mailer.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: validRecipients.join(', '),
      replyTo: fromAddress,
      subject,
      text,
      html,
      attachments,
      headers: {
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
        'Priority': 'Urgent',
        'Importance': 'high',
        'X-Priority': '1',
      },
    });

    console.log(`[2FA Mailer] Verification email sent to ${validRecipients.join(', ')} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId, recipients: validRecipients };
  } catch (err) {
    console.error('[2FA Mailer] Failed to send email via ZeptoMail SMTP:', err.message);
    // Return gracefully without crashing caller; caller can log fallback OTP
    return { success: false, error: err.message };
  }
}

/**
 * Sends a notification email to the company inbox when a user submits the Contact Us form.
 *
 * @param {object} params
 * @param {string} params.name - Inquirer's full name
 * @param {string} params.email - Inquirer's email address
 * @param {string} params.message - Inquiry message
 * @param {string} [params.toEmail] - Destination company email
 * @param {string} [params.tenant='aquasphere'] - 'aquasphere' | 'wadaana'
 */
export async function sendContactInquiryEmail({ name, email, message, toEmail, tenant = 'aquasphere' }) {
  const mailer = getTransporter();
  const isWadaana = String(tenant).toLowerCase() === 'wadaana';
  const companyName = isWadaana ? 'Wadaana Industries' : 'AquaSphere';
  const fromAddress = process.env.MAIL_FROM_ADDRESS || 'noreply@theaquasphere.org';
  const fromName = process.env.MAIL_FROM_NAME || companyName;

  const destination = (toEmail && toEmail !== 'info@theaquasphere.org')
    ? toEmail
    : (process.env.COMPANY_CONTACT_EMAIL || toEmail || (isWadaana ? 'support@wadaanaindustries.com' : 'info@theaquasphere.org'));
  const sanitizedName = String(name || '').trim();
  const sanitizedEmail = String(email || '').trim();
  const sanitizedMessage = String(message || '').trim();
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short' });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New Contact Inquiry - ${companyName}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <tr>
      <td style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px 32px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em;">${companyName} Contact Inquiry</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Received via Website Contact Form</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 120px; font-weight: 600;">Customer Name:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 700;">${sanitizedName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Customer Email:</td>
            <td style="padding: 6px 0; font-size: 14px; color: #0284c7; font-weight: 600;"><a href="mailto:${sanitizedEmail}" style="color: #0284c7; text-decoration: none;">${sanitizedEmail}</a></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Submitted At:</td>
            <td style="padding: 6px 0; font-size: 13px; color: #475569;">${timestamp} PKT</td>
          </tr>
        </table>

        <div style="margin-bottom: 28px;">
          <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Inquiry Message:</h4>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; padding: 16px 20px; border-radius: 4px; font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap;">${sanitizedMessage}</div>
        </div>

        <div style="text-align: center; padding-top: 10px;">
          <a href="mailto:${sanitizedEmail}?subject=Re: Inquiry with ${companyName}" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 6px; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);">Reply Directly to Customer</a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; font-size: 12px; color: #94a3b8; text-align: center;">
        This email was automatically generated by ${companyName} Web Portal.
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `New Contact Inquiry for ${companyName}\n\nFrom: ${sanitizedName} (${sanitizedEmail})\nDate: ${timestamp} PKT\n\nMessage:\n${sanitizedMessage}\n\nReply directly to: ${sanitizedEmail}`;

  try {
    const info = await mailer.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: destination,
      replyTo: sanitizedEmail,
      subject: `New Customer Inquiry: ${sanitizedName}`,
      text,
      html
    });
    console.log(`[Contact Mailer] Inquiry email sent to ${destination} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Contact Mailer] Failed to dispatch email via SMTP:', err.message);
    return { success: false, error: err.message };
  }
}

export { getTransporter };

