import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTenantPrefix } from '../utils/tenant.js';

let cachedDashboardData = { aquasphere: null, wadaana: null };
let sseClients = { aquasphere: [], wadaana: [] };

const computeDashboardAnalytics = async (prefix) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0);
  const minDate = twelveMonthsAgo < startOfYear ? twelveMonthsAgo : startOfYear;

  const [
    orders,
    payments,
    expenses,
    purchases,
    spotSales,
    pendingPayables,
    rawMaterials
  ] = await Promise.all([
    prisma[`${prefix}Order`].findMany({
      where: { createdAt: { gte: minDate, lte: endOfDay } },
      select: { createdAt: true, items: { select: { price: true, quantity: true } } }
    }),
    prisma[`${prefix}Payment`].findMany({
      where: { createdAt: { gte: minDate, lte: endOfDay } },
      select: { createdAt: true, amount: true }
    }),
    prisma[`${prefix}Expense`].findMany({
      where: { createdAt: { gte: minDate, lte: endOfDay } },
      select: { createdAt: true, amount: true }
    }),
    prisma[`${prefix}Purchase`].findMany({
      where: { purchaseDate: { gte: minDate, lte: endOfDay } },
      select: { purchaseDate: true, grandTotal: true }
    }),
    prisma[`${prefix}SpotSale`].findMany({
      where: { createdAt: { gte: minDate, lte: endOfDay } },
      select: { createdAt: true, cashCollected: true, creditAmount: true }
    }),
    prisma[`${prefix}VendorLedgerEntry`].groupBy({
      by: ['type'],
      _sum: { amount: true }
    }),
    prisma[`${prefix}Item`].findMany({
      where: { type: 'RAW_MATERIAL', archivedAt: null }
    })
  ]);

  // ponytail: single O(N) bucketing pass replaces 226 filter sweeps
  const dayMap = Object.create(null);
  const monthMap = Object.create(null);

  const daily = { sales: 0, cash: 0, expenses: 0, credit: 0, bottlesSold: 0, purchases: 0, purchasesCount: 0, netCash: 0 };
  const monthly = { sales: 0, cash: 0, expenses: 0, credit: 0, bottlesSold: 0, purchases: 0, purchasesCount: 0, netCash: 0 };
  const yearly = { sales: 0, cash: 0, expenses: 0, credit: 0, bottlesSold: 0, purchases: 0, purchasesCount: 0, netCash: 0 };

  const getDKey = (d) => d.toISOString().split('T')[0];
  const getMKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const ensureDay = (key) => {
    if (!dayMap[key]) {
      dayMap[key] = { sales: 0, ordersCount: 0, orderCash: 0, spotSalesCash: 0, cashCollected: 0, creditBilled: 0, expenses: 0, purchases: 0 };
    }
    return dayMap[key];
  };

  const ensureMonth = (key) => {
    if (!monthMap[key]) {
      monthMap[key] = { sales: 0, orderCash: 0, spotSalesCash: 0, cash: 0, expenses: 0, purchases: 0 };
    }
    return monthMap[key];
  };

  for (const o of orders) {
    const d = new Date(o.createdAt);
    const total = (o.items || []).reduce((sum, item) => sum + (parseFloat(item.price || 0) * (item.quantity || 0)), 0);
    const day = ensureDay(getDKey(d));
    const month = ensureMonth(getMKey(d));

    day.sales += total;
    day.ordersCount += 1;
    month.sales += total;

    if (d >= startOfDay) { daily.sales += total; daily.bottlesSold += 1; }
    if (d >= startOfMonth) { monthly.sales += total; monthly.bottlesSold += 1; }
    if (d >= startOfYear) { yearly.sales += total; yearly.bottlesSold += 1; }
  }

  for (const p of payments) {
    const d = new Date(p.createdAt);
    const amt = parseFloat(p.amount || 0);
    const day = ensureDay(getDKey(d));
    const month = ensureMonth(getMKey(d));

    day.orderCash += amt;
    day.cashCollected += amt;
    month.orderCash += amt;
    month.cash += amt;

    if (d >= startOfDay) daily.cash += amt;
    if (d >= startOfMonth) monthly.cash += amt;
    if (d >= startOfYear) yearly.cash += amt;
  }

  for (const st of spotSales) {
    const d = new Date(st.createdAt);
    const cashAmt = parseFloat(st.cashCollected || 0);
    const creditAmt = parseFloat(st.creditAmount || 0);
    const day = ensureDay(getDKey(d));
    const month = ensureMonth(getMKey(d));

    day.spotSalesCash += cashAmt;
    day.cashCollected += cashAmt;
    day.creditBilled += creditAmt;
    month.spotSalesCash += cashAmt;
    month.cash += cashAmt;

    if (d >= startOfDay) { daily.cash += cashAmt; daily.credit += creditAmt; }
    if (d >= startOfMonth) { monthly.cash += cashAmt; monthly.credit += creditAmt; }
    if (d >= startOfYear) { yearly.cash += cashAmt; yearly.credit += creditAmt; }
  }

  for (const e of expenses) {
    const d = new Date(e.createdAt);
    const amt = parseFloat(e.amount || 0);
    const day = ensureDay(getDKey(d));
    const month = ensureMonth(getMKey(d));

    day.expenses += amt;
    month.expenses += amt;

    if (d >= startOfDay) daily.expenses += amt;
    if (d >= startOfMonth) monthly.expenses += amt;
    if (d >= startOfYear) yearly.expenses += amt;
  }

  for (const pu of purchases) {
    const d = new Date(pu.purchaseDate);
    const total = parseFloat(pu.grandTotal || 0);
    const day = ensureDay(getDKey(d));
    const month = ensureMonth(getMKey(d));

    day.purchases += total;
    month.purchases += total;

    if (d >= startOfDay) { daily.purchases += total; daily.purchasesCount += 1; }
    if (d >= startOfMonth) { monthly.purchases += total; monthly.purchasesCount += 1; }
    if (d >= startOfYear) { yearly.purchases += total; yearly.purchasesCount += 1; }
  }

  daily.netCash = daily.cash - daily.expenses;
  monthly.netCash = monthly.cash - monthly.expenses;
  yearly.netCash = yearly.cash - yearly.expenses;

  // 30-day daily history in O(30)
  const dailySalesHistory = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateKey = getDKey(d);
    const bucket = dayMap[dateKey] || { sales: 0, ordersCount: 0, orderCash: 0, spotSalesCash: 0, cashCollected: 0, creditBilled: 0, expenses: 0, purchases: 0 };

    dailySalesHistory.push({
      date: dateKey,
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      ordersCount: bucket.ordersCount,
      sales: bucket.sales,
      cashCollected: bucket.cashCollected,
      orderCash: bucket.orderCash,
      spotSalesCash: bucket.spotSalesCash,
      creditBilled: bucket.creditBilled,
      expenses: bucket.expenses,
      purchases: bucket.purchases,
      netCash: bucket.cashCollected - bucket.expenses
    });
  }

  // 12-month trend in O(12)
  const monthlyTrend = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0);
    const mKey = getMKey(d);
    const bucket = monthMap[mKey] || { sales: 0, cash: 0, expenses: 0, purchases: 0, spotSalesCash: 0, orderCash: 0 };

    monthlyTrend.push({
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      sales: bucket.sales,
      cash: bucket.cash,
      expenses: bucket.expenses,
      purchases: bucket.purchases,
      spotSalesCash: bucket.spotSalesCash,
      orderCash: bucket.orderCash,
      netCash: bucket.cash - bucket.expenses
    });
  }

  const purchaseTotal = pendingPayables.find(e => e.type === 'PURCHASE')?._sum?.amount || 0;
  const paymentTotal = pendingPayables.find(e => e.type === 'PAYMENT')?._sum?.amount || 0;
  const pendingVendorPayables = Math.max(0, Number(purchaseTotal) - Number(paymentTotal));

  const lowStockMaterials = rawMaterials.filter(
    item => parseFloat(item.cachedQty || 0) < parseFloat(item.reorderLevel || 0)
  );

  return {
    ...daily,
    daily,
    monthly,
    yearly,
    dailySalesHistory,
    monthlyTrend,
    pendingVendorPayables,
    lowStockMaterialsCount: lowStockMaterials.length,
    lowStockMaterialsList: lowStockMaterials.map(m => ({
      id: m.id,
      name: m.name,
      cachedQty: parseFloat(m.cachedQty || 0),
      reorderLevel: parseFloat(m.reorderLevel || 0),
      unit: m.unit
    }))
  };
};

