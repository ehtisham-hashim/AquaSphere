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

  const rawTenant = req.headers['x-company-context'] || req.headers['x-tenant'] || 'aquasphere';
  const tenantPrefix = rawTenant.toString().toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';

  let user = await prisma[`${tenantPrefix}User`].findUnique({
    where: { id: decodedToken.id },
    select: { id: true, email: true, name: true, role: true, isActive: true }
  });

  // Fallback check if user exists in other schema (for multi-tenant owners/admins)
  if (!user) {
    const fallbackPrefix = tenantPrefix === 'wadaana' ? 'aquasphere' : 'wadaana';
    user = await prisma[`${fallbackPrefix}User`].findUnique({
      where: { id: decodedToken.id },
      select: { id: true, email: true, name: true, role: true, isActive: true }
    });
  }

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid Access Token or User is inactive');
  }

  req.user = user;
  req.tenant = tenantPrefix;
  next();
});
