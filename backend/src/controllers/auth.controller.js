import bcrypt from 'bcrypt';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateToken, verifyToken } from '../utils/jwtUtils.js';
import { prisma } from '../config/db.js';
import { sendOwner2FAEmail } from '../utils/mailer.js';

const getAuthCookieOptions = (req, includeMaxAge = true) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const isSecure = process.env.COOKIE_SECURE === 'true'
    ? true
    : process.env.COOKIE_SECURE === 'false'
    ? false
    : (process.env.NODE_ENV === 'production' && isHttps);

  const sameSiteEnv = (process.env.COOKIE_SAMESITE || '').toLowerCase();
  const sameSite = sameSiteEnv || 'lax';

  return {
    httpOnly: true,
    path: '/',
    secure: isSecure,
    sameSite,
    ...(includeMaxAge ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : {}) // 7 days session lifetime
  };
};

/**
 * Checks if Owner 2FA is active and properly configured with necessary environment variables.
 * If ENFORCE_OWNER_2FA is not 'true', or if OWNER_2FA_PRIMARY_EMAIL or MAIL_PASSWORD are omitted,
 * 2FA automatically disables itself to protect against owner lockouts.
 *
 * @returns {boolean}
 */
export const isOwner2FAEnabled = () => {
  const isEnforced = process.env.ENFORCE_OWNER_2FA === 'true';
  if (!isEnforced) return false;

  const primaryEmail = process.env.OWNER_2FA_PRIMARY_EMAIL?.trim();
  if (!primaryEmail) {
    console.warn('[2FA Auth] ENFORCE_OWNER_2FA is "true", but OWNER_2FA_PRIMARY_EMAIL is not set. Automatically disabling 2FA to prevent owner lockout.');
    return false;
  }

  const mailPassword = process.env.MAIL_PASSWORD?.trim();
  if (!mailPassword) {
    console.warn('[2FA Auth] ENFORCE_OWNER_2FA is "true", but MAIL_PASSWORD is not set. Automatically disabling 2FA to prevent owner lockout.');
    return false;
  }

  return true;
};

/**
 * Authenticates a user by email, password, and tenant, generating a JWT token and HTTP-only cookie.
 *
 * @param {import('express').Request} req - Express request object containing email, password, tenant.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password, tenant = 'aquasphere' } = req.body;
  const prefix = tenant.toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';

  if (!email || !password) {
    throw new ApiError(400, 'Email and password required');
  }

  const user = await prisma[`${prefix}User`].findUnique({
    where: { email },
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (user.role === 'OWNER' && isOwner2FAEnabled()) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 300 * 1000); // 5 minutes validity
    await prisma[`${prefix}User`].update({
      where: { id: user.id },
      data: { otpCode: otp, otpExpiresAt: expiresAt }
    });

    const primaryEmail = process.env.OWNER_2FA_PRIMARY_EMAIL.trim();
    const secondaryEmail = process.env.OWNER_2FA_SECONDARY_EMAIL?.trim() || null;
    const recipients = [primaryEmail, secondaryEmail].filter(Boolean);

    // Send 2FA email
    sendOwner2FAEmail({ to: recipients, otp, tenant: prefix, userName: user.name });

    console.log(`[2FA OTP] Code generated and sent to Owner (${recipients.join(', ')})`);

    const tempToken = generateToken({ id: user.id, role: user.role, tenant: prefix, is2FA: true }, '15m');

    return res.status(200).json(new ApiResponse(200, {
      require2FA: true,
      tempToken,
      emailMask: primaryEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length)),
      resendCooldown: 60
    }, 'Owner 2FA code sent'));
  }

  const token = generateToken({ id: user.id, role: user.role, tenant: prefix });

  const cookieOptions = getAuthCookieOptions(req, true);

  const { passwordHash: _passwordHash, ...userWithoutPassword } = user;

  res
    .status(200)
    .cookie('token', token, cookieOptions)
    .cookie('tenant', prefix, { path: '/', maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' })
    .json(new ApiResponse(200, { user: { ...userWithoutPassword, tenant: prefix }, token }, 'Login successful'));
});

/**
 * Logs out the authenticated user by clearing the JWT authentication cookie.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const logout = asyncHandler(async (req, res) => {
  const cookieOptions = getAuthCookieOptions(req, false);

  res
    .status(200)
    .clearCookie('token', cookieOptions)
    .clearCookie('token', { path: '/' })
    .clearCookie('tenant', { path: '/' })
    .clearCookie('company', { path: '/' })
    .json(new ApiResponse(200, null, 'Logged out successfully'));
});

/**
 * Retrieves the currently authenticated user's session profile.
 *
 * @param {import('express').Request} req - Express request object with req.user attached.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { user: { ...req.user, tenant: req.tenant || req.user?.tenant || 'aquasphere' } }, 'Current user retrieved'));
});

/**
 * Verifies Owner OTP code and grants full session cookie and JWT.
 */
