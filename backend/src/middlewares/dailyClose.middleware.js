import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const getPrefix = (req) => (req.headers['x-tenant'] || 'aquasphere').toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';

export const checkDailyCloseLock = asyncHandler(async (req, res, next) => {
  const prefix = getPrefix(req);
  
  // Extract transaction date from various possible body fields
  let transactionDateRaw = req.body.date || req.body.batchDate || req.body.purchaseDate || req.body.deliveredAt;
  
  // If editing an existing record by ID and no date is explicitly passed in body, fetch original record
  if (!transactionDateRaw && req.params.id) {
    const url = req.baseUrl || req.originalUrl || '';
    let modelName = null;
    
    if (url.includes('/orders')) modelName = `${prefix}Order`;
    else if (url.includes('/purchases')) modelName = `${prefix}Purchase`;
    else if (url.includes('/production')) modelName = `${prefix}ProductionBatch`;
    else if (url.includes('/expenses')) modelName = `${prefix}Expense`;

    if (modelName && prisma[modelName]) {
      try {
        const existingRecord = await prisma[modelName].findUnique({ where: { id: req.params.id } });
        if (existingRecord) {
          transactionDateRaw = existingRecord.createdAt || existingRecord.batchDate || existingRecord.purchaseDate || existingRecord.deliveredAt || existingRecord.date;
        }
      } catch (err) {
        // Silently fallback if record not found
      }
    }
  }

  let transactionDate = transactionDateRaw ? new Date(transactionDateRaw) : new Date();
  transactionDate.setUTCHours(0, 0, 0, 0);

  const dailyCloseModel = prisma[`${prefix}DailyClose`];
  
  const closedRecord = await dailyCloseModel.findFirst({
    where: {
      date: {
        gte: transactionDate
      }
    }
  });

  if (closedRecord && req.user.role !== 'OWNER') {
    throw new ApiError(403, 'Date is closed for editing by Admin. Contact Owner to request override.');
  }

  next();
});
