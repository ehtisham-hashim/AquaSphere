import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';

const getTenantPrefix = (req) => {
  const tenant = (req.headers['x-tenant'] || 'aquasphere').toLowerCase();
  return tenant === 'wadaana' ? 'wadaana' : 'aquasphere';
};

export const getExpenses = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const expenses = await prisma[`${prefix}Expense`].findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  res.json({ success: true, data: expenses });
});

export const createExpense = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { category, amount, skipReceiptCheck } = req.body;
  const receiptUrl = req.file?.path || ''; 

  if (!category || !amount) throw new ApiError(400, 'Missing fields');

  if (!receiptUrl && !skipReceiptCheck) {
    throw new ApiError(400, 'Receipt photo is mandatory for expenses');
  }

  const expense = await prisma[`${prefix}Expense`].create({
    data: { category, amount: parseFloat(amount), receiptUrl }
  });

  broadcastDashboardUpdate(prefix);
  res.status(201).json({ success: true, data: expense });
});
