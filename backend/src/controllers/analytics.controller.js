import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { sendSuccess } from '../utils/response.js';

const cachedDashboardData = { aquasphere: null, wadaana: null };
const sseClients = { aquasphere: [], wadaana: [] };

const computeDashboardAnalytics = async (prefix) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0);
  const minDate = twelveMonthsAgo < startOfYear ? twelveMonthsAgo : startOfYear;

  const [orders, payments, expenses, purchases, spotSales, pendingPayables, rawMaterials, customersWithBottles, customerReceivablesAgg] = await Promise.all([
    prisma[`${prefix}Order`].findMany({
      where: { 
        createdAt: { gte: minDate, lte: endOfDay },
        deliveryStatus: { not: 'CANCELLED' }
      },
      select: { 
        id: true,
        createdAt: true, 
        deliveryStatus: true,
        paymentStatus: true,
        customer: { select: { id: true, name: true, phone: true } },
        items: { 
          select: { 
            price: true, 
            quantity: true,
            item: { select: { name: true, unit: true } }
          } 
        } 
      },
      orderBy: { createdAt: 'desc' }
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
      select: {
        createdAt: true,
        cashCollected: true,
        creditAmount: true,
        litresSold: true,
        totalLitres: true,
        items: {
          select: { saleType: true, quantity: true }
        }
      }
    }),
    prisma[`${prefix}VendorLedgerEntry`].groupBy({
      by: ['type'],
      _sum: { amount: true }
    }),
    prisma[`${prefix}Item`].findMany({
      where: { type: 'RAW_MATERIAL', archivedAt: null }
    }),
    prisma[`${prefix}Customer`].findMany({
      where: { cachedBottleBalance: { gt: 0 } },
      orderBy: { cachedBottleBalance: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        type: true,
        cachedBottleBalance: true,
        deposit: true,
        orders: {
          where: { deliveryStatus: 'DELIVERED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true }
        }
      }
    }),
    prisma[`${prefix}Customer`].aggregate({
      _sum: { currentBalance: true },
      where: { currentBalance: { gt: 0 }, archivedAt: null }
    })
  ]);

  const dayMap = Object.create(null);
  const monthMap = Object.create(null);

  const daily = { sales: 0, deliveredSales: 0, unprocessedSales: 0, unprocessedOrdersCount: 0, cash: 0, expenses: 0, credit: 0, bottlesSold: 0, purchases: 0, purchasesCount: 0, netCash: 0, waterLitres: 0, customWaterLitres: 0, refillWaterLitres: 0, bottledWaterLitres: 0, creditBilled: 0 };
  const monthly = { sales: 0, deliveredSales: 0, unprocessedSales: 0, unprocessedOrdersCount: 0, cash: 0, expenses: 0, credit: 0, bottlesSold: 0, purchases: 0, purchasesCount: 0, netCash: 0, waterLitres: 0, customWaterLitres: 0, refillWaterLitres: 0, bottledWaterLitres: 0, creditBilled: 0 };
  const yearly = { sales: 0, deliveredSales: 0, unprocessedSales: 0, unprocessedOrdersCount: 0, cash: 0, expenses: 0, credit: 0, bottlesSold: 0, purchases: 0, purchasesCount: 0, netCash: 0, waterLitres: 0, customWaterLitres: 0, refillWaterLitres: 0, bottledWaterLitres: 0, creditBilled: 0 };

  const getDKey = (d) => d.toISOString().split('T')[0];
  const getMKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const ensureDay = (key) => (dayMap[key] ||= { sales: 0, deliveredSales: 0, unprocessedSales: 0, unprocessedOrdersCount: 0, ordersCount: 0, orderCash: 0, spotSalesCash: 0, cashCollected: 0, creditBilled: 0, expenses: 0, purchases: 0, waterLitres: 0 });
  const ensureMonth = (key) => (monthMap[key] ||= { sales: 0, deliveredSales: 0, unprocessedSales: 0, unprocessedOrdersCount: 0, orderCash: 0, spotSalesCash: 0, cash: 0, expenses: 0, purchases: 0, waterLitres: 0 });

  for (const o of orders) {
    const d = new Date(o.createdAt);
    const total = (o.items || []).reduce((sum, item) => sum + (parseFloat(item.price || 0) * (item.quantity || 0)), 0);
    const isDelivered = o.deliveryStatus === 'DELIVERED';
    const isUnprocessed = o.deliveryStatus === 'PENDING' || o.deliveryStatus === 'PARTIAL';

    let orderLitres = 0;
    if (prefix !== 'wadaana') {
      for (const it of o.items || []) {
        const n = (it.item?.name || '').toLowerCase();
        const q = parseFloat(it.quantity || 0);
        if (n.includes('0.5') || n.includes('500')) orderLitres += q * 9.0;
        else if (n.includes('1.5') || n.includes('1500')) orderLitres += q * 12.0;
        else if (n.includes('19')) orderLitres += q * 24.0;
        else orderLitres += q;
      }
    }

    const day = ensureDay(getDKey(d));
    const month = ensureMonth(getMKey(d));
    day.sales += total;
    day.ordersCount += 1;
    day.waterLitres = (day.waterLitres || 0) + orderLitres;
    month.sales += total;
    month.waterLitres = (month.waterLitres || 0) + orderLitres;

    if (isDelivered) {
      day.deliveredSales += total;
      month.deliveredSales += total;
    }
    if (isUnprocessed) {
      day.unprocessedSales += total;
      day.unprocessedOrdersCount += 1;
      month.unprocessedSales += total;
      month.unprocessedOrdersCount += 1;
    }

    if (d >= startOfDay) { 
      daily.sales += total; 
      daily.bottlesSold += 1; 
      daily.waterLitres += orderLitres;
      daily.bottledWaterLitres += orderLitres;
      if (isDelivered) daily.deliveredSales += total;
      if (isUnprocessed) {
        daily.unprocessedSales += total;
        daily.unprocessedOrdersCount += 1;
      }
    }
    if (d >= startOfMonth) { 
      monthly.sales += total; 
      monthly.bottlesSold += 1; 
      monthly.waterLitres += orderLitres;
      monthly.bottledWaterLitres += orderLitres;
      if (isDelivered) monthly.deliveredSales += total;
      if (isUnprocessed) {
        monthly.unprocessedSales += total;
        monthly.unprocessedOrdersCount += 1;
      }
    }
    if (d >= startOfYear) { 
      yearly.sales += total; 
      yearly.bottlesSold += 1; 
      yearly.waterLitres += orderLitres;
      yearly.bottledWaterLitres += orderLitres;
      if (isDelivered) yearly.deliveredSales += total;
      if (isUnprocessed) {
        yearly.unprocessedSales += total;
        yearly.unprocessedOrdersCount += 1;
      }
    }
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
    const totalLit = parseFloat(st.totalLitres || st.litresSold || 0);
    let customLit = 0;
    let refillLit = 0;
    for (const it of st.items || []) {
      if (it.saleType === 'CUSTOM_WATER') {
        customLit += parseFloat(it.quantity || 0);
      } else if (it.saleType === 'WATER_REFILL') {
        refillLit += parseFloat(it.quantity || 0) * 24.0;
      }
    }

    const day = ensureDay(getDKey(d));
    const month = ensureMonth(getMKey(d));
    day.spotSalesCash += cashAmt;
    day.cashCollected += cashAmt;
    day.creditBilled += creditAmt;
    day.waterLitres = (day.waterLitres || 0) + totalLit;
    month.spotSalesCash += cashAmt;
    month.cash += cashAmt;
    month.waterLitres = (month.waterLitres || 0) + totalLit;
    if (d >= startOfDay) { 
      daily.cash += cashAmt; 
      daily.creditBilled += creditAmt; 
      daily.waterLitres += totalLit;
      daily.customWaterLitres += customLit;
      daily.refillWaterLitres += refillLit;
    }
    if (d >= startOfMonth) { 
      monthly.cash += cashAmt; 
      monthly.creditBilled += creditAmt; 
      monthly.waterLitres += totalLit;
      monthly.customWaterLitres += customLit;
      monthly.refillWaterLitres += refillLit;
    }
    if (d >= startOfYear) { 
      yearly.cash += cashAmt; 
      yearly.creditBilled += creditAmt; 
      yearly.waterLitres += totalLit;
      yearly.customWaterLitres += customLit;
      yearly.refillWaterLitres += refillLit;
    }
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

  daily.credit = Math.max(0, daily.deliveredSales - (daily.orderCash || 0)) + daily.creditBilled;
  monthly.credit = Math.max(0, monthly.deliveredSales - (monthly.orderCash || 0)) + monthly.creditBilled;
  yearly.credit = Math.max(0, yearly.deliveredSales - (yearly.orderCash || 0)) + yearly.creditBilled;

  daily.netCash = daily.cash - daily.expenses;
  monthly.netCash = monthly.cash - monthly.expenses;
  yearly.netCash = yearly.cash - yearly.expenses;

  const totalBottlesInCirculation = customersWithBottles.reduce((sum, c) => sum + (c.cachedBottleBalance || 0), 0);
  const bottleCustodyList = customersWithBottles.map(c => {
    const lastDelivery = c.orders?.[0]?.createdAt || null;
    const daysElapsed = lastDelivery 
      ? Math.floor((now.getTime() - new Date(lastDelivery).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      customerType: c.type,
      cachedBottleBalance: c.cachedBottleBalance,
      depositAmount: parseFloat(c.deposit || 0),
      lastDeliveryDate: lastDelivery,
      daysElapsed
    };
  });

  const bottleCustody = prefix === 'wadaana' 
    ? { totalInCirculation: 0, customers: [] }
    : {
        totalInCirculation: totalBottlesInCirculation,
        customers: bottleCustodyList
      };

  const dailySalesHistory = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateKey = getDKey(d);
    const bucket = dayMap[dateKey] || { sales: 0, ordersCount: 0, orderCash: 0, spotSalesCash: 0, cashCollected: 0, creditBilled: 0, expenses: 0, purchases: 0 };
    dailySalesHistory.push({
      date: dateKey,
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      ...bucket,
      netCash: bucket.cashCollected - bucket.expenses
    });
  }

  const monthlyTrend = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0);
    const mKey = getMKey(d);
    const bucket = monthMap[mKey] || { sales: 0, cash: 0, expenses: 0, purchases: 0, spotSalesCash: 0, orderCash: 0 };
    monthlyTrend.push({
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      ...bucket,
      netCash: bucket.cash - bucket.expenses
    });
  }

  const purchaseTotal = pendingPayables.find(e => e.type === 'PURCHASE')?._sum?.amount || 0;
  const paymentTotal = pendingPayables.find(e => e.type === 'PAYMENT')?._sum?.amount || 0;
  const pendingVendorPayables = Math.max(0, Number(purchaseTotal) - Number(paymentTotal));
  const lowStockMaterials = rawMaterials.filter(item => parseFloat(item.cachedQty || 0) < parseFloat(item.reorderLevel || 0));

  const unprocessedOrders = orders
    .filter(o => o.deliveryStatus === 'PENDING' || o.deliveryStatus === 'PARTIAL')
    .slice(0, 20)
    .map(o => {
      const orderTotal = (o.items || []).reduce((sum, item) => sum + (parseFloat(item.price || 0) * (item.quantity || 0)), 0);
      const itemsSummary = (o.items || []).map(i => `${i.quantity}x ${i.item?.name || 'Item'}`).join(', ');
      return {
        id: o.id,
        shortId: `#${o.id.substring(0, 8).toUpperCase()}`,
        createdAt: o.createdAt,
        customerName: o.customer?.name || 'Walk-in Customer',
        customerPhone: o.customer?.phone || '—',
        deliveryStatus: o.deliveryStatus,
        paymentStatus: o.paymentStatus,
        totalAmount: orderTotal,
        itemsSummary: itemsSummary || '—'
      };
    });

  const totalOutstandingReceivables = Number(customerReceivablesAgg?._sum?.currentBalance || 0);

  const calciumItem = rawMaterials.find(m => (m.name || '').toLowerCase().includes('calcium'));
  const magnesiumItem = rawMaterials.find(m => (m.name || '').toLowerCase().includes('magnesium'));
  const sodiumItem = rawMaterials.find(m => (m.name || '').toLowerCase().includes('sodium'));
  const antiscalantItem = rawMaterials.find(m => (m.name || '').toLowerCase().includes('antiscalant'));

  const caQty = Number(calciumItem?.cachedQty || 0);
  const mgQty = Number(magnesiumItem?.cachedQty || 0);
  const naQty = Number(sodiumItem?.cachedQty || 0);
  const antiQty = Number(antiscalantItem?.cachedQty || 0);

  // 15,141L capacity per full mineral set: Ca: 2kg, Mg: 1kg, Na: 0.5kg
  const caBatches = caQty / 2;
  const mgBatches = mgQty / 1;
  const naBatches = naQty / 0.5;
  const batchesAvailable = Math.max(0, Math.min(caBatches, mgBatches, naBatches));
  const mineralCapacityLitres = Math.round(batchesAvailable * 15141);

  return {
    ...daily,
    daily,
    monthly,
    yearly,
    totalReceivables: totalOutstandingReceivables,
    totalOutstandingReceivables,
    mineralMetrics: prefix === 'wadaana' ? null : {
      calciumStock: caQty,
      magnesiumStock: mgQty,
      sodiumStock: naQty,
      antiscalantStock: antiQty,
      batchesAvailable: Number(batchesAvailable.toFixed(2)),
      mineralCapacityLitres,
      isLow: batchesAvailable < 2
    },
    waterMetrics: prefix === 'wadaana' ? null : {
      dailyLitres: daily.waterLitres,
      dailyCustomLitres: daily.customWaterLitres,
      dailyRefillLitres: daily.refillWaterLitres,
      dailyBottledLitres: daily.bottledWaterLitres,
      monthlyLitres: monthly.waterLitres,
      monthlyCustomLitres: monthly.customWaterLitres,
      monthlyRefillLitres: monthly.refillWaterLitres,
      yearlyLitres: yearly.waterLitres
    },
    bottleCustody,
    unprocessedOrders,
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

const debounceTimers = { aquasphere: null, wadaana: null };

/** Broadcasts SSE update with debouncing to prevent database pool exhaustion */
export const broadcastDashboardUpdate = (prefix = 'aquasphere') => {
  if (debounceTimers[prefix]) {
    clearTimeout(debounceTimers[prefix]);
  }
  debounceTimers[prefix] = setTimeout(async () => {
    debounceTimers[prefix] = null;
    try {
      cachedDashboardData[prefix] = await computeDashboardAnalytics(prefix);
      const payload = `data: ${JSON.stringify({ success: true, data: cachedDashboardData[prefix] })}\n\n`;
      sseClients[prefix].forEach(client => client.write(payload));
    } catch (error) {
      console.error(`Error broadcasting dashboard update for ${prefix}:`, error);
    }
  }, 2500);
};

/** High-level dashboard analytics */
export const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  cachedDashboardData[prefix] = await computeDashboardAnalytics(prefix);
  return sendSuccess(res, cachedDashboardData[prefix]);
});

