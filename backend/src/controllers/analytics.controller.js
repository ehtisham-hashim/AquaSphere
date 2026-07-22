import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

let cachedDashboardData = { aquasphere: null, wadaana: null };
let sseClients = { aquasphere: [], wadaana: [] };

const getTenantPrefix = (req) => {
  const tenant = (req.headers['x-tenant'] || 'aquasphere').toLowerCase();
  return tenant === 'wadaana' ? 'wadaana' : 'aquasphere';
};

const computeDashboardAnalytics = async (prefix) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

  const [
    todaysSalesOrders,
    todaysPayments,
    todaysExpenses,
    marketCredit,
    todaysPurchasesAgg,
    monthlyPurchasesAgg,
    pendingPayables,
    rawMaterials,
    spotSales
  ] = await Promise.all([
    prisma[`${prefix}Order`].findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
        deliveryStatus: 'DELIVERED'
      },
      include: { items: true }
    }),
    prisma[`${prefix}Payment`].aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: startOfDay, lte: endOfDay } }
    }),
    prisma[`${prefix}Expense`].aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: startOfDay, lte: endOfDay } }
    }),
    prisma[`${prefix}Customer`].aggregate({
      _sum: { cachedBalance: true }
    }),
    prisma[`${prefix}Purchase`].aggregate({
      _sum: { grandTotal: true },
      _count: { id: true },
      where: { purchaseDate: { gte: startOfDay, lte: endOfDay } }
    }),
    prisma[`${prefix}Purchase`].aggregate({
      _sum: { grandTotal: true },
      where: { purchaseDate: { gte: startOfMonth, lte: endOfDay } }
    }),
    prisma[`${prefix}VendorLedgerEntry`].groupBy({
      by: ['type'],
      _sum: { amount: true }
    }),
    prisma[`${prefix}Item`].findMany({
      where: { type: 'RAW_MATERIAL', archivedAt: null }
    }),
    prisma[`${prefix}SpotSale`].aggregate({
      _sum: { cashCollected: true, litresSold: true },
      where: { createdAt: { gte: startOfDay, lte: endOfDay } }
    })
  ]);

  const todaysSalesAmount = todaysSalesOrders.reduce((acc, order) => {
    return acc + order.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  }, 0);

  const spotSalesCash = parseFloat(spotSales._sum.cashCollected || 0);

  const purchaseTotal = pendingPayables.find(e => e.type === 'PURCHASE')?._sum?.amount || 0;
  const paymentTotal = pendingPayables.find(e => e.type === 'PAYMENT')?._sum?.amount || 0;
  const pendingVendorPayables = Math.max(0, Number(purchaseTotal) - Number(paymentTotal));

  const lowStockMaterials = rawMaterials.filter(
    item => parseFloat(item.cachedQty) < parseFloat(item.reorderLevel)
  );

  return {
    sales: todaysSalesAmount,
    cash: parseFloat(todaysPayments._sum.amount || 0) + spotSalesCash,
    expenses: parseFloat(todaysExpenses._sum.amount || 0),
    credit: parseFloat(marketCredit._sum.cachedBalance || 0),
    bottlesSold: todaysSalesOrders.length,
    todaysPurchases: parseFloat(todaysPurchasesAgg._sum.grandTotal || 0),
    todaysPurchasesCount: todaysPurchasesAgg._count.id || 0,
    monthlyPurchases: parseFloat(monthlyPurchasesAgg._sum.grandTotal || 0),
    pendingVendorPayables,
    spotSalesCash,
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

export const broadcastDashboardUpdate = async (prefix = 'aquasphere') => {
  try {
    cachedDashboardData[prefix] = await computeDashboardAnalytics(prefix);
    const payload = `data: ${JSON.stringify({ success: true, data: cachedDashboardData[prefix] })}\n\n`;
    sseClients[prefix].forEach(client => client.write(payload));
  } catch (error) {
    console.error(`Error broadcasting dashboard update for ${prefix}:`, error);
  }
};

export const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  cachedDashboardData[prefix] = await computeDashboardAnalytics(prefix);
  res.json({ success: true, data: cachedDashboardData[prefix] });
});

export const streamDashboardAnalytics = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  cachedDashboardData[prefix] = await computeDashboardAnalytics(prefix);
  res.write(`data: ${JSON.stringify({ success: true, data: cachedDashboardData[prefix] })}\n\n`);

  sseClients[prefix].push(res);

  const heartbeat = setInterval(() => res.write(':heartbeat\n\n'), 30000);
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients[prefix] = sseClients[prefix].filter(client => client !== res);
  });
});
