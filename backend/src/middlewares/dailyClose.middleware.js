import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const getPrefix = (req) => (req.headers['x-tenant'] || 'aquasphere').toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';

export const checkDailyCloseLock = asyncHandler(async (req, res, next) => {
  const prefix = getPrefix(req);
  
  // Extract transaction date from various possible body fields
  let transactionDateRaw = req.body.date || req.body.batchDate || req.body.purchaseDate || req.body.deliveredAt;
  
  let transactionDate;
  if (transactionDateRaw) {
    transactionDate = new Date(transactionDateRaw);
  } else {
    transactionDate = new Date();
  }
  
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
