import { prisma } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const getUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true }
  });
  if (!users) throw new ApiError(404, 'No users found');
  res.status(200).json(new ApiResponse(200, users, 'Users fetched'));
});

export const createUser = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password required');
  
  const user = await prisma.user.create({
    data: { email, passwordHash: password, role: role || 'ADMIN' }
  });
  res.status(201).json(new ApiResponse(201, { id: user.id, email: user.email }, 'User created'));
});
