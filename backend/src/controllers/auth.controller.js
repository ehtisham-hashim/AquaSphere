import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { comparePassword } from '../utils/passwordUtils.js';
import { generateToken } from '../utils/jwtUtils.js';
import { prisma } from '../config/db.js';

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

  const isPasswordValid = await comparePassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const token = generateToken({ id: user.id, role: user.role });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  };

  const { passwordHash: _passwordHash, ...userWithoutPassword } = user;

  res
    .status(200)
    .cookie('token', token, cookieOptions)
    .json(new ApiResponse(200, { user: userWithoutPassword, token }, 'Login successful'));
});

/**
 * Logs out the authenticated user by clearing the JWT authentication cookie.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const logout = asyncHandler(async (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
  };

  res
    .status(200)
    .clearCookie('token', cookieOptions)
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
