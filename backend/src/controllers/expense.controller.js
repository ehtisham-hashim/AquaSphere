import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';
import { uploadToCloudinary } from '../utils/cloudinaryUpload.js';

const getTenantPrefix = (req) => {
  const tenant = (req.headers['x-tenant'] || 'aquasphere').toLowerCase();
  return tenant === 'wadaana' ? 'wadaana' : 'aquasphere';
};

const VALID_CATEGORIES = ['Fuel', 'Salaries', 'Electricity', 'Plant Rent', 'Vehicle Repair', 'Machine Repair', 'Miscellaneous'];

export const getExpenses = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { startDate, endDate } = req.query;

  const where = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const expenses = await prisma[`${prefix}Expense`].findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json({ success: true, data: expenses });
});

export const createExpense = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { category, amount, remarks, receiptUrl, expenseDate } = req.body;

  if (!category) throw new ApiError(400, 'Category is required');
  if (!VALID_CATEGORIES.includes(category)) {
    throw new ApiError(400, `Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  if (!amount || parseFloat(amount) <= 0) throw new ApiError(400, 'Amount must be greater than zero');
  if (!receiptUrl || !receiptUrl.trim()) {
    throw new ApiError(400, 'Receipt photo is mandatory — text-only entries are not allowed');
  }

  const expense = await prisma[`${prefix}Expense`].create({
    data: {
      category,
      amount: parseFloat(amount),
      receiptUrl: receiptUrl.trim(),
      remarks: remarks || '',
      createdAt: expenseDate ? new Date(expenseDate) : new Date()
    }
  });

  // Audit log
  try {
    await prisma[`${prefix}AuditLog`].create({
      data: {
        action: 'EXPENSE_CREATED',
        entityType: 'EXPENSE',
        entityId: expense.id,
        details: JSON.stringify({ category, amount: expense.amount }),
        performedBy: req.user?.id || 'SYSTEM'
      }
    });
  } catch (_) {}

  broadcastDashboardUpdate(prefix);
  res.status(201).json({ success: true, data: expense });
});

export const uploadExpenseReceipt = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Receipt file is required');
  const prefix = getTenantPrefix(req);
  const receiptUrl = await uploadToCloudinary(req.file.buffer, `${prefix}/expense-receipts`);
  res.status(200).json({ success: true, receiptUrl });
});
