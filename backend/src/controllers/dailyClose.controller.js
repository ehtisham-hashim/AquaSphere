import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { invalidateDailyCloseLockCache } from '../middlewares/dailyClose.middleware.js';

const getPrefix = getTenantPrefix;

/**
 * Finalizes and locks daily operations for the specified calendar date by Admin or Owner.
 *
 * @param {import('express').Request} req - Express request object containing date.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const closeDay = asyncHandler(async (req, res) => {
  const { date } = req.body;
  if (!date) throw new ApiError(400, 'Date is required');
  
  if (req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
    throw new ApiError(403, 'Unauthorized to perform daily close');
  }

  const prefix = getPrefix(req);
  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0); // Midnight UTC

  const dailyCloseModel = prisma[`${prefix}DailyClose`];
  const auditLogModel = prisma[`${prefix}AuditLog`];

  const existing = await dailyCloseModel.findFirst({
    where: { date: targetDate }
  });

  if (existing?.adminConfirmed) {
    throw new ApiError(400, 'Day is already finalized by Admin');
  }

  const updateFields = {
    adminConfirmed: true,
    closedAt: new Date(),
    closedById: req.user.id
  };
  if (!existing?.pmConfirmed) {
    updateFields.pmConfirmed = true;
    updateFields.pmConfirmedAt = new Date();
    updateFields.pmConfirmedById = req.user.id;
  }
  if (!existing?.mmConfirmed) {
    updateFields.mmConfirmed = true;
    updateFields.mmConfirmedAt = new Date();
    updateFields.mmConfirmedById = req.user.id;
  }

  const closedDay = await dailyCloseModel.upsert({
    where: { date: targetDate },
    update: updateFields,
    create: {
      date: targetDate,
      pmConfirmed: true,
      pmConfirmedAt: new Date(),
      pmConfirmedById: req.user.id,
      mmConfirmed: true,
      mmConfirmedAt: new Date(),
      mmConfirmedById: req.user.id,
      adminConfirmed: true,
      closedById: req.user.id
    }
  });

  await auditLogModel.create({
    data: {
      action: 'DAILY_CLOSE',
      entityType: 'DailyClose',
      entityId: closedDay.id,
      performedBy: req.user.id,
      details: `Day ${targetDate.toISOString().split('T')[0]} closed`
    }
  });

  invalidateDailyCloseLockCache(prefix, targetDate.toISOString().split('T')[0]);

  res.status(200).json(new ApiResponse(200, closedDay, 'Day closed successfully'));
});

/**
 * Retrieves multi-role confirmation status and comprehensive daily operational stats for a specific date.
 *
 * @param {import('express').Request} req - Express request object containing query date.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getDailyCloseStatus = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) throw new ApiError(400, 'Date is required');

  const prefix = getPrefix(req);
  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);

  const dailyCloseModel = prisma[`${prefix}DailyClose`];
  const existing = await dailyCloseModel.findFirst({
    where: { date: targetDate },
    include: { 
      closedBy: { select: { id: true, name: true } },
      pmConfirmedBy: { select: { id: true, name: true } },
      mmConfirmedBy: { select: { id: true, name: true } }
    }
  });

  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const prodBatchModel = prisma[`${prefix}ProductionBatch`];
  const orderModel = prisma[`${prefix}Order`];
  const customerModel = prisma[`${prefix}Customer`];

  const itemModel = prisma[`${prefix}Item`];

  const [prodStats, orderStats, customerBottleStats, pendingBatchesCount, negativeStockCount] = await Promise.all([
    prodBatchModel.aggregate({
      where: {
        batchDate: {
          gte: targetDate,
          lt: nextDate
        }
      },
      _sum: {
        quantity: true,
        packs05L: true,
        packs15L: true,
        brokenBottles05L: true,
        brokenBottles15L: true,
        wasteQuantity: true
      },
      _count: {
        id: true
      }
    }),
    orderModel.findMany({
      where: {
        createdAt: {
          gte: targetDate,
          lt: nextDate
        }
      },
      include: {
        items: true
      }
    }),
    customerModel.aggregate({
      where: {
        archivedAt: null
      },
      _sum: prefix === 'wadaana' 
        ? { cachedBottleBalance: true } 
        : { cachedBottleBalance: true, qty19L: true }
    }),
    prodBatchModel.count({
      where: {
        batchDate: { gte: targetDate, lt: nextDate },
        status: 'PENDING'
      }
    }),
    itemModel.count({
      where: {
        archivedAt: null,
        cachedQty: { lt: 0 }
      }
    })
  ]);

  const batchConsumptionModel = prisma[`${prefix}ProductionBatchConsumption`];
  const consumptions = await batchConsumptionModel.findMany({
    where: {
      batch: {
        batchDate: { gte: targetDate, lt: nextDate }
      }
    },
    include: { item: true }
  });

  const materialConsumptionMap = {};
  for (const c of consumptions) {
    const itemName = c.item?.name || 'Raw Material';
    const unit = c.item?.unit || 'units';
    if (!materialConsumptionMap[itemName]) {
      materialConsumptionMap[itemName] = { name: itemName, quantity: 0, unit };
    }
    materialConsumptionMap[itemName].quantity += Number(c.quantity) || 0;
  }
  const materialConsumption = Object.values(materialConsumptionMap);

  let ordersTotalWorth = 0;
  for (const ord of orderStats) {
    for (const item of ord.items || []) {
      const q = Number(item.quantity) || 0;
      const p = Number(item.price || item.unitPrice) || 0;
      ordersTotalWorth += q * p;
    }
  }

  const totalCustomerBottles = (customerBottleStats._sum.cachedBottleBalance || 0) || (customerBottleStats._sum.qty19L || 0);

  const adminConfirmed = existing?.adminConfirmed || false;
  const pmConfirmed = adminConfirmed || existing?.pmConfirmed || false;
  const mmConfirmed = adminConfirmed || existing?.mmConfirmed || false;

  res.status(200).json(new ApiResponse(200, {
    isClosed: adminConfirmed,
    pmConfirmed,
    mmConfirmed,
    adminConfirmed,
    closedAt: existing?.closedAt || null,
    pmConfirmedAt: existing?.pmConfirmedAt || null,
    mmConfirmedAt: existing?.mmConfirmedAt || null,
    closedBy: existing?.closedBy || null,
    pmConfirmedBy: existing?.pmConfirmedBy || (adminConfirmed ? existing?.closedBy : null),
    mmConfirmedBy: existing?.mmConfirmedBy || (adminConfirmed ? existing?.closedBy : null),
    pendingBatchesCount,
    negativeStockCount,
    materialConsumption,
    productionTotals: {
      batchesCount: prodStats._count.id || 0,
      total19L: prodStats._sum.quantity || 0,
      packs05L: prodStats._sum.packs05L || 0,
      packs15L: prodStats._sum.packs15L || 0,
      waste19L: prodStats._sum.wasteQuantity || 0,
      broken05L: prodStats._sum.brokenBottles05L || 0,
      broken15L: prodStats._sum.brokenBottles15L || 0
    },
    marketingTotals: {
      ordersCount: orderStats.length,
      ordersTotalWorth,
      customerBottlesCount: totalCustomerBottles
    }
  }, 'Daily close status retrieved'));
});

/**
 * Confirms production operations for the specified date by Production Manager.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const pmConfirmDailyClose = asyncHandler(async (req, res) => {
  const { date } = req.body;
  if (!date) throw new ApiError(400, 'Date is required');

  if (req.user.role !== 'PRODUCTION_MANAGER' && req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Unauthorized to perform PM confirmation');
  }

  const prefix = getPrefix(req);
  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);

  const dailyCloseModel = prisma[`${prefix}DailyClose`];
  const auditLogModel = prisma[`${prefix}AuditLog`];

  const existing = await dailyCloseModel.findFirst({
    where: { date: targetDate }
  });

  if (existing?.adminConfirmed) {
    throw new ApiError(400, 'Day is already finalized by Admin');
  }

  const updatedDay = await dailyCloseModel.upsert({
    where: { date: targetDate },
    update: {
      pmConfirmed: true,
      pmConfirmedAt: new Date(),
      pmConfirmedById: req.user.id
    },
    create: {
      date: targetDate,
      pmConfirmed: true,
      pmConfirmedAt: new Date(),
      pmConfirmedById: req.user.id
    }
  });

  await auditLogModel.create({
    data: {
      action: 'PM_DAILY_CONFIRM',
      entityType: 'DailyClose',
      entityId: updatedDay.id,
      performedBy: req.user.id,
      details: `PM confirmed production for Day ${targetDate.toISOString().split('T')[0]}`
    }
  });

  res.status(200).json(new ApiResponse(200, updatedDay, 'Production confirmed successfully'));
});

/**
 * Confirms orders and customer bottle balances for the specified date by Marketing Manager.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const mmConfirmDailyClose = asyncHandler(async (req, res) => {
  const { date } = req.body;
  if (!date) throw new ApiError(400, 'Date is required');

  if (req.user.role !== 'MARKETING_MANAGER' && req.user.role !== 'OWNER' && req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Unauthorized to perform MM confirmation');
  }

  const prefix = getPrefix(req);
  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);

  const dailyCloseModel = prisma[`${prefix}DailyClose`];
  const auditLogModel = prisma[`${prefix}AuditLog`];

  const existing = await dailyCloseModel.findFirst({
    where: { date: targetDate }
  });

  if (existing?.adminConfirmed) {
    throw new ApiError(400, 'Day is already finalized by Admin');
  }

  const updatedDay = await dailyCloseModel.upsert({
    where: { date: targetDate },
    update: {
      mmConfirmed: true,
      mmConfirmedAt: new Date(),
      mmConfirmedById: req.user.id
    },
    create: {
      date: targetDate,
      mmConfirmed: true,
      mmConfirmedAt: new Date(),
      mmConfirmedById: req.user.id
    }
  });

  await auditLogModel.create({
    data: {
      action: 'MM_DAILY_CONFIRM',
      entityType: 'DailyClose',
      entityId: updatedDay.id,
      performedBy: req.user.id,
      details: `MM confirmed orders and customer bottle holdings for Day ${targetDate.toISOString().split('T')[0]}`
    }
  });

  res.status(200).json(new ApiResponse(200, updatedDay, 'MM daily close confirmed successfully'));
});

/**
 * Retrieves full historical timeline of closed days enriched with production and order statistics.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getDailyCloseHistory = asyncHandler(async (req, res) => {
  const prefix = getPrefix(req);
  const dailyCloseModel = prisma[`${prefix}DailyClose`];
  const prodBatchModel = prisma[`${prefix}ProductionBatch`];
  
  const history = await dailyCloseModel.findMany({
    where: { adminConfirmed: true },
    orderBy: { date: 'desc' },
    include: { 
      closedBy: { select: { id: true, name: true } },
      pmConfirmedBy: { select: { id: true, name: true } },
      mmConfirmedBy: { select: { id: true, name: true } }
    },
    take: 30
  });

  if (history.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], 'Daily close history retrieved'));
  }

  // Calculate overall date range for the 30 days
  const minDate = new Date(history[history.length - 1].date);
  const maxDate = new Date(history[0].date);
  maxDate.setDate(maxDate.getDate() + 1);

  // Batch query all production batches and orders in date range (2 queries total instead of 90)
  const [allBatches, allOrders] = await Promise.all([
    prodBatchModel.findMany({
      where: { batchDate: { gte: minDate, lt: maxDate } },
      select: {
        batchDate: true,
        quantity: true,
        packs15L: true,
        packs05L: true,
        wasteQuantity: true,
        brokenBottles15L: true,
        brokenBottles05L: true
      }
    }),
    prisma[`${prefix}Order`].findMany({
      where: { createdAt: { gte: minDate, lt: maxDate } },
      select: {
        createdAt: true,
        items: {
          select: { quantity: true, price: true }
        }
      }
    })
  ]);

  // Group by YYYY-MM-DD
  const batchMap = new Map();
  for (const b of allBatches) {
    if (!b.batchDate) continue;
    const dStr = new Date(b.batchDate).toISOString().split('T')[0];
    if (!batchMap.has(dStr)) {
      batchMap.set(dStr, { total19L: 0, packs15L: 0, packs05L: 0, waste19L: 0, broken15L: 0, broken05L: 0 });
    }
    const acc = batchMap.get(dStr);
    acc.total19L += Number(b.quantity || 0);
    acc.packs15L += Number(b.packs15L || 0);
    acc.packs05L += Number(b.packs05L || 0);
    acc.waste19L += Number(b.wasteQuantity || 0);
    acc.broken15L += Number(b.brokenBottles15L || 0);
    acc.broken05L += Number(b.brokenBottles05L || 0);
  }

  const orderMap = new Map();
  for (const o of allOrders) {
    if (!o.createdAt) continue;
    const dStr = new Date(o.createdAt).toISOString().split('T')[0];
    if (!orderMap.has(dStr)) {
      orderMap.set(dStr, { count: 0, totalWorth: 0 });
    }
    const acc = orderMap.get(dStr);
    acc.count += 1;
    for (const item of o.items || []) {
      acc.totalWorth += (Number(item.quantity) || 0) * (Number(item.price) || 0);
    }
  }

  const historyWithStats = history.map(day => {
    const dStr = new Date(day.date).toISOString().split('T')[0];
    const pTotals = batchMap.get(dStr) || { total19L: 0, packs15L: 0, packs05L: 0, waste19L: 0, broken15L: 0, broken05L: 0 };
    const oTotals = orderMap.get(dStr) || { count: 0, totalWorth: 0 };

    return {
      ...day,
      productionTotals: pTotals,
      marketingTotals: {
        ordersCount: oTotals.count,
        ordersTotalWorth: oTotals.totalWorth
      }
    };
  });

  res.status(200).json(new ApiResponse(200, historyWithStats, 'Daily close history retrieved'));
});

/**
 * Reopens a finalized closed day for administrative corrections (restricted to OWNER role).
 *
 * @param {import('express').Request} req - Express request object containing date and reason.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const reopenDay = asyncHandler(async (req, res) => {
  const { date, reason } = req.body;
  if (!date) throw new ApiError(400, 'Date is required');
  if (!reason) throw new ApiError(400, 'Reason is required');

  if (req.user.role !== 'OWNER') {
    throw new ApiError(403, 'Only OWNER can reopen a closed day');
  }

  const prefix = getPrefix(req);
  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);

  const dailyCloseModel = prisma[`${prefix}DailyClose`];
  const auditLogModel = prisma[`${prefix}AuditLog`];

  const existing = await dailyCloseModel.findFirst({
    where: { date: targetDate }
  });

  if (!existing) {
    throw new ApiError(404, 'Day is not closed');
  }

  await dailyCloseModel.delete({
    where: { id: existing.id }
  });

  await auditLogModel.create({
    data: {
      action: 'DAILY_REOPEN',
      entityType: 'DailyClose',
      entityId: existing.id,
      performedBy: req.user.id,
      details: `Day ${targetDate.toISOString().split('T')[0]} reopened. Reason: ${reason}`
    }
  });

  res.status(200).json(new ApiResponse(200, null, 'Day reopened successfully'));
});
