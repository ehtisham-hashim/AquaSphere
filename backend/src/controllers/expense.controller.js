import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';
import { uploadImage } from '../utils/cloudinaryUpload.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { createAuditLog } from '../utils/auditLog.js';
import { sendSuccess } from '../utils/response.js';

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

// ponytail: include vehicle info and filter for transport expenses
export const getExpenses = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { startDate, endDate, page, limit, vehicleId, category } = req.query;

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

  if (vehicleId) {
    where.vehicleId = vehicleId;
  }

  if (category && category !== 'ALL') {
    where.category = category;
  }

  // TM only sees transport-related expenses
  if (req.user?.role === 'TRANSPORT_MANAGER') {
    where.OR = [
      { vehicleId: { not: null } },
      { category: { in: ['Fuel / Transport', 'Fuel', 'Vehicle Repairs', 'Vehicle Repair', 'Maintenance'] } },
      { createdById: req.user.id }
    ];
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
        createdBy: { select: { id: true, name: true, role: true } },
        vehicle: { select: { id: true, name: true, plateNumber: true, model: true } }
      },
      skip,
      take: pageSize
    })
  ]);

  return sendSuccess(res, expenses, 200, {
    pagination: {
      page: pageNum,
      limit: pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize) || 1,
      hasMore: skip + expenses.length < totalCount
    }
  });
});

/** Creates a new expense entry with mandatory receipt proof and audit logging */
export const createExpense = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { category, amount, remarks, receiptUrl, expenseDate, vehicleId } = req.body;

  if (!category) throw new ApiError(400, 'Category is required');
  if (!VALID_CATEGORIES.includes(category)) {
    throw new ApiError(400, `Invalid Category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (req.user?.role === 'TRANSPORT_MANAGER' && !vehicleId) {
    throw new ApiError(400, 'Please select a car/vehicle for transport expenses');
  }

  if (vehicleId) {
    const vehicleExists = await prisma[`${prefix}Vehicle`].findUnique({ where: { id: vehicleId } });
    if (!vehicleExists) throw new ApiError(404, 'Selected vehicle not found');
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
      vehicleId: vehicleId || null,
      createdById: req.user?.id || null,
      createdAt: expenseDate ? new Date(expenseDate) : new Date()
    },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      vehicle: { select: { id: true, name: true, plateNumber: true } }
    }
  });

  await createAuditLog(prefix, {
    action: 'EXPENSE_CREATED',
    entityType: 'EXPENSE',
    entityId: expense.id,
    details: { category, amount: expense.amount, vehicleId: expense.vehicleId },
    performedBy: req.user?.id || 'SYSTEM'
  });

  broadcastDashboardUpdate(prefix);
  return sendSuccess(res, expense, 201);
});

// ponytail: return receiptUrl at both root and data for client compatibility
export const uploadExpenseReceipt = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Receipt file is required');
  const prefix = getTenantPrefix(req);
  const { secure_url } = await uploadImage(req.file, `${prefix}/expenses`);
  return sendSuccess(res, { receiptUrl: secure_url }, 200, { receiptUrl: secure_url });
});
