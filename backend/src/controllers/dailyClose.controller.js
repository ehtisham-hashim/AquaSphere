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

  if (existing) {
    throw new ApiError(400, 'Day is already closed');
  }

  const closedDay = await dailyCloseModel.create({
    data: {
      date: targetDate,
      closedById: req.user.id
    }
  });

  await auditLogModel.create({
    data: {
      action: 'DAILY_CLOSE',
      entity: 'DailyClose',
      entityId: closedDay.id,
      userId: req.user.id,
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
    include: { closedBy: { select: { id: true, name: true } } }
  });

  res.status(200).json(new ApiResponse(200, {
    isClosed: !!existing,
    closedAt: existing?.createdAt || null,
    closedBy: existing?.closedBy || null
  }, 'Daily close status retrieved'));
});

export const getDailyCloseHistory = asyncHandler(async (req, res) => {
  const prefix = getPrefix(req);
  const dailyCloseModel = prisma[`${prefix}DailyClose`];
  
  const history = await dailyCloseModel.findMany({
    orderBy: { date: 'desc' },
    include: { closedBy: { select: { id: true, name: true } } },
    take: 30
  });

  res.status(200).json(new ApiResponse(200, history, 'Daily close history retrieved'));
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
      entity: 'DailyClose',
      entityId: existing.id,
      userId: req.user.id,
      details: `Day ${targetDate.toISOString().split('T')[0]} reopened. Reason: ${reason}`
    }
  });

  res.status(200).json(new ApiResponse(200, null, 'Day reopened successfully'));
});