/** Monthly purchasing summary and vendor balances */
export const getPurchasingSummary = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [recentPurchases, vendors, ledgerSums, topMaterials] = await Promise.all([
    prisma[`${prefix}Purchase`].findMany({
      take: 7,
      orderBy: { purchaseDate: 'desc' },
      include: {
        vendor: { select: { id: true, name: true } },
        items: { include: { item: { select: { name: true, unit: true } } } }
      }
    }),
    prisma[`${prefix}Vendor`].findMany({
      where: { archivedAt: null },
      select: { id: true, name: true, phone: true }
    }),
    prisma[`${prefix}VendorLedgerEntry`].groupBy({
      by: ['vendorId', 'type'],
      _sum: { amount: true }
    }),
    prisma[`${prefix}PurchaseItem`].groupBy({
      by: ['itemId'],
      _sum: { total: true, quantity: true },
      where: { purchase: { purchaseDate: { gte: startOfMonth, lte: endOfDay } } },
      orderBy: { _sum: { total: 'desc' } },
      take: 6
    })
  ]);

  const balanceMap = {};
  for (const entry of ledgerSums) {
    balanceMap[entry.vendorId] ||= { purchases: 0, payments: 0 };
    if (entry.type === 'PURCHASE') balanceMap[entry.vendorId].purchases = Number(entry._sum.amount);
    if (entry.type === 'PAYMENT') balanceMap[entry.vendorId].payments = Number(entry._sum.amount);
  }

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

  return sendSuccess(res, {
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
  });
});

