import { prisma } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const getUsers = asyncHandler(async (req, res) => {
  const company = (req.query.company || '').toLowerCase();
  if (!['aquasphere', 'wadaana'].includes(company)) throw new ApiError(400, 'Invalid or missing company parameter');

  let users;
  if (company === 'aquasphere') {
    users = await prisma.aquasphereUser.findMany({ select: { id: true, email: true, role: true, isActive: true, createdAt: true } });
  } else {
    users = await prisma.wadaanaUser.findMany({ select: { id: true, email: true, role: true, isActive: true, createdAt: true } });
  }
  
  if (!users) throw new ApiError(404, 'No users found');
  res.status(200).json(new ApiResponse(200, users, 'Users fetched'));
});

export const createUser = asyncHandler(async (req, res) => {
  const { email, password, role, company } = req.body;
  if (!email || !password || !company) throw new ApiError(400, 'Email, password, and company are required');
  const comp = company.toLowerCase();
  if (!['aquasphere', 'wadaana'].includes(comp)) throw new ApiError(400, 'Invalid company parameter');
  
  let user;
  if (comp === 'aquasphere') {
    user = await prisma.aquasphereUser.create({
      data: { name: email.split('@')[0], email, passwordHash: password, role: role || 'ADMIN' }
    });
  } else {
    user = await prisma.wadaanaUser.create({
      data: { name: email.split('@')[0], email, passwordHash: password, role: role || 'ADMIN' }
    });
  }
  
  res.status(201).json(new ApiResponse(201, { id: user.id, email: user.email, company: comp }, 'User created'));
});
