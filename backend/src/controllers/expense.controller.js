import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';
import { uploadImage } from '../utils/cloudinaryUpload.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { createAuditLog } from '../utils/auditLog.js';

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

/**
 * Retrieves filtered list of expenses by date range with creator details.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getExpenses = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { startDate, endDate, page, limit } = req.query;

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

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = limit ? Math.min(200, Math.max(1, parseInt(limit, 10) || 200)) : 200;
  const skip = (pageNum - 1) * pageSize;

  const [totalCount, expenses] = await Promise.all([
    prisma[`${prefix}Expense`].count({ where }),
    prisma[`${prefix}Expense`].findMany({
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
      skip,
      take: pageSize
    })
  ]);

  const hasMore = skip + expenses.length < totalCount;

  res.json({
    success: true,
    data: expenses,
    pagination: {
      page: pageNum,
      limit: pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
      hasMore
    }
  });
});

/**
 * Creates a new expense entry with mandatory receipt proof and audit logging.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
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
  await createAuditLog(prefix, {
    action: 'EXPENSE_CREATED',
    entityType: 'EXPENSE',
    entityId: expense.id,
    details: { category, amount: expense.amount },
    performedBy: req.user?.id || 'SYSTEM'
  });

  broadcastDashboardUpdate(prefix);
  res.status(201).json({ success: true, data: expense });
});

/**
 * Uploads an expense receipt photo to Cloudinary storage.
 *
 * @param {import('express').Request} req - Express request object with file.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const uploadExpenseReceipt = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Receipt file is required');
  const prefix = getTenantPrefix(req);
  const { secure_url } = await uploadImage(req.file, `${prefix}/expenses`);
  res.status(200).json({ success: true, receiptUrl: secure_url });
});
