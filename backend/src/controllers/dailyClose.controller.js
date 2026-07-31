import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const getPrefix = (req) => (req.headers['x-tenant'] || 'aquasphere').toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';

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

  if (existing && !existing.pmConfirmed && req.user.role !== 'OWNER') {
    throw new ApiError(400, 'Cannot finalize: Production Manager has not confirmed production yet.');
  }

  if (existing && !existing.mmConfirmed && req.user.role !== 'OWNER') {
    throw new ApiError(400, 'Cannot finalize: Marketing Manager has not confirmed sales & customer bottles yet.');
  }

  const closedDay = await dailyCloseModel.upsert({
    where: { date: targetDate },
    update: {
      adminConfirmed: true,
      closedAt: new Date(),
      closedById: req.user.id
    },
    create: {
      date: targetDate,
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

  res.status(200).json(new ApiResponse(200, closedDay, 'Day closed successfully'));
});

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

  const [prodStats, orderStats, customerBottleStats] = await Promise.all([
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
    })
  ]);

  let ordersTotalWorth = 0;
  for (const ord of orderStats) {
    for (const item of ord.items || []) {
      const q = Number(item.quantity) || 0;
      const p = Number(item.price || item.unitPrice) || 0;
      ordersTotalWorth += q * p;
    }
  }

  const totalCustomerBottles = (customerBottleStats._sum.cachedBottleBalance || 0) || (customerBottleStats._sum.qty19L || 0);

  res.status(200).json(new ApiResponse(200, {
    isClosed: existing?.adminConfirmed || false,
    pmConfirmed: existing?.pmConfirmed || false,
    mmConfirmed: existing?.mmConfirmed || false,
    adminConfirmed: existing?.adminConfirmed || false,
    closedAt: existing?.closedAt || null,
    pmConfirmedAt: existing?.pmConfirmedAt || null,
    mmConfirmedAt: existing?.mmConfirmedAt || null,
    closedBy: existing?.closedBy || null,
    pmConfirmedBy: existing?.pmConfirmedBy || null,
    mmConfirmedBy: existing?.mmConfirmedBy || null,
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

  const historyWithStats = await Promise.all(history.map(async (day) => {
    const nextDate = new Date(day.date);
    nextDate.setDate(nextDate.getDate() + 1);

    const prodStats = await prodBatchModel.aggregate({
      where: {
        batchDate: { gte: day.date, lt: nextDate }
      },
      _sum: {
        quantity: true,
        packs15L: true,
        packs05L: true,
        wasteQuantity: true,
        brokenBottles15L: true,
        brokenBottles05L: true
      }
    });

    const orderStats = await prisma[`${prefix}Order`].findMany({
      where: { createdAt: { gte: day.date, lt: nextDate } },
      include: { items: true }
    });

    let ordersTotalWorth = 0;
    for (const ord of orderStats) {
      for (const item of ord.items || []) {
        ordersTotalWorth += (Number(item.quantity) || 0) * (Number(item.price || item.unitPrice) || 0);
      }
    }

    return {
      ...day,
      productionTotals: {
        total19L: prodStats._sum.quantity || 0,
        packs15L: prodStats._sum.packs15L || 0,
        packs05L: prodStats._sum.packs05L || 0,
        waste19L: prodStats._sum.wasteQuantity || 0,
        broken15L: prodStats._sum.brokenBottles15L || 0,
        broken05L: prodStats._sum.brokenBottles05L || 0,
      },
      marketingTotals: {
        ordersCount: orderStats.length,
        ordersTotalWorth
      }
    };
  }));

  res.status(200).json(new ApiResponse(200, historyWithStats, 'Daily close history retrieved'));
});

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
