import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { createAuditLog } from '../utils/auditLog.js';
import { sendSuccess } from '../utils/response.js';
import { invalidateDailyCloseLockCache } from '../middlewares/dailyClose.middleware.js';

const parseDateRange = (dateStr) => {
  const start = new Date(dateStr);
  start.setUTCHours(0, 0, 0, 0);
  const next = new Date(start);
  next.setDate(next.getDate() + 1);
  return { start, next, dateKey: start.toISOString().split('T')[0] };
};

/** Finalizes and locks daily operations by Admin or Owner */
export const closeDay = asyncHandler(async (req, res) => {
  const { date } = req.body;
  if (!date) throw new ApiError(400, 'Date is required');
  if (req.user.role !== 'ACCOUNTANT' && req.user.role !== 'OWNER') {
    throw new ApiError(403, 'Unauthorized to perform daily close');
  }

  const prefix = getTenantPrefix(req);
  const { start: targetDate, dateKey } = parseDateRange(date);
  const dailyCloseModel = prisma[`${prefix}DailyClose`];

  const existing = await dailyCloseModel.findFirst({ where: { date: targetDate } });
  if (existing?.adminConfirmed) throw new ApiError(400, 'Day is already finalized by Admin');

  const now = new Date();
  const updateFields = {
    adminConfirmed: true,
    closedAt: now,
    closedById: req.user.id,
    ...(!existing?.pmConfirmed ? { pmConfirmed: true, pmConfirmedAt: now, pmConfirmedById: req.user.id } : {}),
    ...(!existing?.mmConfirmed ? { mmConfirmed: true, mmConfirmedAt: now, mmConfirmedById: req.user.id } : {})
  };

  const closedDay = await dailyCloseModel.upsert({
    where: { date: targetDate },
    update: updateFields,
    create: {
      date: targetDate,
      pmConfirmed: true,
      pmConfirmedAt: now,
      pmConfirmedById: req.user.id,
      mmConfirmed: true,
      mmConfirmedAt: now,
      mmConfirmedById: req.user.id,
      adminConfirmed: true,
      closedById: req.user.id
    }
  });

  await createAuditLog(prefix, {
    action: 'DAILY_CLOSE',
    entityType: 'DailyClose',
    entityId: closedDay.id,
    performedBy: req.user.id,
    details: `Day ${dateKey} closed`
  });

  invalidateDailyCloseLockCache(prefix, dateKey);
  return sendSuccess(res, closedDay, 200, { message: 'Day closed successfully' });
});

/** Retrieves multi-role confirmation status and daily stats for a specific date */
export const getDailyCloseStatus = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) throw new ApiError(400, 'Date is required');

  const prefix = getTenantPrefix(req);
  const { start: targetDate, next: nextDate } = parseDateRange(date);

  const [existing, prodStats, orderStats, customerBottleStats, pendingBatchesCount, negativeStockCount, consumptions] = await Promise.all([
    prisma[`${prefix}DailyClose`].findFirst({
      where: { date: targetDate },
      include: {
        closedBy: { select: { id: true, name: true } },
        pmConfirmedBy: { select: { id: true, name: true } },
        mmConfirmedBy: { select: { id: true, name: true } }
      }
    }),
    prisma[`${prefix}ProductionBatch`].aggregate({
      where: { batchDate: { gte: targetDate, lt: nextDate } },
      _sum: { quantity: true, packs05L: true, packs15L: true, brokenBottles05L: true, brokenBottles15L: true, wasteQuantity: true },
      _count: { id: true }
    }),
    prisma[`${prefix}Order`].findMany({
      where: { createdAt: { gte: targetDate, lt: nextDate } },
      select: { items: { select: { quantity: true, price: true } } }
    }),
    prisma[`${prefix}Customer`].aggregate({
      where: { archivedAt: null },
      _sum: prefix === 'wadaana' ? { cachedBottleBalance: true } : { cachedBottleBalance: true, qty19L: true }
    }),
    prisma[`${prefix}ProductionBatch`].count({
      where: { batchDate: { gte: targetDate, lt: nextDate }, status: 'PENDING' }
    }),
    prisma[`${prefix}Item`].count({
      where: { archivedAt: null, cachedQty: { lt: 0 } }
    }),
    prisma[`${prefix}ProductionBatchConsumption`].findMany({
      where: { batch: { batchDate: { gte: targetDate, lt: nextDate } } },
      select: { quantityUsed: true, item: { select: { name: true, unit: true } } }
    })
  ]);

  const matMap = Object.create(null);
  for (const c of consumptions) {
    const name = c.item?.name || 'Raw Material';
    const unit = c.item?.unit || 'units';
    matMap[name] ||= { name, quantity: 0, unit };
    matMap[name].quantity += Number(c.quantityUsed || 0);
  }

  let ordersTotalWorth = 0;
  for (const ord of orderStats) {
    for (const item of ord.items || []) {
      ordersTotalWorth += (Number(item.quantity) || 0) * (Number(item.price) || 0);
    }
  }

  const totalCustomerBottles = customerBottleStats._sum.cachedBottleBalance || customerBottleStats._sum.qty19L || 0;
  const adminConfirmed = existing?.adminConfirmed || false;

  return sendSuccess(res, {
    isClosed: adminConfirmed,
    pmConfirmed: adminConfirmed || existing?.pmConfirmed || false,
    mmConfirmed: adminConfirmed || existing?.mmConfirmed || false,
    adminConfirmed,
    closedAt: existing?.closedAt || null,
    pmConfirmedAt: existing?.pmConfirmedAt || null,
    mmConfirmedAt: existing?.mmConfirmedAt || null,
    closedBy: existing?.closedBy || null,
    pmConfirmedBy: existing?.pmConfirmedBy || (adminConfirmed ? existing?.closedBy : null),
    mmConfirmedBy: existing?.mmConfirmedBy || (adminConfirmed ? existing?.closedBy : null),
    pendingBatchesCount,
    negativeStockCount,
    materialConsumption: Object.values(matMap),
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
  }, 200, { message: 'Daily close status retrieved' });
});

