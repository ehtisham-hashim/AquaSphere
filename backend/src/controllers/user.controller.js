import bcrypt from 'bcrypt';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Validates and normalizes company parameter into a valid tenant prefix.
 *
 * @param {string} raw - Raw company parameter.
 * @returns {'aquasphere' | 'wadaana'}
 * @throws {ApiError} If tenant is invalid or missing.
 */
function resolveTenant(raw) {
  const comp = (raw || '').toLowerCase();
  if (!['aquasphere', 'wadaana'].includes(comp)) throw new ApiError(400, 'Invalid or missing company parameter');
  return comp;
}

/**
 * Retrieves all registered users for a specified company/tenant.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getUsers = asyncHandler(async (req, res) => {
  const prefix = resolveTenant(req.query.company);
  const users = await prisma[`${prefix}User`].findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }
  });
  if (!users) throw new ApiError(404, 'No users found');
  res.status(200).json(new ApiResponse(200, users, 'Users fetched'));
});

/**
 * Creates a new user with hashed credentials under the specified tenant.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, company } = req.body;
  if (!email || !password || !company) throw new ApiError(400, 'Email, password, and company are required');
  const prefix = resolveTenant(company);

  const userName = name || email.split('@')[0];
  const user = await prisma[`${prefix}User`].create({
    data: { name: userName, email, passwordHash: await bcrypt.hash(password, 10), role: role || 'ADMIN' }
  });

  res.status(201).json(new ApiResponse(201, { id: user.id, email: user.email, company: prefix, name: user.name, role: user.role }, 'User created'));
});

/**
 * Updates user profile details, roles, or password.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, role, company, password } = req.body;
  if (!company) throw new ApiError(400, 'Company parameter is required for update');
  const prefix = resolveTenant(company);

  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (role) updateData.role = role;
  if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

  const updatedUser = await prisma[`${prefix}User`].update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isActive: true }
  });

  res.status(200).json(new ApiResponse(200, updatedUser, 'User updated successfully'));
});

/**
 * Activates or deactivates a user account.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { company, isActive } = req.body;
  if (!company || typeof isActive !== 'boolean') throw new ApiError(400, 'Company and isActive (boolean) are required');
  const prefix = resolveTenant(company);

  const updatedUser = await prisma[`${prefix}User`].update({
    where: { id },
    data: { isActive },
    select: { id: true, name: true, email: true, role: true, isActive: true }
  });

  res.status(200).json(new ApiResponse(200, updatedUser, `User ${isActive ? 'restored' : 'archived'} successfully`));
});
