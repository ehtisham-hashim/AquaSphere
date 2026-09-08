import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTenantPrefix } from '../utils/tenant.js';

// 60-second in-memory cache for daily close status per tenant and date
const lockCache = new Map();
const LOCK_CACHE_TTL = 60_000;

/**
 * Invalidates the in-memory daily close lock cache for a tenant and optional specific date.
 *
 * @param {'aquasphere' | 'wadaana'} prefix - Tenant schema prefix.
 * @param {string} [dateStr] - Optional ISO date string (YYYY-MM-DD).
 * @returns {void}
 */
export function invalidateDailyCloseLockCache(prefix, dateStr) {
  if (dateStr) {
    lockCache.delete(`${prefix}:${dateStr}`);
  } else {
    for (const key of lockCache.keys()) {
      if (key.startsWith(`${prefix}:`)) lockCache.delete(key);
    }
  }
}

/**
 * Express middleware that checks if the target transaction date has been locked by Daily Close.
 * Rejects modifications with 403 unless user possesses the OWNER role.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @returns {Promise<void>}
 */
export const checkDailyCloseLock = asyncHandler(async (req, res, next) => {
  // Owner and Admin are always exempt from daily close locks
  if (req.user?.role === 'OWNER' || req.user?.role === 'ADMIN') {
    return next();
  }

  const prefix = getTenantPrefix(req);
  const body = req.body || {};
  
  // Extract transaction date from various possible body fields
  let transactionDateRaw = body.date || body.batchDate || body.purchaseDate || body.deliveredAt;
  
  // If editing an existing record by ID and no date is passed in body
  if (!transactionDateRaw && req.params.id) {
    const url = req.baseUrl || req.originalUrl || '';
    let modelName = null;
    let selectFields = { createdAt: true };
    
    if (url.includes('/orders')) {
      modelName = `${prefix}Order`;
      selectFields = { createdAt: true, deliveredAt: true };
    } else if (url.includes('/purchases')) {
      modelName = `${prefix}Purchase`;
      selectFields = { createdAt: true, purchaseDate: true };
    } else if (url.includes('/production')) {
      modelName = `${prefix}ProductionBatch`;
      selectFields = { createdAt: true, batchDate: true };
    } else if (url.includes('/expenses')) {
      modelName = `${prefix}Expense`;
      selectFields = { createdAt: true, date: true };
    } else if (url.includes('/spot-sales')) {
      modelName = `${prefix}SpotSale`;
      selectFields = { createdAt: true };
    }

    if (modelName && prisma[modelName]) {
      try {
        const existingRecord = await prisma[modelName].findUnique({
          where: { id: req.params.id },
          select: selectFields
        });
        if (existingRecord) {
          transactionDateRaw = existingRecord.purchaseDate || existingRecord.batchDate || existingRecord.deliveredAt || existingRecord.date || existingRecord.createdAt;
        }
      } catch (_err) {
        // Silently fallback if record not found
      }
    }
  }

  let transactionDate;
  if (transactionDateRaw) {
    const parsed = new Date(transactionDateRaw);
    transactionDate = isNaN(parsed.getTime()) ? new Date() : parsed;
  } else {
    transactionDate = new Date();
  }
  transactionDate.setUTCHours(0, 0, 0, 0);
  const dateStr = transactionDate.toISOString().split('T')[0];
  const cacheKey = `${prefix}:${dateStr}`;

  let isLocked = lockCache.get(cacheKey);
  if (isLocked === undefined || Date.now() - isLocked.ts >= LOCK_CACHE_TTL) {
    const dailyCloseModel = prisma[`${prefix}DailyClose`];
    const closedRecord = await dailyCloseModel.findFirst({
      where: {
        date: transactionDate,
        adminConfirmed: true
      },
      select: { id: true }
    });
    const lockedBool = !!closedRecord;
    lockCache.set(cacheKey, { value: lockedBool, ts: Date.now() });
    isLocked = { value: lockedBool };
  }

  if (isLocked.value && !['OWNER', 'ADMIN'].includes(req.user?.role)) {
    throw new ApiError(403, 'Date is closed for editing. Contact Admin or Owner for adjustments.');
  }

  next();
});
