import nodemailer from 'nodemailer';

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
 * Generates an elegant, high-end HTML email template for 2FA OTP.
 * Colors: Emerald Green for AquaSphere, Sky Blue for Wadaana.
 *
 * @param {object} params
 * @param {string} params.otp - 6-digit OTP code
 * @param {string} params.tenant - 'aquasphere' | 'wadaana'
 * @returns {string} HTML string
 */
export function build2FAEmailHtml({ otp, tenant = 'aquasphere' }) {
  const isWadaana = tenant.toLowerCase() === 'wadaana';

  // Company theme tokens
  const companyName = isWadaana ? 'Wadaana Industries' : 'AquaSphere';
  const companySubtitle = isWadaana ? 'Industrial Preforms & Blow Molding OS' : 'Beverage & Water Plant OS';
  const primaryColor = isWadaana ? '#0284c7' : '#059669'; // Sky-600 vs Emerald-600
  const accentColor = isWadaana ? '#0ea5e9' : '#10b981'; // Sky-500 vs Emerald-500
  const bgLight = isWadaana ? '#f0f9ff' : '#ecfdf5'; // Sky-50 vs Emerald-50
  const borderColor = isWadaana ? '#bae6fd' : '#a7f3d0'; // Sky-200 vs Emerald-200
  const badgeTextColor = isWadaana ? '#0369a1' : '#047857';

  // Format OTP into "123 456" for readability
  const formattedOtp = otp.length === 6 ? `${otp.slice(0, 3)} ${otp.slice(3)}` : otp;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${companyName} Security Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          
          <!-- Top Accent Bar -->
          <tr>
            <td height="6" style="background: linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%);"></td>
          </tr>

          <!-- Header / Brand -->
          <tr>
            <td align="center" style="padding: 36px 36px 12px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="vertical-align: middle;">
                    <div style="font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                      ${companyName}
                    </div>
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-top: 4px;">
                      ${companySubtitle}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Security Pill Badge -->
          <tr>
            <td align="center" style="padding: 12px 36px 0 36px;">
              <div style="display: inline-block; padding: 6px 14px; background-color: ${bgLight}; border: 1px solid ${borderColor}; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: ${badgeTextColor};">
                Account Verification
              </div>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center" style="padding: 18px 36px 8px 36px;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.25; letter-spacing: -0.5px;">
                Confirm Your Login to<br><span style="color: ${primaryColor};">Secure Your Account</span>
              </h1>
            </td>
          </tr>

          <!-- Subtitle / Explanation -->
          <tr>
            <td align="center" style="padding: 0 40px 24px 40px;">
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #64748b; text-align: center;">
                An Owner login attempt was detected on your management console. Please confirm your authorization using the 6-digit verification code below.
              </p>
            </td>
          </tr>

          <!-- OTP Box -->
          <tr>
            <td align="center" style="padding: 0 40px 28px 40px;">
              <div style="background-color: ${bgLight}; border: 2px dashed ${borderColor}; border-radius: 18px; padding: 22px 28px; text-align: center;">
                <div style="font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: ${primaryColor}; text-indent: 8px;">
                  ${formattedOtp}
                </div>
                <div style="margin-top: 10px; font-size: 12px; font-weight: 600; color: #64748b;">
                  ⏱️ Code expires in <strong style="color: #0f172a;">5 minutes</strong>
                </div>
              </div>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 12px; padding: 14px 18px; border: 1px solid #f1f5f9;">
                <tr>
                  <td style="font-size: 12px; line-height: 1.5; color: #475569;">
                    🔒 <strong>Security Warning:</strong> Never share this code with anyone. ${companyName} administrators will never request this OTP over call or messaging apps.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="border-top: 1px solid #f1f5f9; padding: 0;"></td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 40px 32px 40px; background-color: #fcfdfd;">
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">
                ${companyName} OS • Automated Security System
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                If you did not initiate this sign-in attempt, please reset your password immediately.
              </p>
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
 * @param {string} [params.tenant] - 'aquasphere' | 'wadaana'
 */
export async function sendOwner2FAEmail({ to, otp, tenant = 'aquasphere' }) {
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

  const isWadaana = tenant.toLowerCase() === 'wadaana';
  const companyName = isWadaana ? 'Wadaana Industries' : 'Aquasphere';
  const fromAddress = process.env.MAIL_FROM_ADDRESS || 'noreply@theaquasphere.org';
  const fromName = process.env.MAIL_FROM_NAME || companyName;

  const html = build2FAEmailHtml({ otp, tenant });
  const subject = `${companyName} Verification Code: ${otp}`;
  const text = `Your ${companyName} verification code is: ${otp}. It expires in 5 minutes.\n\nSecurity Notice: Never share this code with anyone. If you did not request this login, please secure your account immediately.`;

  try {
    const info = await mailer.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: validRecipients.join(', '),
      replyTo: fromAddress,
      subject,
      text,
      html,
      headers: {
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'All',
        'Priority': 'Urgent',
        'Importance': 'high',
        'X-Priority': '1'
      }
    });

    console.log(`[2FA Mailer] Verification email sent to ${validRecipients.join(', ')} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId, recipients: validRecipients };
  } catch (err) {
    console.error('[2FA Mailer] Failed to send email via ZeptoMail SMTP:', err.message);
    // Return gracefully without crashing caller; caller can log fallback OTP
    return { success: false, error: err.message };
  }
}
