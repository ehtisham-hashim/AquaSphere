import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwtUtils.js';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTenantPrefix } from '../utils/tenant.js';

// 60-second in-memory cache to prevent DB queries on every authenticated request
const userCache = new Map();
const USER_CACHE_TTL = 60_000;

/**
 * Invalidates cached authenticated user sessions for a specific user ID across all tenants.
 *
 * @param {string} userId - User identifier.
 */
export function invalidateUserCache(userId) {
  for (const key of userCache.keys()) {
    if (key.startsWith(`${userId}:`)) userCache.delete(key);
  }
}

/**
 * Express middleware to verify JWT authentication and enforce strict tenant isolation.
 * Prevents cross-tenant authorization bypass by ensuring users are authorized
 * for the requested tenant.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware callback.
 * @returns {Promise<void>}
 */
export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '') || req.query?.token;

  if (!token) {
    throw new ApiError(401, 'Unauthorized request');
  }

  const decodedToken = verifyToken(token);
  if (!decodedToken || !decodedToken.id) {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const requestedPrefix = getTenantPrefix(req);
  const tokenTenant = (decodedToken.tenant || 'aquasphere').toLowerCase();

  if (tokenTenant !== requestedPrefix) {
    throw new ApiError(401, 'Session belongs to a different company tenant. Please log in with credentials for this company.');
  }

  const cacheKey = `${decodedToken.id}:${requestedPrefix}`;
  const cached = userCache.get(cacheKey);

  if (cached && Date.now() - cached.ts < USER_CACHE_TTL) {
    req.user = cached.user;
    req.tenant = cached.tenant;
    return next();
  }

  // 1. Look up user directly in requested tenant table
  const user = await prisma[`${requestedPrefix}User`].findUnique({
    where: { id: decodedToken.id },
    select: { id: true, email: true, name: true, role: true, isActive: true }
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid access token or user is inactive');
  }

  const userWithTenant = { ...user, tenant: requestedPrefix };

  // Cache resolved user and verified tenant
  userCache.set(cacheKey, { user: userWithTenant, tenant: requestedPrefix, ts: Date.now() });

  req.user = userWithTenant;
  req.tenant = requestedPrefix;
  next();
});