/** Confirms production operations by Production Manager */
export const pmConfirmDailyClose = asyncHandler(async (req, res) => {
  const { date } = req.body;
  if (!date) throw new ApiError(400, 'Date is required');
  if (!['PRODUCTION_MANAGER', 'OWNER', 'ADMIN'].includes(req.user.role)) {
    throw new ApiError(403, 'Unauthorized to perform PM confirmation');
  }

  const prefix = getTenantPrefix(req);
  const { start: targetDate, dateKey } = parseDateRange(date);
  const dailyCloseModel = prisma[`${prefix}DailyClose`];

  const existing = await dailyCloseModel.findFirst({ where: { date: targetDate } });
  if (existing?.adminConfirmed) throw new ApiError(400, 'Day is already finalized by Admin');

  const updatedDay = await dailyCloseModel.upsert({
    where: { date: targetDate },
    update: { pmConfirmed: true, pmConfirmedAt: new Date(), pmConfirmedById: req.user.id },
    create: { date: targetDate, pmConfirmed: true, pmConfirmedAt: new Date(), pmConfirmedById: req.user.id }
  });

  await createAuditLog(prefix, {
    action: 'PM_DAILY_CONFIRM',
    entityType: 'DailyClose',
    entityId: updatedDay.id,
    performedBy: req.user.id,
    details: `PM confirmed production for Day ${dateKey}`
  });

  return sendSuccess(res, updatedDay, 200, { message: 'Production confirmed successfully' });
});

/** Confirms orders and customer bottles by Marketing Manager */
export const mmConfirmDailyClose = asyncHandler(async (req, res) => {
  const { date } = req.body;
  if (!date) throw new ApiError(400, 'Date is required');
  if (!['MARKETING_MANAGER', 'OWNER', 'ADMIN'].includes(req.user.role)) {
    throw new ApiError(403, 'Unauthorized to perform MM confirmation');
  }

  const prefix = getTenantPrefix(req);
  const { start: targetDate, dateKey } = parseDateRange(date);
  const dailyCloseModel = prisma[`${prefix}DailyClose`];

  const existing = await dailyCloseModel.findFirst({ where: { date: targetDate } });
  if (existing?.adminConfirmed) throw new ApiError(400, 'Day is already finalized by Admin');

  const updatedDay = await dailyCloseModel.upsert({
    where: { date: targetDate },
    update: { mmConfirmed: true, mmConfirmedAt: new Date(), mmConfirmedById: req.user.id },
    create: { date: targetDate, mmConfirmed: true, mmConfirmedAt: new Date(), mmConfirmedById: req.user.id }
  });

  await createAuditLog(prefix, {
    action: 'MM_DAILY_CONFIRM',
    entityType: 'DailyClose',
    entityId: updatedDay.id,
    performedBy: req.user.id,
    details: `MM confirmed orders and customer bottle holdings for Day ${dateKey}`
  });

  return sendSuccess(res, updatedDay, 200, { message: 'MM daily close confirmed successfully' });
});

