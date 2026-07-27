import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwtUtils.js';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new ApiError(401, 'Unauthorized request');
  }

  const decodedToken = verifyToken(token);

  if (!decodedToken) {
    throw new ApiError(401, 'Invalid or expired token');
  }

  let user = await prisma.aquasphereUser.findUnique({
    where: { id: decodedToken.id },
    select: { id: true, email: true, name: true, role: true, isActive: true }
  });

  if (!user) {
    user = await prisma.wadaanaUser.findUnique({
      where: { id: decodedToken.id },
      select: { id: true, email: true, name: true, role: true, isActive: true }
    });
  }

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid Access Token or User is inactive');
  }

  req.user = user;
  next();
});
