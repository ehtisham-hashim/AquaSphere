import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';
import { broadcastEvent } from '../utils/sseBus.js';
import { uploadImage } from '../utils/cloudinaryUpload.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { createAuditLog } from '../utils/auditLog.js';
import { sendSuccess } from '../utils/response.js';

const VALID_CATEGORIES = [
  'Raw Materials',
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
  const { startDate, endDate, page, limit, vehicleId, category, cursor } = req.query;

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

  if (vehicleId && vehicleId.trim()) {
    where.vehicleId = vehicleId.trim();
  }

  const TM_ALLOWED_CATEGORIES = ['Fuel / Transport', 'Fuel', 'Vehicle Repairs', 'Vehicle Repair', 'Maintenance'];

  if (category && category !== 'ALL') {
    if (req.user?.role === 'TRANSPORT_MANAGER' && !TM_ALLOWED_CATEGORIES.includes(category)) {
      where.category = '__BLOCKED__';
    } else {
      where.category = category;
    }
  } else if (req.user?.role === 'TRANSPORT_MANAGER' && !where.vehicleId) {
    where.category = { in: TM_ALLOWED_CATEGORIES };
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = limit ? Math.min(200, Math.max(1, parseInt(limit, 10) || 200)) : 200;

  const isTransportManager = req.user?.role === 'TRANSPORT_MANAGER';
  const shouldIncludePurchases = !isTransportManager && !vehicleId && (!category || category === 'ALL' || category === 'Raw Materials');

  // If filtering strictly for Raw Materials, query purchases only
  if (category === 'Raw Materials') {
    if (!shouldIncludePurchases) {
      return sendSuccess(res, [], 200, {
        nextCursor: null,
        hasMore: false,
        pagination: { page: pageNum, limit: pageSize, totalCount: 0, totalPages: 1, hasMore: false }
      });
    }

    const purchaseWhere = {};
    if (startDate || endDate) {
      purchaseWhere.purchaseDate = {};
      if (startDate) purchaseWhere.purchaseDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        purchaseWhere.purchaseDate.lte = end;
      }
    }

    const skip = (pageNum - 1) * pageSize;
    const [pCount, rawPurchases] = await Promise.all([
      prisma[`${prefix}Purchase`].count({ where: purchaseWhere }),
      prisma[`${prefix}Purchase`].findMany({
        where: purchaseWhere,
        orderBy: [{ purchaseDate: 'desc' }, { id: 'desc' }],
        include: {
          vendor: { select: { id: true, name: true } }
        },
        skip,
        take: pageSize
      })
    ]);

    const mapped = rawPurchases.map(pu => ({
      id: `pur_${pu.id}`,
      purchaseId: pu.id,
      category: 'Raw Materials',
      amount: Number(pu.grandTotal || 0),
      remarks: `Invoice #${pu.invoiceNo || 'N/A'} • ${pu.vendor?.name || 'Vendor'}${pu.remarks ? ` — ${pu.remarks}` : ''}`,
      receiptUrl: pu.receiptUrl || '',
      createdAt: pu.purchaseDate || pu.createdAt,
      createdBy: { name: pu.createdBy || 'Staff' },
      isPurchase: true,
      paymentStatus: pu.paymentStatus,
      vendorName: pu.vendor?.name
    }));

    return sendSuccess(res, mapped, 200, {
      nextCursor: null,
      hasMore: skip + mapped.length < pCount,
      pagination: {
        page: pageNum,
        limit: pageSize,
        totalCount: pCount,
        totalPages: Math.ceil(pCount / pageSize) || 1,
        hasMore: skip + mapped.length < pCount
      }
    });
  }

  let totalCount;
  let expenses;
  let hasMore;
  let nextCursor;

  if (cursor) {
    try {
      const rawExpenses = await prisma[`${prefix}Expense`].findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
          vehicle: { select: { id: true, name: true, plateNumber: true, model: true } }
        },
        take: pageSize + 1,
        skip: 1,
        cursor: { id: cursor }
      });
      hasMore = rawExpenses.length > pageSize;
      expenses = hasMore ? rawExpenses.slice(0, pageSize) : rawExpenses;
      nextCursor = hasMore && expenses.length > 0 ? expenses[expenses.length - 1].id : null;
    } catch (err) {
      if (err.code === 'P2025') {
        expenses = [];
        hasMore = false;
        nextCursor = null;
      } else {
        throw err;
      }
    }
  } else if (shouldIncludePurchases && (!category || category === 'ALL')) {
    const purchaseWhere = {};
    if (startDate || endDate) {
      purchaseWhere.purchaseDate = {};
      if (startDate) purchaseWhere.purchaseDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        purchaseWhere.purchaseDate.lte = end;
      }
    }

    const [expCount, purCount, rawExpenses, rawPurchases] = await Promise.all([
      prisma[`${prefix}Expense`].count({ where }),
      prisma[`${prefix}Purchase`].count({ where: purchaseWhere }),
      prisma[`${prefix}Expense`].findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
          vehicle: { select: { id: true, name: true, plateNumber: true, model: true } }
        },
        take: pageSize * pageNum
      }),
      prisma[`${prefix}Purchase`].findMany({
        where: purchaseWhere,
        orderBy: [{ purchaseDate: 'desc' }, { id: 'desc' }],
        include: {
          vendor: { select: { id: true, name: true } }
        },
        take: pageSize * pageNum
      })
    ]);

    const mappedPurchases = rawPurchases.map(pu => ({
      id: `pur_${pu.id}`,
      purchaseId: pu.id,
      category: 'Raw Materials',
      amount: Number(pu.grandTotal || 0),
      remarks: `Invoice #${pu.invoiceNo || 'N/A'} • ${pu.vendor?.name || 'Vendor'}${pu.remarks ? ` — ${pu.remarks}` : ''}`,
      receiptUrl: pu.receiptUrl || '',
      createdAt: pu.purchaseDate || pu.createdAt,
      createdBy: { name: pu.createdBy || 'Staff' },
      isPurchase: true,
      paymentStatus: pu.paymentStatus,
      vendorName: pu.vendor?.name
    }));

    const combined = [...rawExpenses, ...mappedPurchases]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    totalCount = expCount + purCount;
    const skip = (pageNum - 1) * pageSize;
    expenses = combined.slice(skip, skip + pageSize);
    hasMore = skip + expenses.length < totalCount;
    nextCursor = hasMore && expenses.length > 0 ? expenses[expenses.length - 1].id : null;
  } else {
    const skip = (pageNum - 1) * pageSize;
    const [count, rawExpenses] = await Promise.all([
      prisma[`${prefix}Expense`].count({ where }),
      prisma[`${prefix}Expense`].findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
          vehicle: { select: { id: true, name: true, plateNumber: true, model: true } }
        },
        skip,
        take: pageSize
      })
    ]);
    totalCount = count;
    expenses = rawExpenses;
    hasMore = skip + expenses.length < totalCount;
    nextCursor = hasMore && expenses.length > 0 ? expenses[expenses.length - 1].id : null;
  }

  return sendSuccess(res, expenses, 200, {
    nextCursor,
    hasMore,
    pagination: {
      page: pageNum,
      limit: pageSize,
      totalCount: totalCount ?? expenses.length,
      totalPages: totalCount ? (Math.ceil(totalCount / pageSize) || 1) : 1,
      hasMore
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

  const TM_ALLOWED_CATEGORIES = ['Fuel / Transport', 'Fuel', 'Vehicle Repairs', 'Vehicle Repair'];
  if (req.user?.role === 'TRANSPORT_MANAGER') {
    if (!TM_ALLOWED_CATEGORIES.includes(category)) {
      throw new ApiError(403, 'Transport managers are only permitted to log vehicle expenses (Fuel, Vehicle Repairs).');
    }
    if (!vehicleId) {
      throw new ApiError(400, 'Please select a car/vehicle for transport expenses');
    }
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
  broadcastEvent(prefix, 'EXPENSE_LOGGED', { expenseId: expense.id, category, amount: expense.amount });
  return sendSuccess(res, expense, 201);
});

// ponytail: return receiptUrl at both root and data for client compatibility
export const uploadExpenseReceipt = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Receipt file is required');
  const prefix = getTenantPrefix(req);
  const { secure_url } = await uploadImage(req.file, `${prefix}/expenses`);
  return sendSuccess(res, { receiptUrl: secure_url }, 200, { receiptUrl: secure_url });
});

