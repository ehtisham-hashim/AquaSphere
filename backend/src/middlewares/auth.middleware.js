import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwtUtils.js';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTenantPrefix } from '../utils/tenant.js';

// 60-second in-memory cache to prevent DB queries on every authenticated request
const userCache = new Map();
const USER_CACHE_TTL = 60_000;

export function invalidateUserCache(userId) {
  for (const key of userCache.keys()) {
    if (key.startsWith(`${userId}:`)) userCache.delete(key);
  }
}

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new ApiError(401, 'Unauthorized request');
  }

  const decodedToken = verifyToken(token);
  if (!decodedToken) {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const requestedPrefix = getTenantPrefix(req);
  const cacheKey = `${decodedToken.id}:${requestedPrefix}`;
  const cached = userCache.get(cacheKey);

  if (cached && Date.now() - cached.ts < USER_CACHE_TTL) {
    req.user = cached.user;
    req.tenant = requestedPrefix;
    return next();
  }

  // Look up user in requested tenant first
  let user = await prisma[`${requestedPrefix}User`].findUnique({
    where: { id: decodedToken.id },
    select: { id: true, email: true, name: true, role: true, isActive: true }
  });

  // Fallback: check other tenant (cross-tenant owners/admins)
  if (!user) {
    const fallbackPrefix = requestedPrefix === 'wadaana' ? 'aquasphere' : 'wadaana';
    user = await prisma[`${fallbackPrefix}User`].findUnique({
      where: { id: decodedToken.id },
      select: { id: true, email: true, name: true, role: true, isActive: true }
    });
  }

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid access token or user is inactive');
  }

  userCache.set(cacheKey, { user, ts: Date.now() });

  req.user = user;
  req.tenant = requestedPrefix;
  next();
});
