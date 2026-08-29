import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword } from '../utils/passwordUtils.js';

function resolveTenant(raw) {
  const comp = (raw || '').toLowerCase();
  if (!['aquasphere', 'wadaana'].includes(comp)) throw new ApiError(400, 'Invalid or missing company parameter');
  return comp;
}

export const getUsers = asyncHandler(async (req, res) => {
  const prefix = resolveTenant(req.query.company);
  const users = await prisma[`${prefix}User`].findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }
  });
  if (!users) throw new ApiError(404, 'No users found');
  res.status(200).json(new ApiResponse(200, users, 'Users fetched'));
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, company } = req.body;
  if (!email || !password || !company) throw new ApiError(400, 'Email, password, and company are required');
  const prefix = resolveTenant(company);

  const userName = name || email.split('@')[0];
  const user = await prisma[`${prefix}User`].create({
    data: { name: userName, email, passwordHash: await hashPassword(password), role: role || 'ADMIN' }
  });

  res.status(201).json(new ApiResponse(201, { id: user.id, email: user.email, company: prefix, name: user.name, role: user.role }, 'User created'));
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, role, company, password } = req.body;
  if (!company) throw new ApiError(400, 'Company parameter is required for update');
  const prefix = resolveTenant(company);

  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (role) updateData.role = role;
  if (password) updateData.passwordHash = await hashPassword(password);

  const updatedUser = await prisma[`${prefix}User`].update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isActive: true }
  });

  res.status(200).json(new ApiResponse(200, updatedUser, 'User updated successfully'));
});

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