/** Deletes an expense record */
export const deleteExpense = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;

  const existing = await prisma[`${prefix}Expense`].findUnique({
    where: { id }
  });

  if (existing) {
    if (req.user?.role === 'TRANSPORT_MANAGER' && !existing.vehicleId) {
      throw new ApiError(403, 'Transport managers are only permitted to delete vehicle expenses.');
    }
    await prisma[`${prefix}Expense`].delete({
      where: { id }
    });

    await createAuditLog(prefix, {
      action: 'EXPENSE_DELETED',
      entityType: 'EXPENSE',
      entityId: id,
      details: { category: existing.category, amount: existing.amount, vehicleId: existing.vehicleId },
      performedBy: req.user?.id || 'SYSTEM'
    });

    broadcastDashboardUpdate(prefix);
    broadcastEvent(prefix, 'EXPENSE_LOGGED', { deletedExpenseId: id });
    return sendSuccess(res, { message: 'Expense deleted successfully' }, 200);
  }

  // Fallback to legacy TransportExpense if exists
  if (prisma[`${prefix}TransportExpense`]) {
    const legacyExpense = await prisma[`${prefix}TransportExpense`].findUnique({ where: { id } });
    if (legacyExpense) {
      await prisma[`${prefix}TransportExpense`].delete({ where: { id } });
      await createAuditLog(prefix, {
        action: 'EXPENSE_DELETED',
        entityType: 'EXPENSE',
        entityId: id,
        details: { category: legacyExpense.type, amount: legacyExpense.amount, vehicleId: legacyExpense.vehicleId },
        performedBy: req.user?.id || 'SYSTEM'
      });
      broadcastDashboardUpdate(prefix);
      broadcastEvent(prefix, 'EXPENSE_LOGGED', { deletedExpenseId: id });
      return sendSuccess(res, { message: 'Expense deleted successfully' }, 200);
    }
  }

  throw new ApiError(404, 'Expense not found');
});