/** Streams real-time dashboard analytics via SSE */
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

/** Daily financial summary for a target date */
export const getDailySummary = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { date } = req.query;
  if (!date) throw new Error('Date is required');

  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0);
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const [deliveryPayments, spotSalesAgg, expensesAgg, creditSalesAgg, vendorCashPayments, spotSalesTotalAgg] = await Promise.all([
    prisma[`${prefix}Payment`].aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: targetDate, lt: nextDate }, type: 'CASH' }
    }),
    prisma[`${prefix}SpotSale`].aggregate({
      _sum: { cashCollected: true, creditAmount: true, litresSold: true },
      where: { createdAt: { gte: targetDate, lt: nextDate }, paymentMethod: 'CASH' }
    }),
    prisma[`${prefix}Expense`].aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: targetDate, lt: nextDate } }
    }),
    prisma[`${prefix}SpotSale`].aggregate({
      _sum: { creditAmount: true },
      where: { createdAt: { gte: targetDate, lt: nextDate }, creditAmount: { gt: 0 } }
    }),
    prisma[`${prefix}VendorPayment`].aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: targetDate, lt: nextDate }, paymentMethod: 'CASH' }
    }),
    prisma[`${prefix}SpotSale`].aggregate({
      _sum: { totalLitres: true, litresSold: true, totalBottles: true, totalCaps: true },
      where: { createdAt: { gte: targetDate, lt: nextDate } }
    })
  ]);

  const totalDeliveryAmount = parseFloat(deliveryPayments._sum.amount || 0);
  const totalSpotSales = parseFloat(spotSalesAgg._sum.cashCollected || 0);
  const totalCreditSales = parseFloat(creditSalesAgg._sum.creditAmount || 0);
  const totalExpenses = parseFloat(expensesAgg._sum.amount || 0);
  const totalVendorCash = parseFloat(vendorCashPayments._sum.amount || 0);
  const totalLitres = parseFloat(spotSalesTotalAgg._sum.totalLitres || spotSalesTotalAgg._sum.litresSold || spotSalesAgg._sum.litresSold || 0);
  const totalBottles = parseInt(spotSalesTotalAgg._sum.totalBottles || 0, 10);
  const totalCaps = parseInt(spotSalesTotalAgg._sum.totalCaps || 0, 10);
  const netCash = Math.max(0, totalDeliveryAmount + totalSpotSales - totalExpenses - totalVendorCash);

  return sendSuccess(res, {
    totalDeliveryAmount,
    totalSpotSales,
    totalCreditSales,
    totalExpenses,
    totalVendorCash,
    totalLitres,
    counterSales: {
      totalLitres,
      totalBottles,
      totalCaps
    },
    netCash,
    date: targetDate.toISOString().split('T')[0]
  });
});

