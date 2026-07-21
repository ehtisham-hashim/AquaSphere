import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { eventBus } from '../utils/eventBus.js';

let cachedDashboardData = null;
let sseClients = [];

const computeDashboardAnalytics = async () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

  // Today's Sales Amount
  const todaysSalesOrders = await prisma.aquasphereOrder.findMany({
    where: {
      createdAt: { gte: startOfDay, lte: endOfDay },
      deliveryStatus: 'DELIVERED'
    },
    include: { items: true }
  });

  const todaysSalesAmount = todaysSalesOrders.reduce((acc, order) => {
    return acc + order.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  }, 0);

  // Cash Collected Today
  const todaysPayments = await prisma.aquaspherePayment.aggregate({
    _sum: { amount: true },
    where: { createdAt: { gte: startOfDay, lte: endOfDay } }
  });
  const cashCollected = parseFloat(todaysPayments._sum.amount || 0);

  // Expenses Today
  const todaysExpenses = await prisma.aquasphereExpense.aggregate({
    _sum: { amount: true },
    where: { createdAt: { gte: startOfDay, lte: endOfDay } }
  });
  const expenses = parseFloat(todaysExpenses._sum.amount || 0);

  // Market Credit (Unpaid balances)
  const marketCredit = await prisma.aquasphereCustomer.aggregate({
    _sum: { cachedBalance: true }
  });

  // Purchases Today
  const todaysPurchasesAgg = await prisma.aquaspherePurchase.aggregate({
    _sum: { grandTotal: true },
    _count: { id: true },
    where: { purchaseDate: { gte: startOfDay, lte: endOfDay } }
  });

  // Purchases Monthly
  const monthlyPurchasesAgg = await prisma.aquaspherePurchase.aggregate({
    _sum: { grandTotal: true },
    where: { purchaseDate: { gte: startOfMonth, lte: endOfDay } }
  });

  // Pending Vendor Payables (SUM(PURCHASE) - SUM(PAYMENT) in VendorLedgerEntry)
  const ledgerEntries = await prisma.aquasphereVendorLedgerEntry.findMany();
  const pendingVendorPayables = ledgerEntries.reduce((sum, entry) => {
    const amt = parseFloat(entry.amount);
    return entry.type === 'PURCHASE' ? sum + amt : sum - amt;
  }, 0);

  // Low Stock Raw Materials
  const rawMaterials = await prisma.aquasphereItem.findMany({
    where: { type: 'RAW_MATERIAL', archivedAt: null }
  });
  const lowStockMaterials = rawMaterials.filter(
    item => parseFloat(item.cachedQty) < parseFloat(item.reorderLevel)
  );

  return {
    sales: todaysSalesAmount,
    cash: cashCollected,
    expenses,
    credit: parseFloat(marketCredit._sum.cachedBalance || 0),
    bottlesSold: todaysSalesOrders.length,
    todaysPurchases: parseFloat(todaysPurchasesAgg._sum.grandTotal || 0),
    todaysPurchasesCount: todaysPurchasesAgg._count.id || 0,
    monthlyPurchases: parseFloat(monthlyPurchasesAgg._sum.grandTotal || 0),
    pendingVendorPayables: Math.max(0, pendingVendorPayables),
    lowStockMaterialsCount: lowStockMaterials.length,
    lowStockMaterialsList: lowStockMaterials.map(m => ({
      id: m.id,
      name: m.name,
      cachedQty: parseFloat(m.cachedQty),
      reorderLevel: parseFloat(m.reorderLevel),
      unit: m.unit
    }))
  };
};

const broadcastDashboardUpdate = async () => {
  try {
    cachedDashboardData = await computeDashboardAnalytics();
    const payload = `data: ${JSON.stringify({ success: true, data: cachedDashboardData })}\n\n`;
    sseClients.forEach(client => client.write(payload));
  } catch (error) {
    console.error('Error broadcasting dashboard update:', error);
  }
};

eventBus.on('DashboardDataChanged', () => {
  broadcastDashboardUpdate();
});

export const getDashboardAnalytics = asyncHandler(async (req, res) => {
  cachedDashboardData = await computeDashboardAnalytics();
  res.json({ success: true, data: cachedDashboardData });
});

export const streamDashboardAnalytics = asyncHandler(async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  cachedDashboardData = await computeDashboardAnalytics();
  res.write(`data: ${JSON.stringify({ success: true, data: cachedDashboardData })}\n\n`);

  sseClients.push(res);
  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});