export const verifyOwnerOtp = asyncHandler(async (req, res) => {
  const { tempToken, otp } = req.body;
  if (!tempToken || !otp) {
    throw new ApiError(400, 'Temporary token and OTP code are required');
  }

  const decoded = verifyToken(tempToken);
  if (!decoded || !decoded.is2FA || decoded.role !== 'OWNER') {
    throw new ApiError(401, 'Invalid or expired 2FA session');
  }

  const prefix = decoded.tenant;
  const user = await prisma[`${prefix}User`].findUnique({ where: { id: decoded.id } });
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User account not found or inactive');
  }

  if (!user.otpCode || user.otpCode !== String(otp).trim()) {
    throw new ApiError(400, 'Invalid OTP code');
  }

  if (!user.otpExpiresAt || new Date() > new Date(user.otpExpiresAt)) {
    throw new ApiError(400, 'OTP code has expired. Please request a new code.');
  }

  // Clear OTP
  await prisma[`${prefix}User`].update({
    where: { id: user.id },
    data: { otpCode: null, otpExpiresAt: null }
  });

  const token = generateToken({ id: user.id, role: user.role, tenant: prefix });

  const cookieOptions = getAuthCookieOptions(req, true);

  const { passwordHash: _passwordHash, otpCode: _o, otpExpiresAt: _oe, ...userWithoutPassword } = user;

  res
    .status(200)
    .cookie('token', token, cookieOptions)
    .cookie('tenant', prefix, { path: '/', maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' })
    .json(new ApiResponse(200, { user: { ...userWithoutPassword, tenant: prefix }, token }, 'Owner authenticated successfully'));
});

/**
 * Resends a fresh 6-digit OTP code to the Owner's registered email(s).
 */
export const resendOwnerOtp = asyncHandler(async (req, res) => {
  if (!isOwner2FAEnabled()) {
    throw new ApiError(400, 'Owner 2FA is not enabled or email settings are missing. Please log in directly.');
  }

  const { tempToken } = req.body;
  if (!tempToken) {
    throw new ApiError(400, 'Temporary token required');
  }

  const decoded = verifyToken(tempToken);
  if (!decoded || !decoded.is2FA || decoded.role !== 'OWNER') {
    throw new ApiError(401, 'Invalid or expired 2FA session');
  }

  const prefix = decoded.tenant;
  const user = await prisma[`${prefix}User`].findUnique({ where: { id: decoded.id } });
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User not found');
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 300 * 1000); // 5 minutes validity
  await prisma[`${prefix}User`].update({
    where: { id: user.id },
    data: { otpCode: otp, otpExpiresAt: expiresAt }
  });

  const primaryEmail = process.env.OWNER_2FA_PRIMARY_EMAIL.trim();
  const secondaryEmail = process.env.OWNER_2FA_SECONDARY_EMAIL?.trim() || null;
  const recipients = [primaryEmail, secondaryEmail].filter(Boolean);

  // Send 2FA email
  sendOwner2FAEmail({ to: recipients, otp, tenant: prefix, userName: user.name });

  console.log(`[2FA OTP Resend] Code generated and sent to Owner (${recipients.join(', ')})`);

  const newTempToken = generateToken({ id: user.id, role: user.role, tenant: prefix, is2FA: true }, '15m');

  return res.status(200).json(new ApiResponse(200, {
    resendCooldown: 60,
    tempToken: newTempToken
  }, 'New OTP sent successfully'));
});
