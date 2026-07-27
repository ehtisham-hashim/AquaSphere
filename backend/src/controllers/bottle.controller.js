import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

const getTenantPrefix = (req) => {
  const tenant = (req.headers['x-tenant'] || 'aquasphere').toLowerCase();
  return tenant === 'wadaana' ? 'wadaana' : 'aquasphere';
};

// GET /api/v1/bottles/summary
// Fleet reconciliation equation: Total Owned = At Factory + With Customers + Broken + Lost
export const getBottleSummary = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);

  const [transactions, customers] = await Promise.all([
    prisma[`${prefix}BottleTransaction`].findMany(),
    prisma[`${prefix}Customer`].findMany({
      where: { archivedAt: null },
      select: { cachedBottleBalance: true }
    })
  ]);

  let totalPurchased = 0;
  let brokenCount = 0;
  let lostCount = 0;

  for (const txn of transactions) {
    if (txn.type === 'NEW_PURCHASE') totalPurchased += txn.quantity;
    if (txn.type === 'RETURNED_BROKEN') brokenCount += txn.quantity;
    if (txn.type === 'MARKED_LOST') lostCount += txn.quantity;
  }

  const withCustomers = customers.reduce((sum, c) => sum + (c.cachedBottleBalance || 0), 0);
  const totalOwned = Math.max(0, totalPurchased - lostCount);
  const atFactory = Math.max(0, totalOwned - withCustomers - brokenCount);

  res.status(200).json({
    success: true,
    data: {
      totalPurchased,
      totalOwned,
      atFactory,
      withCustomers,
      broken: brokenCount,
      lost: lostCount,
      equationReconciled: (atFactory + withCustomers + brokenCount) === totalOwned
    }
  });
});

// GET /api/v1/bottles/transactions
export const getBottleTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, customerId } = req.query;
  const skip = (page - 1) * limit;
  const prefix = getTenantPrefix(req);

  const where = {};
  if (customerId) where.customerId = customerId;

  const [transactions, total] = await Promise.all([
    prisma[`${prefix}BottleTransaction`].findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } }
      }
    }),
    prisma[`${prefix}BottleTransaction`].count({ where })
  ]);

  res.status(200).json({
    success: true,
    data: transactions,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  });
});

// POST /api/v1/bottles/transactions
export const createBottleTransaction = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { customerId, type, quantity, reason } = req.body;

  const qty = parseInt(quantity);
  if (!type || isNaN(qty) || qty <= 0) {
    throw new ApiError(400, 'Valid transaction type and positive quantity are required');
  }

  const validTypes = [
    'NEW_PURCHASE',
    'DELIVERED_TO_CUSTOMER',
    'RETURNED_GOOD',
    'RETURNED_BROKEN',
    'MARKED_LOST',
    'AT_FACTORY_ADJUSTMENT'
  ];

  if (!validTypes.includes(type)) {
    throw new ApiError(400, `Invalid transaction type. Must be one of: ${validTypes.join(', ')}`);
  }

  const txn = await prisma.$transaction(async (tx) => {
    if (customerId) {
      const customer = await tx[`${prefix}Customer`].findUnique({ where: { id: customerId } });
      if (!customer) throw new ApiError(404, 'Customer not found');
    }

    const createdTxn = await tx[`${prefix}BottleTransaction`].create({
      data: {
        customerId: customerId || null,
        type,
        quantity: qty,
        reason: reason || null
      }
    });

    if (customerId) {
      let balanceChange = 0;
      if (type === 'DELIVERED_TO_CUSTOMER') balanceChange = qty;
      if (type === 'RETURNED_GOOD' || type === 'RETURNED_BROKEN') balanceChange = -qty;

      if (balanceChange !== 0) {
        await tx[`${prefix}Customer`].update({
          where: { id: customerId },
          data: { cachedBottleBalance: { increment: balanceChange } }
        });
      }
    }

    return createdTxn;
  });

  res.status(201).json({ success: true, data: txn });
});
