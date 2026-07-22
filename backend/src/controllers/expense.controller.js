import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastDashboardUpdate } from './analytics.controller.js';

export const getExpenses = asyncHandler(async (req, res) => {
  const expenses = await prisma.aquasphereExpense.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  res.json({ success: true, data: expenses });
});

export const createExpense = asyncHandler(async (req, res) => {
  const { category, amount } = req.body;
  const receiptUrl = req.file?.path || ''; 
  // ponytail: skipped strict file requirement for dev

  if (!category || !amount) throw new ApiError(400, 'Missing fields');

  const expense = await prisma.aquasphereExpense.create({
    data: { category, amount: parseFloat(amount), receiptUrl }
  });

  broadcastDashboardUpdate();
  res.status(201).json({ success: true, data: expense });
});
