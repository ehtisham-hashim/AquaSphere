import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { paginationArgs } from '../utils/pagination.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { sendSuccess } from '../utils/response.js';

const VALID_EXPENSE_TYPES = ['DAILY', 'REPAIRS', 'OTHER'];
const VALID_PERIODS = ['MONTHLY'];

/**
 * Retrieves paginated transport expenses with optional vehicle filter
 */
export const getTransportExpenses = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { vehicleId } = req.query;

  const where = {};
  if (vehicleId) {
    where.vehicleId = vehicleId;
  }

  const { take, skip, cursor } = paginationArgs(req.query);

  const expenses = await prisma[`${prefix}TransportExpense`].findMany({
    where,
    take: take + 1,
    skip,
    ...(cursor && { cursor }),
    orderBy: { date: 'desc' },
    select: {
      id: true,
      date: true,
      amount: true,
      type: true,
      period: true,
      note: true,
      vehicle: {
        select: {
          id: true,
          name: true,
          plateNumber: true
        }
      }
    }
  });

  const hasMore = expenses.length > take;
  const data = hasMore ? expenses.slice(0, take) : expenses;
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

  return sendSuccess(res, data, 200, { nextCursor, hasMore });
});

/**
 * Retrieves vehicle details and its paginated expense history for infinite scroll
 */
export const getExpensesByVehicle = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;

  const vehicle = await prisma[`${prefix}Vehicle`].findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      plateNumber: true,
      model: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!vehicle) {
    throw new ApiError(404, 'Vehicle not found');
  }

  const { take, skip, cursor } = paginationArgs(req.query);

  const expenses = await prisma[`${prefix}TransportExpense`].findMany({
    where: { vehicleId: id },
    take: take + 1,
    skip,
    ...(cursor && { cursor }),
    orderBy: { date: 'desc' },
    select: {
      id: true,
      date: true,
      amount: true,
      type: true,
      period: true,
      note: true,
      createdAt: true
    }
  });

  const hasMore = expenses.length > take;
  const data = hasMore ? expenses.slice(0, take) : expenses;
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;

  return sendSuccess(res, data, 200, {
    vehicle,
    nextCursor,
    hasMore
  });
});

/**
 * Creates a new transport expense entry
 */
export const addTransportExpense = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { vehicleId, type, period = 'MONTHLY', amount, note, date } = req.body;

  if (!vehicleId) {
    throw new ApiError(400, 'Vehicle ID is required');
  }

  const vehicle = await prisma[`${prefix}Vehicle`].findUnique({
    where: { id: vehicleId }
  });

  if (!vehicle) {
    throw new ApiError(404, 'Vehicle not found');
  }

  if (!type || !VALID_EXPENSE_TYPES.includes(type)) {
    throw new ApiError(400, `Expense type must be one of: ${VALID_EXPENSE_TYPES.join(', ')}`);
  }

  if (!VALID_PERIODS.includes(period)) {
    throw new ApiError(400, `Period must be one of: ${VALID_PERIODS.join(', ')}`);
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new ApiError(400, 'Amount must be a number greater than 0');
  }

  const expense = await prisma[`${prefix}TransportExpense`].create({
    data: {
      vehicleId,
      type,
      period,
      amount: parsedAmount,
      note: note ? note.trim() : null,
      date: date ? new Date(date) : new Date()
    },
    select: {
      id: true,
      date: true,
      amount: true,
      type: true,
      period: true,
      note: true,
      vehicle: {
        select: {
          id: true,
          name: true,
          plateNumber: true
        }
      }
    }
  });

  return sendSuccess(res, expense, 201);
});

/**
 * Deletes a transport expense record
 */
export const deleteTransportExpense = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { id } = req.params;

  const existing = await prisma[`${prefix}TransportExpense`].findUnique({
    where: { id }
  });

  if (!existing) {
    throw new ApiError(404, 'Transport expense not found');
  }

  await prisma[`${prefix}TransportExpense`].delete({
    where: { id }
  });

  return sendSuccess(res, { message: 'Transport expense deleted successfully' }, 200);
});
