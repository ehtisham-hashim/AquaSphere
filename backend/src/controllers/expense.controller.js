import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';
import { uploadImage } from '../utils/cloudinaryUpload.js';

const getTenantPrefix = (req) => {
  const rawTenant = req.tenant || req.headers['x-tenant'] || req.headers['x-company-context'] || req.query?.tenant || req.cookies?.tenant || req.cookies?.company || 'aquasphere';
  return rawTenant.toString().toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';
};

const VALID_CATEGORIES = [
  'Fuel / Transport', 'Fuel',
  'Salaries',
  'Electricity',
  'Plant Rent',
  'Vehicle Repairs', 'Vehicle Repair',
  'Machine Repairs', 'Machine Repair',
  'Maintenance',
  'Office Supplies',
  'Miscellaneous'
];

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
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          role: true
        }
      }
    },
    take: 5000
  });

  res.json({ success: true, data: expenses });
});

export const createExpense = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { category, amount, remarks, receiptUrl, expenseDate } = req.body;

  if (!category) throw new ApiError(400, 'Category is required');
  if (!VALID_CATEGORIES.includes(category)) {
    throw new ApiError(400, `Invalid Category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  const parsedAmount = Math.round(parseFloat(amount));
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new ApiError(400, 'Amount must be a valid integer greater than zero');
  }

  if (!receiptUrl || !receiptUrl.trim()) {
    throw new ApiError(400, 'Receipt photo is mandatory — text-only entries are not allowed');
  }

  const expense = await prisma[`${prefix}Expense`].create({
    data: {
      category,
      amount: parsedAmount,
      receiptUrl: receiptUrl.trim(),
      remarks: remarks || '',
      createdById: req.user?.id || null,
      createdAt: expenseDate ? new Date(expenseDate) : new Date()
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          role: true
        }
      }
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
  const { secure_url } = await uploadImage(req.file, `${prefix}/expenses`);
  res.status(200).json({ success: true, receiptUrl: secure_url });
});
