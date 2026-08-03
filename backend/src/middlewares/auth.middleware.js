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

  // Determine tenant from query, cookies, or header
  const rawTenant = (
    req.query?.tenant ||
    req.query?.company ||
    req.cookies?.tenant ||
    req.cookies?.company ||
    req.headers['x-company-context'] ||
    req.headers['x-tenant'] ||
    'aquasphere'
  ).toString().toLowerCase();
  const requestedPrefix = rawTenant === 'wadaana' ? 'wadaana' : 'aquasphere';

  // Look up user in requested tenant first
  let user = await prisma[`${requestedPrefix}User`].findUnique({
    where: { id: decodedToken.id },
    select: { id: true, email: true, name: true, role: true, isActive: true }
  });

  // Fallback: check the other tenant (handles cross-context owners/admins)
  let resolvedPrefix = requestedPrefix;
  if (!user) {
    const fallbackPrefix = requestedPrefix === 'wadaana' ? 'aquasphere' : 'wadaana';
    user = await prisma[`${fallbackPrefix}User`].findUnique({
      where: { id: decodedToken.id },
      select: { id: true, email: true, name: true, role: true, isActive: true }
    });
    // IMPORTANT: update resolvedPrefix to where we actually found the user
    if (user) resolvedPrefix = fallbackPrefix;
  }

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid access token or user is inactive');
  }

  req.user = user;
  // Use the tenant from the request header (not where the user was found)
  // This allows owners to switch context freely
  req.tenant = requestedPrefix;
  next();
});
