import bcrypt from 'bcrypt';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateToken, verifyToken } from '../utils/jwtUtils.js';
import { prisma } from '../config/db.js';
import { sendOwner2FAEmail } from '../utils/mailer.js';

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

  if (process.env.ENFORCE_OWNER_2FA === 'true' && user.role === 'OWNER') {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 300 * 1000); // 5 minutes validity
    await prisma[`${prefix}User`].update({
      where: { id: user.id },
      data: { otpCode: otp, otpExpiresAt: expiresAt }
    });

    const primaryEmail = process.env.OWNER_2FA_PRIMARY_EMAIL || user.email;
    const secondaryEmail = process.env.OWNER_2FA_SECONDARY_EMAIL || null;
    const recipients = [primaryEmail, secondaryEmail].filter(Boolean);

    // Send 2FA email via ZeptoMail
    sendOwner2FAEmail({ to: recipients, otp, tenant: prefix, userName: user.name });

    console.log(`[2FA OTP] Code generated and sent to Owner (${recipients.join(', ')}): ${otp}`);

    const tempToken = generateToken({ id: user.id, role: user.role, tenant: prefix, is2FA: true }, '15m');

    return res.status(200).json(new ApiResponse(200, {
      require2FA: true,
      tempToken,
      emailMask: primaryEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length)),
      resendCooldown: 60
    }, 'Owner 2FA code sent'));
  }

  const token = generateToken({ id: user.id, role: user.role, tenant: prefix });

  const isSecure = process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false');

  const cookieOptions = {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  };

  const { passwordHash: _passwordHash, ...userWithoutPassword } = user;

  res
    .status(200)
    .cookie('token', token, cookieOptions)
    .cookie('tenant', prefix, { path: '/', maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' })
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
  const isSecure = process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false');

  const cookieOptions = {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
  };

  res
    .status(200)
    .clearCookie('token', cookieOptions)
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
  res.status(200).json(new ApiResponse(200, { user: req.user }, 'Current user retrieved'));
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

  const isSecure = process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false');
  const cookieOptions = {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  };

  const { passwordHash: _passwordHash, otpCode: _o, otpExpiresAt: _oe, ...userWithoutPassword } = user;

  res
    .status(200)
    .cookie('token', token, cookieOptions)
    .cookie('tenant', prefix, { path: '/', maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' })
    .json(new ApiResponse(200, { user: { ...userWithoutPassword, tenant: prefix }, token }, 'Owner authenticated successfully'));
});

/**
 * Resends a fresh 6-digit OTP code to the Owner's registered email(s).
 */
export const resendOwnerOtp = asyncHandler(async (req, res) => {
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

  const primaryEmail = process.env.OWNER_2FA_PRIMARY_EMAIL || user.email;
  const secondaryEmail = process.env.OWNER_2FA_SECONDARY_EMAIL || null;
  const recipients = [primaryEmail, secondaryEmail].filter(Boolean);

  // Send 2FA email via ZeptoMail
  sendOwner2FAEmail({ to: recipients, otp, tenant: prefix, userName: user.name });

  console.log(`[2FA OTP Resend] Code generated and sent to Owner (${recipients.join(', ')}): ${otp}`);

  const newTempToken = generateToken({ id: user.id, role: user.role, tenant: prefix, is2FA: true }, '15m');

  return res.status(200).json(new ApiResponse(200, {
    resendCooldown: 60,
    tempToken: newTempToken
  }, 'New OTP sent successfully'));
});
