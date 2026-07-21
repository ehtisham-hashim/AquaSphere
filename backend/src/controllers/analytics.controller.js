import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { eventBus } from '../utils/eventBus.js';

let cachedDashboardData = null;
let sseClients = [];

const computeDashboardAnalytics = async () => {
  const today = new Date();
  const start = new Date(today.setHours(0,0,0,0));
  const end = new Date(today.setHours(23,59,59,999));

  // Today's Sales Amount (Orders created today that are delivered)
  const todaysSalesOrders = await prisma.aquasphereOrder.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      deliveryStatus: 'DELIVERED'
    },
    include: { items: true }
  });

  const todaysSalesAmount = todaysSalesOrders.reduce((acc, order) => {
    return acc + order.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  }, 0);

  // Today's Cash Collected (Payments today)
  const todaysPayments = await prisma.aquaspherePayment.aggregate({
    _sum: { amount: true },
    where: { createdAt: { gte: start, lte: end } }
  });
  const cashCollected = parseFloat(todaysPayments._sum.amount || 0);

  // Today's Expenses
  const todaysExpenses = await prisma.aquasphereExpense.aggregate({
    _sum: { amount: true },
    where: { createdAt: { gte: start, lte: end } }
  });
  const expenses = parseFloat(todaysExpenses._sum.amount || 0);

  // Total Market Credit (Unpaid balances across customers)
  const marketCredit = await prisma.aquasphereCustomer.aggregate({
    _sum: { cachedBalance: true }
  });

  return {
    sales: todaysSalesAmount,
    cash: cashCollected,
    expenses,
    credit: parseFloat(marketCredit._sum.cachedBalance || 0),
    bottlesSold: todaysSalesOrders.length
  };
};

// Broadcast updates to all connected SSE clients
const broadcastDashboardUpdate = async () => {
  try {
    cachedDashboardData = await computeDashboardAnalytics();
    const payload = `data: ${JSON.stringify({ success: true, data: cachedDashboardData })}\n\n`;
    sseClients.forEach(client => client.write(payload));
  } catch (error) {
    console.error('Error broadcasting dashboard update:', error);
  }
};

// Listen for relevant mutations to trigger a broadcast
eventBus.on('DashboardDataChanged', () => {
  broadcastDashboardUpdate();
});

export const getDashboardAnalytics = asyncHandler(async (req, res) => {
  if (!cachedDashboardData) {
    cachedDashboardData = await computeDashboardAnalytics();
  }
  res.json({ success: true, data: cachedDashboardData });
});

export const streamDashboardAnalytics = asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial data immediately
  if (!cachedDashboardData) {
    cachedDashboardData = await computeDashboardAnalytics();
  }
  res.write(`data: ${JSON.stringify({ success: true, data: cachedDashboardData })}\n\n`);

  // Register client
  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});
