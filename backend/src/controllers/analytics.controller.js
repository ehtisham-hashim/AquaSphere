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

export const getPurchasingSummary = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [recentPurchases, vendors, ledgerSums, topMaterials] = await Promise.all([
    // Recent purchases (last 7)
    prisma[`${prefix}Purchase`].findMany({
      take: 7,
      orderBy: { purchaseDate: 'desc' },
      include: {
        vendor: { select: { id: true, name: true } },
        items: { include: { item: { select: { name: true, unit: true } } } }
      }
    }),

    // All active vendors
    prisma[`${prefix}Vendor`].findMany({
      where: { archivedAt: null },
      select: { id: true, name: true, phone: true }
    }),

    // Ledger sums grouped by vendor + type
    prisma[`${prefix}VendorLedgerEntry`].groupBy({
      by: ['vendorId', 'type'],
      _sum: { amount: true }
    }),

    // Top purchased materials this month
    prisma[`${prefix}PurchaseItem`].groupBy({
      by: ['itemId'],
      _sum: { total: true, quantity: true },
      where: { purchase: { purchaseDate: { gte: startOfMonth, lte: endOfDay } } },
      orderBy: { _sum: { total: 'desc' } },
      take: 6
    })
  ]);

  // Build vendor balance map
  const balanceMap = {};
  for (const entry of ledgerSums) {
    if (!balanceMap[entry.vendorId]) balanceMap[entry.vendorId] = { purchases: 0, payments: 0 };
    if (entry.type === 'PURCHASE') balanceMap[entry.vendorId].purchases = Number(entry._sum.amount);
    if (entry.type === 'PAYMENT') balanceMap[entry.vendorId].payments = Number(entry._sum.amount);
  }

  // Format top vendors (sorted by outstanding balance)
  const topVendors = vendors
    .map(v => ({
      id: v.id,
      name: v.name,
      phone: v.phone,
      totalPurchases: balanceMap[v.id]?.purchases || 0,
      totalPayments: balanceMap[v.id]?.payments || 0,
      outstanding: (balanceMap[v.id]?.purchases || 0) - (balanceMap[v.id]?.payments || 0)
    }))
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, 5);

  // Resolve material names for top materials
  const materialIds = topMaterials.map(m => m.itemId);
  const materialDetails = materialIds.length > 0
    ? await prisma[`${prefix}Item`].findMany({
        where: { id: { in: materialIds } },
        select: { id: true, name: true, unit: true }
      })
    : [];
  const matMap = Object.fromEntries(materialDetails.map(m => [m.id, m]));

  const formattedMaterials = topMaterials.map(m => ({
    itemId: m.itemId,
    name: matMap[m.itemId]?.name || 'Unknown',
    unit: matMap[m.itemId]?.unit || '',
    totalSpend: Number(m._sum.total),
    totalQty: Number(m._sum.quantity)
  }));

  res.json({
    success: true,
    data: {
      recentPurchases: recentPurchases.map(p => ({
        id: p.id,
        invoiceNo: p.invoiceNo,
        vendorName: p.vendor?.name || 'N/A',
        grandTotal: Number(p.grandTotal),
        purchaseDate: p.purchaseDate,
        itemCount: p.items.length,
        items: p.items.map(i => ({
          name: i.item?.name || 'N/A',
          qty: Number(i.quantity),
          unit: i.item?.unit || '',
          total: Number(i.total)
        }))
      })),
      topVendors,
      topMaterials: formattedMaterials
    }
  });
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
