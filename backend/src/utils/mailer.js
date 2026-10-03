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