/**
 * Broadcasts updated live dashboard analytics data to connected Server-Sent Events (SSE) clients.
 *
 * @param {'aquasphere' | 'wadaana'} [prefix='aquasphere'] - Target tenant prefix.
 * @returns {Promise<void>}
 */
export const broadcastDashboardUpdate = async (prefix = 'aquasphere') => {
  try {
    cachedDashboardData[prefix] = await computeDashboardAnalytics(prefix);
    const payload = `data: ${JSON.stringify({ success: true, data: cachedDashboardData[prefix] })}\n\n`;
    sseClients[prefix].forEach(client => client.write(payload));
  } catch (error) {
    console.error(`Error broadcasting dashboard update for ${prefix}:`, error);
  }
};

/**
 * Retrieves cached or computed high-level dashboard analytics (revenue, orders, expenses, cash).
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  cachedDashboardData[prefix] = await computeDashboardAnalytics(prefix);
  res.json({ success: true, data: cachedDashboardData[prefix] });
});

/**
 * Retrieves monthly purchasing summary, vendor balances, and top raw materials purchased.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
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

/**
 * Streams real-time dashboard analytics over a Server-Sent Events (SSE) connection with Traefik anti-buffering.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const streamDashboardAnalytics = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  cachedDashboardData[prefix] = await computeDashboardAnalytics(prefix);
  res.write(`data: ${JSON.stringify({ success: true, data: cachedDashboardData[prefix] })}\n\n`);

  sseClients[prefix].push(res);

  const heartbeat = setInterval(() => res.write(':heartbeat\n\n'), 30000);
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients[prefix] = sseClients[prefix].filter(client => client !== res);
  });
});

/**
 * Retrieves daily cash inflows, credit sales, and expenses summary for the specified date.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getDailySummary = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { date } = req.query;
  if (!date) throw new Error('Date is required');

  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const [deliveryPayments, spotSalesAgg, expensesAgg, creditSalesAgg] = await Promise.all([
    // Cash from order deliveries on this date
    prisma[`${prefix}Payment`].aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: targetDate, lt: nextDate } }
    }),
    // Counter sales cash + credit on this date
    prisma[`${prefix}SpotSale`].aggregate({
      _sum: { cashCollected: true, creditAmount: true, litresSold: true },
      where: { createdAt: { gte: targetDate, lt: nextDate } }
    }),
    // Expenses on this date
    prisma[`${prefix}Expense`].aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: targetDate, lt: nextDate } }
    }),
    // Credit from spot sales
    prisma[`${prefix}SpotSale`].aggregate({
      _sum: { creditAmount: true },
      where: { createdAt: { gte: targetDate, lt: nextDate }, creditAmount: { gt: 0 } }
    })
  ]);

  const totalDeliveryAmount = parseFloat(deliveryPayments._sum.amount || 0);
  const totalSpotSales = parseFloat(spotSalesAgg._sum.cashCollected || 0);
  const totalCreditSales = parseFloat(creditSalesAgg._sum.creditAmount || 0);
  const totalExpenses = parseFloat(expensesAgg._sum.amount || 0);
  const totalLitres = parseFloat(spotSalesAgg._sum.litresSold || 0);
  const netCash = totalDeliveryAmount + totalSpotSales - totalExpenses;

  res.json({
    success: true,
    data: {
      totalDeliveryAmount,
      totalSpotSales,
      totalCreditSales,
      totalExpenses,
      totalLitres,
      netCash,
      date: targetDate.toISOString().split('T')[0]
    }
  });
});

/**
 * Retrieves production performance dashboard data including batch breakdown, wastage, and raw material health.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getProductionDashboard = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const isWadaana = prefix === 'wadaana';
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const daysNum = Math.min(Math.max(parseInt(req.query.days || '7', 10), 1), 30);
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - (daysNum - 1));
  startDate.setHours(0, 0, 0, 0);

  const prodBatchModel = prisma[`${prefix}ProductionBatch`];
  const itemModel = prisma[`${prefix}Item`];
  const purchaseModel = prisma[`${prefix}Purchase`];
  const dailyCloseModel = prisma[`${prefix}DailyClose`];

  const [
    todaysBatchesAgg,
    recentBatches,
    finishedGoods,
    rawMaterials,
    recentPurchases,
    dailyCloseStatus,
    pendingBatchesCount,
    pastWeekBatches
  ] = await Promise.all([
    prodBatchModel.aggregate({
      where: { batchDate: { gte: startOfDay, lte: endOfDay } },
      _sum: isWadaana ? {
        qtyPure05L: true,
        qtyPure15L: true,
        qtyMix05L: true,
        qtyMix15L: true,
        brokenPure05L: true,
        brokenPure15L: true,
        brokenMix05L: true,
        brokenMix15L: true
      } : {
        quantity: true,
        packs05L: true,
        packs15L: true,
        brokenBottles05L: true,
        brokenBottles15L: true,
        wasteQuantity: true
      },
      _count: { id: true }
    }),
    prodBatchModel.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' }
    }),
    itemModel.findMany({
      where: { type: 'FINISHED_GOOD', archivedAt: null },
      orderBy: { name: 'asc' }
    }),
    itemModel.findMany({
      where: { type: 'RAW_MATERIAL', archivedAt: null },
      orderBy: { name: 'asc' }
    }),
    purchaseModel.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { name: true } },
        items: { include: { item: { select: { name: true, unit: true } } } }
      }
    }),
    dailyCloseModel.findFirst({
      where: { date: startOfDay }
    }),
    prodBatchModel.count({
      where: { batchDate: { gte: startOfDay, lte: endOfDay }, status: 'PENDING' }
    }),
    prodBatchModel.findMany({
      where: { batchDate: { gte: startDate } },
      orderBy: { batchDate: 'asc' }
    })
  ]);

  const dailyHistory = [];
  for (let i = daysNum - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dayStr = daysNum > 14 
      ? `${d.getMonth() + 1}/${d.getDate()}` 
      : d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateKey = d.toISOString().split('T')[0];

    const dayBatches = pastWeekBatches.filter(b => {
      if (!b.batchDate) return false;
      const bKey = new Date(b.batchDate).toISOString().split('T')[0];
      return bKey === dateKey;
    });

    if (isWadaana) {
      const qtyPure05L = dayBatches.reduce((s, b) => s + Number(b.qtyPure05L || 0), 0);
      const qtyPure15L = dayBatches.reduce((s, b) => s + Number(b.qtyPure15L || 0), 0);
      const qtyMix05L = dayBatches.reduce((s, b) => s + Number(b.qtyMix05L || 0), 0);
      const qtyMix15L = dayBatches.reduce((s, b) => s + Number(b.qtyMix15L || 0), 0);
      const totalWaste = dayBatches.reduce((s, b) => s + (
        Number(b.brokenPure05L || 0) + 
        Number(b.brokenPure15L || 0) + 
        Number(b.brokenMix05L || 0) + 
        Number(b.brokenMix15L || 0)
      ), 0);

      dailyHistory.push({
        day: dayStr,
        date: dateKey,
        qtyPure05L,
        qtyPure15L,
        qtyMix05L,
        qtyMix15L,
        totalWaste
      });
    } else {
      const total19L = dayBatches.reduce((s, b) => s + Number(b.quantity || 0), 0);
      const packs15L = dayBatches.reduce((s, b) => s + Number(b.packs15L || 0), 0);
      const packs05L = dayBatches.reduce((s, b) => s + Number(b.packs05L || 0), 0);
      const totalWaste = dayBatches.reduce((s, b) => s + (Number(b.wasteQuantity || 0) + Number(b.brokenBottles15L || 0) + Number(b.brokenBottles05L || 0)), 0);

      dailyHistory.push({
        day: dayStr,
        date: dateKey,
        total19L,
        packs15L,
        packs05L,
        totalWaste
      });
    }
  }

  const rawMaterialHealth = rawMaterials.map(mat => {
    const qty = Number(mat.cachedQty || 0);
    const reorder = Number(mat.reorderLevel || 0);
    const isLow = reorder > 0 && qty <= reorder;
    const isCritical = qty <= 0;

    return {
      id: mat.id,
      name: mat.name,
      unit: mat.unit,
      cachedQty: qty,
      factoryQty: Number(mat.factoryQty || 0),
      warehouseQty: Number(mat.warehouseQty || 0),
      reorderLevel: reorder,
      status: isCritical ? 'OUT_OF_STOCK' : isLow ? 'LOW_STOCK' : 'IN_STOCK'
    };
  });

  const lowStockCount = rawMaterialHealth.filter(m => m.status !== 'IN_STOCK').length;

  const todaysProduction = isWadaana ? {
    batchesCount: todaysBatchesAgg._count.id || 0,
    qtyPure05L: todaysBatchesAgg._sum.qtyPure05L || 0,
    qtyPure15L: todaysBatchesAgg._sum.qtyPure15L || 0,
    qtyMix05L: todaysBatchesAgg._sum.qtyMix05L || 0,
    qtyMix15L: todaysBatchesAgg._sum.qtyMix15L || 0,
    totalProduced: (todaysBatchesAgg._sum.qtyPure05L || 0) + (todaysBatchesAgg._sum.qtyPure15L || 0) + (todaysBatchesAgg._sum.qtyMix05L || 0) + (todaysBatchesAgg._sum.qtyMix15L || 0),
    totalWaste: (todaysBatchesAgg._sum.brokenPure05L || 0) + (todaysBatchesAgg._sum.brokenPure15L || 0) + (todaysBatchesAgg._sum.brokenMix05L || 0) + (todaysBatchesAgg._sum.brokenMix15L || 0)
  } : {
    batchesCount: todaysBatchesAgg._count.id || 0,
    total19L: todaysBatchesAgg._sum.quantity || 0,
    packs15L: todaysBatchesAgg._sum.packs15L || 0,
    packs05L: todaysBatchesAgg._sum.packs05L || 0,
    totalWaste: (todaysBatchesAgg._sum.wasteQuantity || 0) + (todaysBatchesAgg._sum.brokenBottles15L || 0) + (todaysBatchesAgg._sum.brokenBottles05L || 0)
  };

  const userIds = [...new Set(recentBatches.map(b => b.producedBy).filter(Boolean))];
  const userRecords = userIds.length > 0 ? await prisma[`${prefix}User`].findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, role: true }
  }) : [];
  const userMap = Object.fromEntries(userRecords.map(u => [u.id, u]));

  const formatLoggedBy = (producedBy) => {
    if (!producedBy) return 'Production Manager';
    const u = userMap[producedBy];
    if (u) {
      if (u.name) return u.name;
      if (u.role) return u.role.replace(/_/g, ' ');
    }
    // If producedBy is a UUID string that doesn't match a user row, don't show raw UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(producedBy);
    if (isUUID) return 'Production Manager';
    return producedBy;
  };

  res.json({
    success: true,
    data: {
      todaysProduction,
      dailyProductionHistory: dailyHistory,
      finishedGoods: finishedGoods.map(fg => ({
        id: fg.id,
        name: fg.name,
        unit: fg.unit,
        factoryQty: Number(fg.factoryQty || 0),
        warehouseQty: Number(fg.warehouseQty || 0),
        cachedQty: Number(fg.cachedQty || 0)
      })),
      rawMaterialHealth,
      lowStockCount,
      pendingBatchesCount,
      recentBatches: recentBatches.map(b => {
        const creatorName = formatLoggedBy(b.producedBy);
        if (isWadaana) {
          const waste = (b.brokenPure05L || 0) + (b.brokenPure15L || 0) + (b.brokenMix05L || 0) + (b.brokenMix15L || 0);
          return {
            id: b.id,
            shortId: `#${b.id.substring(0, 8).toUpperCase()}`,
            batchDate: b.batchDate,
            status: b.status,
            qtyPure05L: b.qtyPure05L || 0,
            qtyPure15L: b.qtyPure15L || 0,
            qtyMix05L: b.qtyMix05L || 0,
            qtyMix15L: b.qtyMix15L || 0,
            wasteQuantity: waste,
            createdBy: creatorName
          };
        } else {
          return {
            id: b.id,
            shortId: `#${b.id.substring(0, 8).toUpperCase()}`,
            batchDate: b.batchDate,
            status: b.status,
            quantity: b.quantity || 0,
            packs15L: b.packs15L || 0,
            packs05L: b.packs05L || 0,
            wasteQuantity: (b.wasteQuantity || 0) + (b.brokenBottles15L || 0) + (b.brokenBottles05L || 0),
            createdBy: creatorName
          };
        }
      }),
      recentPurchases: recentPurchases.map(p => ({
        id: p.id,
        invoiceNo: p.invoiceNo || `INV-${p.id.substring(0, 6).toUpperCase()}`,
        vendorName: p.vendor?.name || 'Supplier',
        purchaseDate: p.purchaseDate,
        deliveredTo: p.deliveredTo,
        status: p.status,
        grandTotal: Number(p.grandTotal || 0),
        itemCount: p.items.length,
        items: p.items.map(i => ({
          name: i.item?.name || 'Material',
          qty: Number(i.quantity),
          unit: i.item?.unit || ''
        }))
      })),
      dailyClose: {
        isClosed: dailyCloseStatus?.adminConfirmed || false,
        pmConfirmed: dailyCloseStatus?.pmConfirmed || false,
        pmConfirmedAt: dailyCloseStatus?.pmConfirmedAt || null
      }
    }
  });
});