/** Retrieves 30-day historical timeline of closed days */
export const getDailyCloseHistory = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const history = await prisma[`${prefix}DailyClose`].findMany({
    where: { adminConfirmed: true },
    orderBy: { date: 'desc' },
    include: {
      closedBy: { select: { id: true, name: true } },
      pmConfirmedBy: { select: { id: true, name: true } },
      mmConfirmedBy: { select: { id: true, name: true } }
    },
    take: 30
  });

  if (history.length === 0) return sendSuccess(res, [], 200, { message: 'Daily close history retrieved' });

  const minDate = new Date(history[history.length - 1].date);
  const maxDate = new Date(history[0].date);
  maxDate.setDate(maxDate.getDate() + 1);

  const [allBatches, allOrders] = await Promise.all([
    prisma[`${prefix}ProductionBatch`].findMany({
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
      select: { createdAt: true, items: { select: { quantity: true, price: true } } }
    })
  ]);

  const batchMap = new Map();
  for (const b of allBatches) {
    if (!b.batchDate) continue;
    const dStr = new Date(b.batchDate).toISOString().split('T')[0];
    const acc = batchMap.get(dStr) || { total19L: 0, packs15L: 0, packs05L: 0, waste19L: 0, broken15L: 0, broken05L: 0 };
    acc.total19L += Number(b.quantity || 0);
    acc.packs15L += Number(b.packs15L || 0);
    acc.packs05L += Number(b.packs05L || 0);
    acc.waste19L += Number(b.wasteQuantity || 0);
    acc.broken15L += Number(b.brokenBottles15L || 0);
    acc.broken05L += Number(b.brokenBottles05L || 0);
    batchMap.set(dStr, acc);
  }

  const orderMap = new Map();
  for (const o of allOrders) {
    if (!o.createdAt) continue;
    const dStr = new Date(o.createdAt).toISOString().split('T')[0];
    const acc = orderMap.get(dStr) || { count: 0, totalWorth: 0 };
    acc.count += 1;
    for (const item of o.items || []) {
      acc.totalWorth += (Number(item.quantity) || 0) * (Number(item.price) || 0);
    }
    orderMap.set(dStr, acc);
  }

  const historyWithStats = history.map(day => {
    const dStr = new Date(day.date).toISOString().split('T')[0];
    return {
      ...day,
      productionTotals: batchMap.get(dStr) || { total19L: 0, packs15L: 0, packs05L: 0, waste19L: 0, broken15L: 0, broken05L: 0 },
      marketingTotals: {
        ordersCount: orderMap.get(dStr)?.count || 0,
        ordersTotalWorth: orderMap.get(dStr)?.totalWorth || 0
      }
    };
  });

  return sendSuccess(res, historyWithStats, 200, { message: 'Daily close history retrieved' });
});

/** Reopens a finalized closed day (OWNER only) */
export const reopenDay = asyncHandler(async (req, res) => {
  const { date, reason } = req.body;
  if (!date) throw new ApiError(400, 'Date is required');
  if (!reason) throw new ApiError(400, 'Reason is required');
  if (req.user.role !== 'OWNER') throw new ApiError(403, 'Only OWNER can reopen a closed day');

  const prefix = getTenantPrefix(req);
  const { start: targetDate, dateKey } = parseDateRange(date);
  const dailyCloseModel = prisma[`${prefix}DailyClose`];

  const existing = await dailyCloseModel.findFirst({ where: { date: targetDate } });
  if (!existing) throw new ApiError(404, 'Day is not closed');

  await dailyCloseModel.delete({ where: { id: existing.id } });
  invalidateDailyCloseLockCache(prefix, dateKey);

  await createAuditLog(prefix, {
    action: 'DAILY_REOPEN',
    entityType: 'DailyClose',
    entityId: existing.id,
    performedBy: req.user.id,
    details: `Day ${dateKey} reopened. Reason: ${reason}`
  });

  return sendSuccess(res, null, 200, { message: 'Day reopened successfully' });
});

