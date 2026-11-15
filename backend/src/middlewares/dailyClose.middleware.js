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
  // Owner is strictly exempt from daily close locks
  if (req.user?.role === 'OWNER') {
    return next();
  }

  const prefix = getTenantPrefix(req);
  const body = req.body || {};
  const url = req.baseUrl || req.originalUrl || '';
  const isPaymentRoute = url.includes('/payment') || url.includes('/payments');
  const datesToCheck = [];

  // For payment routes, payments are discrete cash transactions posted on paymentDate or today.
  // Validate the payment posting date rather than locking historical parent orders/purchases.
  if (isPaymentRoute) {
    const paymentDate = body.paymentDate || body.date || new Date();
    datesToCheck.push(paymentDate);
  } else if (req.params.id) {
    // For structural mutations (edits, cancellations, deletions, approvals) targeting an existing record:
    let modelName = null;
    let selectFields = { createdAt: true };

    if (url.includes('/orders')) {
      modelName = `${prefix}Order`;
      // Item edits and cancellations affect sales attributed to the order's createdAt date
      selectFields = { createdAt: true };
    } else if (url.includes('/purchases')) {
      modelName = `${prefix}Purchase`;
      selectFields = { createdAt: true, purchaseDate: true };
    } else if (url.includes('/production')) {
      modelName = `${prefix}ProductionBatch`;
      selectFields = { createdAt: true, batchDate: true };
    } else if (url.includes('/expenses')) {
      modelName = `${prefix}Expense`;
      selectFields = { createdAt: true };
    } else if (url.includes('/spot-sales')) {
      modelName = `${prefix}SpotSale`;
      selectFields = { createdAt: true };
    }

    if (modelName && prisma[modelName]) {
      const existingRecord = await prisma[modelName].findUnique({
        where: { id: req.params.id },
        select: selectFields
      });
      if (!existingRecord) {
        throw new ApiError(404, 'Record not found for daily close lock verification');
      }
      const storedDate = existingRecord.purchaseDate || existingRecord.batchDate || existingRecord.createdAt;
      if (storedDate) {
        datesToCheck.push(storedDate);
      }
    }
  }

  // Also validate incoming body date for creations or when moving a record to a new date
  if (!isPaymentRoute) {
    const bodyDate = body.date || body.batchDate || body.purchaseDate || body.expenseDate || body.expectedDelivery;
    if (bodyDate) {
      datesToCheck.push(bodyDate);
    }
  }

  // If neither existing record nor body date provided, fallback to current timestamp
  if (datesToCheck.length === 0) {
    datesToCheck.push(new Date());
  }

  // Check each relevant date against the daily close lock
  for (const dateVal of datesToCheck) {
    const parsed = new Date(dateVal);
    const transactionDate = isNaN(parsed.getTime()) ? new Date() : parsed;
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

    if (isLocked.value && req.user?.role !== 'OWNER') {
      throw new ApiError(403, 'Date is closed for editing. Contact Owner for adjustments.');
    }
  }

  next();
});