/** Production performance dashboard data */
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
        qtyPure05L: true, qtyPure15L: true, qtyMix05L: true, qtyMix15L: true,
        brokenPure05L: true, brokenPure15L: true, brokenMix05L: true, brokenMix15L: true
      } : {
        quantity: true, packs05L: true, packs15L: true,
        brokenBottles05L: true, brokenBottles15L: true, wasteQuantity: true
      },
      _count: { id: true }
    }),
    prodBatchModel.findMany({ take: 6, orderBy: { createdAt: 'desc' } }),
    itemModel.findMany({ where: { type: 'FINISHED_GOOD', archivedAt: null }, orderBy: { name: 'asc' } }),
    itemModel.findMany({ where: { type: 'RAW_MATERIAL', archivedAt: null }, orderBy: { name: 'asc' } }),
    purchaseModel.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { name: true } },
        items: { include: { item: { select: { name: true, unit: true } } } }
      }
    }),
    dailyCloseModel.findFirst({ where: { date: startOfDay } }),
    prodBatchModel.count({ where: { batchDate: { gte: startOfDay, lte: endOfDay }, status: 'PENDING' } }),
    prodBatchModel.findMany({ where: { batchDate: { gte: startDate } }, orderBy: { batchDate: 'asc' } })
  ]);

  const dailyHistory = [];
  for (let i = daysNum - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dayStr = daysNum > 14 ? `${d.getMonth() + 1}/${d.getDate()}` : d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateKey = d.toISOString().split('T')[0];
    const dayBatches = pastWeekBatches.filter(b => b.batchDate && new Date(b.batchDate).toISOString().split('T')[0] === dateKey);

    if (isWadaana) {
      dailyHistory.push({
        day: dayStr,
        date: dateKey,
        qtyPure05L: dayBatches.reduce((s, b) => s + Number(b.qtyPure05L || 0), 0),
        qtyPure15L: dayBatches.reduce((s, b) => s + Number(b.qtyPure15L || 0), 0),
        qtyMix05L: dayBatches.reduce((s, b) => s + Number(b.qtyMix05L || 0), 0),
        qtyMix15L: dayBatches.reduce((s, b) => s + Number(b.qtyMix15L || 0), 0),
        totalWaste: dayBatches.reduce((s, b) => s + (Number(b.brokenPure05L || 0) + Number(b.brokenPure15L || 0) + Number(b.brokenMix05L || 0) + Number(b.brokenMix15L || 0)), 0)
      });
    } else {
      dailyHistory.push({
        day: dayStr,
        date: dateKey,
        total19L: dayBatches.reduce((s, b) => s + Number(b.quantity || 0), 0),
        packs15L: dayBatches.reduce((s, b) => s + Number(b.packs15L || 0), 0),
        packs05L: dayBatches.reduce((s, b) => s + Number(b.packs05L || 0), 0),
        totalWaste: dayBatches.reduce((s, b) => s + (Number(b.wasteQuantity || 0) + Number(b.brokenBottles15L || 0) + Number(b.brokenBottles05L || 0)), 0)
      });
    }
  }

  const rawMaterialHealth = rawMaterials.map(mat => {
    const qty = Number(mat.cachedQty || 0);
    const reorder = Number(mat.reorderLevel || 0);
    const isCritical = qty <= 0;
    const isLow = reorder > 0 && qty <= reorder;

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
    if (u?.name) return u.name;
    if (u?.role) return u.role.replace(/_/g, ' ');
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(producedBy) ? 'Production Manager' : producedBy;
  };

  const calcium = rawMaterials.find(m => (m.name || '').toLowerCase().includes('calcium'));
  const magnesium = rawMaterials.find(m => (m.name || '').toLowerCase().includes('magnesium'));
  const sodium = rawMaterials.find(m => (m.name || '').toLowerCase().includes('sodium'));
  const caQty = Number(calcium?.cachedQty || 0);
  const mgQty = Number(magnesium?.cachedQty || 0);
  const naQty = Number(sodium?.cachedQty || 0);
  const batchesAvailable = Math.max(0, Math.min(caQty / 2, mgQty / 1, naQty / 0.5));
  const mineralCapacityLitres = Math.round(batchesAvailable * 15141);

  return sendSuccess(res, {
    todaysProduction,
    dailyProductionHistory: dailyHistory,
    mineralMetrics: {
      batchesAvailable: Number(batchesAvailable.toFixed(1)),
      mineralCapacityLitres,
      calciumStock: caQty,
      magnesiumStock: mgQty,
      sodiumStock: naQty
    },
    finishedGoods: finishedGoods.map(fg => ({
      id: fg.id,
      name: fg.name,
      unit: fg.unit,
      factoryQty: Number(fg.factoryQty || 0),
      warehouseQty: Number(fg.warehouseQty || 0),
      cachedQty: Number(fg.cachedQty || 0)
    })),
    rawMaterialHealth,
    lowStockCount: rawMaterialHealth.filter(m => m.status !== 'IN_STOCK').length,
    pendingBatchesCount,
    recentBatches: recentBatches.map(b => ({
      id: b.id,
      shortId: `#${b.id.substring(0, 8).toUpperCase()}`,
      batchDate: b.batchDate,
      status: b.status,
      createdBy: formatLoggedBy(b.producedBy),
      ...(isWadaana ? {
        qtyPure05L: b.qtyPure05L || 0,
        qtyPure15L: b.qtyPure15L || 0,
        qtyMix05L: b.qtyMix05L || 0,
        qtyMix15L: b.qtyMix15L || 0,
        wasteQuantity: (b.brokenPure05L || 0) + (b.brokenPure15L || 0) + (b.brokenMix05L || 0) + (b.brokenMix15L || 0)
      } : {
        quantity: b.quantity || 0,
        packs15L: b.packs15L || 0,
        packs05L: b.packs05L || 0,
        wasteQuantity: (b.wasteQuantity || 0) + (b.brokenBottles15L || 0) + (b.brokenBottles05L || 0)
      })
    })),
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
  });
});

