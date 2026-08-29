import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTenantPrefix } from '../utils/tenant.js';

// 60-second in-memory cache for daily close status per tenant and date
const lockCache = new Map();
const LOCK_CACHE_TTL = 60_000;

export function invalidateDailyCloseLockCache(prefix, dateStr) {
  if (dateStr) {
    lockCache.delete(`${prefix}:${dateStr}`);
  } else {
    for (const key of lockCache.keys()) {
      if (key.startsWith(`${prefix}:`)) lockCache.delete(key);
    }
  }
}

export const checkDailyCloseLock = asyncHandler(async (req, res, next) => {
  const prefix = getTenantPrefix(req);
  
  // Extract transaction date from various possible body fields
  let transactionDateRaw = req.body.date || req.body.batchDate || req.body.purchaseDate || req.body.deliveredAt;
  
  // If editing an existing record by ID and no date is passed in body
  if (!transactionDateRaw && req.params.id) {
    const url = req.baseUrl || req.originalUrl || '';
    let modelName = null;
    
    if (url.includes('/orders')) modelName = `${prefix}Order`;
    else if (url.includes('/purchases')) modelName = `${prefix}Purchase`;
    else if (url.includes('/production')) modelName = `${prefix}ProductionBatch`;
    else if (url.includes('/expenses')) modelName = `${prefix}Expense`;
    else if (url.includes('/spot-sales')) modelName = `${prefix}SpotSale`;

    if (modelName && prisma[modelName]) {
      try {
        const existingRecord = await prisma[modelName].findUnique({
          where: { id: req.params.id },
          select: { createdAt: true, date: true, batchDate: true, purchaseDate: true, deliveredAt: true }
        });
        if (existingRecord) {
          transactionDateRaw = existingRecord.createdAt || existingRecord.batchDate || existingRecord.purchaseDate || existingRecord.deliveredAt || existingRecord.date;
        }
      } catch (_err) {
        // Silently fallback if record not found
      }
    }
  }

  let transactionDate = transactionDateRaw ? new Date(transactionDateRaw) : new Date();
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
    throw new ApiError(403, 'Date is closed for editing by Admin. Contact Owner to request override.');
  }

  next();
});