/** Dedicated endpoint for 19L Bottle Custody & Recovery feed */
export const getBottleCustody = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const now = new Date();
  const customersWithBottles = await prisma[`${prefix}Customer`].findMany({
    where: { cachedBottleBalance: { gt: 0 } },
    orderBy: { cachedBottleBalance: 'desc' },
    select: {
      id: true,
      name: true,
      phone: true,
      type: true,
      cachedBottleBalance: true,
      deposit: true,
      orders: {
        where: { deliveryStatus: 'DELIVERED' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true }
      }
    }
  });

  const totalBottlesInCirculation = customersWithBottles.reduce((sum, c) => sum + (c.cachedBottleBalance || 0), 0);
  const bottleCustodyList = customersWithBottles.map(c => {
    const lastDelivery = c.orders?.[0]?.createdAt || null;
    const daysElapsed = lastDelivery 
      ? Math.floor((now.getTime() - new Date(lastDelivery).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      customerType: c.type,
      cachedBottleBalance: c.cachedBottleBalance,
      depositAmount: parseFloat(c.deposit || 0),
      lastDeliveryDate: lastDelivery,
      daysElapsed
    };
  });

  return sendSuccess(res, {
    totalInCirculation: totalBottlesInCirculation,
    customers: bottleCustodyList
  });
});


