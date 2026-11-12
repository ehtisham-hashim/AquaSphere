import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getTenantPrefix } from '../utils/tenant.js';

const getPrefix = getTenantPrefix;

/**
 * Feature 2: Admin View-Only Dashboard
 * Retrieves aggregated operational metrics (inventory levels, production yield, active orders, cash collected)
 * for the current tenant. Deliberately omits profit and COGS metrics per permission matrix.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getAdminDashboard = asyncHandler(async (req, res) => {
  const prefix = getPrefix(req);
  const timeframe = (req.query.timeframe || 'TODAY').toUpperCase();

  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  let endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (timeframe === 'YESTERDAY') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
  } else if (timeframe === 'LAST_3_DAYS') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0);
  } else if (timeframe === '1_WEEK' || timeframe === 'WEEKLY') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
  } else if (timeframe === '1_MONTH' || timeframe === 'MONTHLY') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  } else if (timeframe === '1_YEAR' || timeframe === 'YEARLY') {
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
  }

  const [
    todaysOrders,
    pendingOrders,
    pendingOrdersCount,
    todaysDeliveriesCount,
    todaysProductionBatches,
    rawMaterials,
    finishedGoods,
    cashCollected,
    todaysDailyClose,
    spotSalesAgg,
    spotSalesRows,
    customerReceivablesAgg
  ] = await Promise.all([
    // Orders count + list in timeframe
    prisma[`${prefix}Order`].findMany({
      where: { createdAt: { gte: startDate, lte: endOfDay } },
      include: {
        customer: { select: { name: true, phone: true } },
        items: { select: { quantity: true, price: true, item: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    // Pending orders (table display capped at 50)
    prisma[`${prefix}Order`].findMany({
      where: { deliveryStatus: { in: ['PENDING', 'PARTIAL'] } },
      include: {
        customer: { select: { name: true, phone: true } },
        items: { select: { quantity: true, price: true, item: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    // Uncapped pending orders count for KPI
    prisma[`${prefix}Order`].count({
      where: { deliveryStatus: { in: ['PENDING', 'PARTIAL'] } }
    }),
    // Completed deliveries count in timeframe
    prisma[`${prefix}Delivery`].count({
      where: { deliveredAt: { gte: startDate, lte: endOfDay } }
    }),
    // Production batches in timeframe (filtered by batchDate for consistency)
    prisma[`${prefix}ProductionBatch`].findMany({
      where: { batchDate: { gte: startDate, lte: endOfDay } },
      include: { outputItem: { select: { name: true } } },
      orderBy: { batchDate: 'desc' }
    }),
    // All raw materials (inventory view)
    prisma[`${prefix}Item`].findMany({
      where: { type: 'RAW_MATERIAL', archivedAt: null },
      select: { id: true, name: true, unit: true, cachedQty: true, reorderLevel: true },
      orderBy: { name: 'asc' }
    }),
    // All finished goods (inventory view)
    prisma[`${prefix}Item`].findMany({
      where: { type: 'FINISHED_GOOD', archivedAt: null },
      select: { id: true, name: true, unit: true, cachedQty: true, reorderLevel: true },
      orderBy: { name: 'asc' }
    }),
    // Cash collected in timeframe
    prisma[`${prefix}Payment`].aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: startDate, lte: endOfDay } }
    }),
    // Daily close status
    prisma[`${prefix}DailyClose`].findFirst({
      where: { date: { gte: startDate, lte: endOfDay } }
    }),
    // Spot sales aggregates in timeframe
    prisma[`${prefix}SpotSale`].aggregate({
      _sum: { cashCollected: true, amountPaid: true, totalAmount: true },
      _count: { id: true },
      where: { createdAt: { gte: startDate, lte: endOfDay } }
    }),
    // Spot sales items for strict CUSTOM_WATER + WATER_REFILL (19L) litres calculation
    prisma[`${prefix}SpotSale`].findMany({
      where: { createdAt: { gte: startDate, lte: endOfDay } },
      select: {
        items: { select: { saleType: true, quantity: true } }
      }
    }),
    // Total customer receivables
    prisma[`${prefix}Customer`].aggregate({
      _sum: { currentBalance: true },
      where: { currentBalance: { gt: 0 }, archivedAt: null }
    })
  ]);

  // Compute low-stock alerts
  const lowStockItems = rawMaterials.filter(
    item => parseFloat(item.cachedQty) < parseFloat(item.reorderLevel)
  );

  // Production summary across AquaSphere, Wadaana, and custom remarks.producedItems
  let totalGoodYield = 0;
  let totalWaste = 0;
  let packs05LToday = 0;
  let packs15LToday = 0;

  const parseProducedRemarks = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.producedItems) ? parsed.producedItems : null;
    } catch {
      return null;
    }
  };

  todaysProductionBatches.forEach(b => {
    const producedList = parseProducedRemarks(b.remarks);
    if (producedList && producedList.length > 0) {
      totalGoodYield += producedList.reduce((s, it) => s + Number(it.quantity || 0), 0);
    } else if (prefix === 'wadaana') {
      totalGoodYield += Number(b.qtyPure05L || 0) + Number(b.qtyPure15L || 0) + Number(b.qtyMix05L || 0) + Number(b.qtyMix15L || 0) + Number(b.quantity || 0);
    } else {
      // AquaSphere: avoid double-counting if legacy batch has both quantity and packs05L/15L
      const packsSum = Number(b.packs05L || 0) + Number(b.packs15L || 0);
      totalGoodYield += packsSum > 0 ? (packsSum + (b.outputItemId ? 0 : Number(b.quantity || 0))) : Number(b.quantity || 0);
    }

    if (prefix === 'wadaana') {
      totalWaste += Number(b.brokenPure05L || 0) + Number(b.brokenPure15L || 0) + Number(b.brokenMix05L || 0) + Number(b.brokenMix15L || 0) + Number(b.wasteQuantity || 0);
    } else {
      totalWaste += Number(b.wasteQuantity || 0) || (Number(b.brokenBottles05L || 0) + Number(b.brokenBottles15L || 0));
    }
    packs05LToday += Number(b.packs05L || 0);
    packs15LToday += Number(b.packs15L || 0);
  });

  // Format orders for table
  const ordersTable = todaysOrders.map(o => ({
    id: o.id,
    customerName: o.customer?.name || 'Walk-in / Unknown',
    customerPhone: o.customer?.phone || '—',
    type: o.type,
    deliveryStatus: o.deliveryStatus,
    paymentStatus: o.paymentStatus,
    itemSummary: o.items.map(i => `${i.quantity}x ${i.item?.name || 'Item'}`).join(', ') || 'No items',
    createdAt: o.createdAt
  }));

  const pendingOrdersTable = pendingOrders.map(o => ({
    id: o.id,
    customerName: o.customer?.name || 'Unknown',
    customerPhone: o.customer?.phone || '—',
    type: o.type,
    deliveryStatus: o.deliveryStatus,
    paymentStatus: o.paymentStatus,
    itemSummary: o.items.map(i => `${i.quantity}x ${i.item?.name || 'Item'}`).join(', ') || 'No items',
    createdAt: o.createdAt
  }));

  // Format production table
  const productionTable = todaysProductionBatches.map(b => {
    const producedList = parseProducedRemarks(b.remarks);
    const derivedName = producedList?.length > 0
      ? producedList.map(it => `${it.quantity}x ${it.name}`).join(', ')
      : (b.outputItem?.name || (prefix === 'wadaana' ? 'PET Bottles' : (b.quantity ? '19L Refill Bottle' : 'PET Production Run')));
    const derivedQty = producedList?.length > 0
      ? producedList.reduce((s, it) => s + Number(it.quantity || 0), 0)
      : (prefix === 'wadaana'
        ? (Number(b.qtyPure05L || 0) + Number(b.qtyPure15L || 0) + Number(b.qtyMix05L || 0) + Number(b.qtyMix15L || 0) + Number(b.quantity || 0))
        : (Number(b.quantity || 0)));
    return {
      id: b.id,
      outputItem: derivedName,
      quantity: derivedQty,
      wasteQuantity: prefix === 'wadaana'
        ? (Number(b.brokenPure05L || 0) + Number(b.brokenPure15L || 0) + Number(b.brokenMix05L || 0) + Number(b.brokenMix15L || 0) + Number(b.wasteQuantity || 0))
        : (Number(b.wasteQuantity || 0) || (Number(b.brokenBottles05L || 0) + Number(b.brokenBottles15L || 0))),
      packs05L: b.packs05L || 0,
      packs15L: b.packs15L || 0,
      broken05L: b.brokenBottles05L || 0,
      broken15L: b.brokenBottles15L || 0,
      status: b.status,
      notes: b.notes || '—',
      createdAt: b.batchDate || b.createdAt
    };
  });

  const orderPayments = Number(cashCollected._sum.amount || 0);
  const spotCash = Math.max(Number(spotSalesAgg._sum.amountPaid || 0), Number(spotSalesAgg._sum.cashCollected || 0));
  const spotSalesCount = Number(spotSalesAgg._count.id || 0);
  const spotSalesRevenue = Number(spotSalesAgg._sum.totalAmount || 0);
  const ordersRevenue = todaysOrders.reduce((s, o) => {
    if (o.deliveryStatus === 'CANCELLED') return s;
    const sub = o.items.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
    return s + (o.withGst ? sub + Math.round(sub * 0.18) : sub);
  }, 0);

  let dispensedLitres = 0;
  if (prefix !== 'wadaana') {
    for (const s of spotSalesRows) {
      for (const it of s.items || []) {
        if (it.saleType === 'CUSTOM_WATER') dispensedLitres += Number(it.quantity || 0);
        else if (it.saleType === 'WATER_REFILL') dispensedLitres += Number(it.quantity || 0) * 19;
      }
    }
  }

  res.status(200).json(new ApiResponse(200, {
    kpis: {
      todaysOrdersCount: todaysOrders.length,
      pendingOrdersCount: pendingOrdersCount,
      todaysDeliveriesCount,
      spotSalesCount,
      spotSalesRevenue,
      todaysRevenue: ordersRevenue + spotSalesRevenue,
      totalProductionYield: totalGoodYield,
      packs05LProduced: packs05LToday,
      packs15LProduced: packs15LToday,
      productionWaste: totalWaste,
      totalCashCollected: orderPayments + spotCash,
      cashFromOrders: orderPayments,
      cashFromSpotSales: spotCash,
      todaysWaterDispensedLitres: dispensedLitres,
      totalOutstandingReceivables: Number(customerReceivablesAgg._sum.currentBalance || 0),
      dailyCloseStatus: {
        isClosed: Boolean(todaysDailyClose?.adminConfirmed),
        pmConfirmed: Boolean(todaysDailyClose?.pmConfirmed),
        mmConfirmed: Boolean(todaysDailyClose?.mmConfirmed),
        adminConfirmed: Boolean(todaysDailyClose?.adminConfirmed),
        closedAt: todaysDailyClose?.closedAt || null
      }
    },
    alerts: {
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems.map(i => ({
        id: i.id,
        name: i.name,
        currentStock: parseFloat(i.cachedQty),
        reorderLevel: parseFloat(i.reorderLevel),
        unit: i.unit
      }))
    },
    rawMaterials: rawMaterials.map(m => ({
      id: m.id,
      name: m.name,
      unit: m.unit,
      cachedQty: parseFloat(m.cachedQty),
      reorderLevel: parseFloat(m.reorderLevel)
    })),
    finishedGoods: finishedGoods.map(m => ({
      id: m.id,
      name: m.name,
      unit: m.unit,
      cachedQty: parseFloat(m.cachedQty),
      reorderLevel: parseFloat(m.reorderLevel)
    })),
    ordersTable,
    pendingOrdersTable,
    productionTable
  }, 'Admin dashboard fetched'));
});

/**
 * Feature 4: Cash Summary (No Profit)
 * Shows cash collected only from orders and spot sales — deliberately omits COGS, expenses, and profit margin.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getAdminCashSummary = asyncHandler(async (req, res) => {
  const prefix = getPrefix(req);
  const { date, timeframe } = req.query;

  const now = new Date();
  let startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  let endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (date) {
    const targetDate = new Date(date);
    startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
  } else if (timeframe) {
    const tf = timeframe.toUpperCase();
    if (tf === 'YESTERDAY') {
      startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (tf === 'LAST_3_DAYS') {
      startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0);
    } else if (tf === '1_WEEK' || tf === 'WEEKLY') {
      startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
    } else if (tf === '1_MONTH' || tf === 'MONTHLY') {
      startOfDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else if (tf === '1_YEAR' || tf === 'YEARLY') {
      startOfDay = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    }
  }

  const [paymentsSum, paymentsByMethodList, paymentsCount, spotSalesCount, ordersList, spotSalesList] = await Promise.all([
    prisma[`${prefix}Payment`].aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: startOfDay, lte: endOfDay } }
    }),
    prisma[`${prefix}Payment`].groupBy({
      by: ['type'],
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      _sum: { amount: true }
    }),
    prisma[`${prefix}Payment`].count({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } }
    }),
    prisma[`${prefix}SpotSale`].count({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } }
    }),
    prisma[`${prefix}Order`].findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay }, deliveryStatus: { not: 'CANCELLED' } },
      select: {
        payments: { select: { amount: true } },
        items: { select: { quantity: true, price: true, item: { select: { name: true } } } }
      }
    }),
    prisma[`${prefix}SpotSale`].findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      select: { amountPaid: true, cashCollected: true, paymentMethod: true }
    })
  ]);

  const totalPayments = Number(paymentsSum._sum.amount || 0);
  const totalSpotSales = spotSalesList.reduce((sum, s) => sum + Number(s.amountPaid || s.cashCollected || 0), 0);

  // Group payments and spot sales by actual method
  const byMethod = { CASH: 0, BANK_TRANSFER: 0, EASYPAISA: 0, JAZZCASH: 0, CHEQUE: 0 };
  paymentsByMethodList.forEach(p => {
    const method = (p.type || 'CASH').toUpperCase();
    if (byMethod[method] !== undefined) {
      byMethod[method] += Number(p._sum.amount || 0);
    } else {
      byMethod.CASH += Number(p._sum.amount || 0);
    }
  });

  spotSalesList.forEach(s => {
    const method = (s.paymentMethod || 'CASH').toUpperCase();
    const amt = Number(s.amountPaid || s.cashCollected || 0);
    if (byMethod[method] !== undefined) {
      byMethod[method] += amt;
    } else {
      byMethod.CASH += amt;
    }
  });

  const salesBySize = { '19L': totalSpotSales, '1.5L': 0, '0.5L': 0 };
  const cashBySize = { '19L': totalSpotSales, '1.5L': 0, '0.5L': 0 };

  ordersList.forEach(o => {
    const orderPaid = o.payments?.reduce((s, p) => s + Number(p.amount || 0), 0) || 0;
    const items = (o.items || []).map(it => {
      const n = (it.item?.name || '').toLowerCase();
      let sz = null;
      if (n.includes('19l') || n.includes('19 l')) sz = '19L';
      else if (n.includes('1.5') || n.includes('1500')) sz = '1.5L';
      else if (n.includes('0.5') || n.includes('500')) sz = '0.5L';
      return { sz, rev: Number(it.price || 0) * (it.quantity || 0) };
    }).filter(x => x.sz);
    const totalRev = items.reduce((s, x) => s + x.rev, 0) || 1;
    items.forEach(({ sz, rev }) => {
      salesBySize[sz] = (salesBySize[sz] || 0) + rev;
      cashBySize[sz] = (cashBySize[sz] || 0) + Math.round(orderPaid * (rev / totalRev));
    });
  });

  res.status(200).json(new ApiResponse(200, {
    totalCashCollected: totalPayments + totalSpotSales,
    fromOrders: totalPayments,
    fromSpotSales: totalSpotSales,
    paymentsByMethod: byMethod,
    cashByMethod: byMethod,
    salesBySize,
    cashBySize,
    paymentsCount,
    spotSalesCount,
    date: startOfDay.toISOString().split('T')[0]
    // NOTE: No profit, no COGS, no expense data — intentionally excluded per §4 permission matrix
  }, 'Admin cash summary fetched'));
});

/**
 * Feature 5: Customer Alert Monitoring (Read-Only)
 * Analyzes customer balances and order history to identify credit breaches, overdue invoices (>7 days), and inactive customers.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getCustomerAlerts = asyncHandler(async (req, res) => {
  const prefix = getPrefix(req);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const allCustomers = await prisma[`${prefix}Customer`].findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      name: true,
      phone: true,
      type: true,
      currentBalance: true,
      creditDuration: true,
      lastDeliveryAt: true,
      createdAt: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          createdAt: true,
          deliveryStatus: true,
          paymentStatus: true,
          items: { select: { quantity: true, price: true } }
        }
      }
    }
  });

  // Credit breaches — deprecated, kept as empty array for backwards compatibility
  const creditBreaches = [];

  // Unpaid bills older than 7 days
  const unpaidBillOver7Days = [];
  allCustomers.forEach(c => {
    const oldUnpaid = c.orders.filter(o => (o.paymentStatus === 'UNPAID' || o.paymentStatus === 'PARTIAL') && new Date(o.createdAt) < sevenDaysAgo);
    if (oldUnpaid.length > 0) {
      const unpaidSum = oldUnpaid.reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + (Number(i.quantity || 0) * Number(i.price || 0)), 0) || 0), 0);
      unpaidBillOver7Days.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        type: c.type,
        unpaidAmount: unpaidSum,
        oldestOrderDate: oldUnpaid[oldUnpaid.length - 1].createdAt,
        daysOverdue: Math.floor((Date.now() - new Date(oldUnpaid[oldUnpaid.length - 1].createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        alertType: 'UNPAID_BILL_OVER_7D',
        recommendation: 'Generate invoice and contact customer for collection.'
      });
    }
  });

  // Inactivity / No repeat order in 7+ days
  const inactiveCustomers = allCustomers.filter(c => {
    const lastDate = c.lastDeliveryAt || c.orders[0]?.createdAt;
    if (!lastDate) return new Date(c.createdAt) < sevenDaysAgo;
    return new Date(lastDate) < sevenDaysAgo;
  }).map(c => {
    const lastDate = c.lastDeliveryAt || c.orders[0]?.createdAt;
    const days = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)) : '7+';
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      type: c.type,
      lastOrderDate: lastDate || null,
      daysSinceLastOrder: days,
      alertType: 'INACTIVE_7D',
      recommendation: 'Call customer to ask if they are still an active customer.'
    };
  });

  res.status(200).json(new ApiResponse(200, {
    creditBreaches,
    unpaidBillOver7Days,
    inactiveCustomers,
    totalAlerts: creditBreaches.length + unpaidBillOver7Days.length + inactiveCustomers.length
  }, 'Customer alerts fetched successfully'));
});

/**
 * Feature: Notification Bar Alerts
 * Returns strictly the 4 operational alert categories for TopNav:
 * 1. Customer create (new customer registrations from audit logs)
 * 2. Stock low (raw materials & finished goods below reorder level)
 * 3. Customer who didn't pay yet (unpaid balance / bills older than 7 days)
 * 4. Customer who didn't repeat to buy (inactive customers with no repeat order in 7+ days)
 *
 * Excludes noisy activity: order create, order deliver, payment settlements, production batches.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getNotificationAlerts = asyncHandler(async (req, res) => {
  const prefix = getPrefix(req);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Consolidated parallel fetch across multi-tenant models
  const [customerLogs, items, allCustomers] = await Promise.all([
    prisma[`${prefix}AuditLog`].findMany({
      where: {
        action: { in: ['CUSTOMER_ADDED', 'CUSTOMER_CREATED'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    prisma[`${prefix}Item`].findMany({
      where: { archivedAt: null },
      select: { id: true, name: true, unit: true, cachedQty: true, reorderLevel: true, updatedAt: true }
    }),
    prisma[`${prefix}Customer`].findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        name: true,
        phone: true,
        currentBalance: true,
        creditDuration: true,
        lastDeliveryAt: true,
        createdAt: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            createdAt: true,
            deliveryStatus: true,
            paymentStatus: true,
            items: { select: { quantity: true, price: true } }
          }
        }
      }
    })
  ]);

  // Extract user names for audit logs
  const userIds = [...new Set(customerLogs.map(l => l.performedBy).filter(Boolean))];
  const userMap = {};
  if (userIds.length > 0) {
    try {
      const users = await prisma[`${prefix}User`].findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, role: true }
      });
      users.forEach(u => {
        userMap[u.id] = `${u.name} (${u.role.replace('_', ' ')})`;
      });
    } catch {
      // Ignore user lookup error
    }
  }

  // 1. Customer Create Alerts
  const customerCreateAlerts = customerLogs.map(l => ({
    id: `cust-create-${l.id}`,
    action: 'CUSTOMER_CREATED',
    entityId: l.entityId,
    performedBy: userMap[l.performedBy] || l.performedBy || 'System',
    details: l.details,
    createdAt: l.createdAt
  }));

  // 2. Stock Low Alerts (raw materials and finished goods where reorderLevel > 0 and cachedQty < reorderLevel)
  const lowStockAlerts = items
    .filter(i => Number(i.reorderLevel || 0) > 0 && Number(i.cachedQty || 0) < Number(i.reorderLevel || 0))
    .map(i => ({
      id: `low-stock-${i.id}`,
      action: 'STOCK_LOW',
      entityId: i.id,
      performedBy: 'Inventory Monitor',
      details: `${i.name} stock is low: ${Number(i.cachedQty || 0).toLocaleString()} ${i.unit} (Reorder threshold: ${i.reorderLevel} ${i.unit})`,
      createdAt: i.updatedAt || new Date().toISOString()
    }));

  // 3. Customer Unpaid & Dues Pending Alerts (custom creditDuration per customer, default 7 days)
  const unpaidAlerts = [];
  allCustomers.forEach(c => {
    const durationDays = Number(c.creditDuration) > 0 ? Number(c.creditDuration) : 7;
    const durationThreshold = new Date();
    durationThreshold.setDate(durationThreshold.getDate() - durationDays);

    const oldUnpaid = c.orders.filter(
      o => (o.paymentStatus === 'UNPAID' || o.paymentStatus === 'PARTIAL') && new Date(o.createdAt) < durationThreshold
    );
    const unpaidSum = oldUnpaid.reduce(
      (sum, o) => sum + (o.items?.reduce((s, i) => s + (Number(i.quantity || 0) * Number(i.price || 0)), 0) || 0),
      0
    );
    const totalDue = Math.max(unpaidSum, Number(c.currentBalance || 0));

    if (totalDue > 0 && (oldUnpaid.length > 0 || Number(c.currentBalance || 0) > 0)) {
      const oldestDate = oldUnpaid.length > 0 ? oldUnpaid[oldUnpaid.length - 1].createdAt : null;
      const daysOverdue = oldestDate
        ? Math.floor((Date.now() - new Date(oldestDate).getTime()) / (1000 * 60 * 60 * 24))
        : durationDays;

      unpaidAlerts.push({
        id: `unpaid-${c.id}`,
        action: 'CUSTOMER_UNPAID',
        entityId: c.id,
        performedBy: 'Accounts Monitor',
        details: `Customer "${c.name}" has pending dues of Rs. ${totalDue.toLocaleString()} (${daysOverdue} days overdue, limit: ${durationDays} days)`,
        createdAt: oldestDate || new Date().toISOString()
      });
    }
  });

  // 4. Inactive / No Repeat Purchase in 7+ days
  const inactiveAlerts = allCustomers
    .filter(c => {
      const lastDate = c.lastDeliveryAt || c.orders[0]?.createdAt;
      if (!lastDate) return new Date(c.createdAt) < sevenDaysAgo;
      return new Date(lastDate) < sevenDaysAgo;
    })
    .slice(0, 20)
    .map(c => {
      const lastDate = c.lastDeliveryAt || c.orders[0]?.createdAt;
      const days = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)) : '7+';
      return {
        id: `inactive-${c.id}`,
        action: 'CUSTOMER_INACTIVE',
        entityId: c.id,
        performedBy: 'CRM Monitor',
        details: `Customer "${c.name}" has not repeated order in ${days} days`,
        createdAt: lastDate || c.createdAt
      };
    });

  // Combine and sort by createdAt descending
  const allNotificationAlerts = [
    ...customerCreateAlerts,
    ...lowStockAlerts,
    ...unpaidAlerts,
    ...inactiveAlerts
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.status(200).json(new ApiResponse(200, allNotificationAlerts, 'Notification alerts retrieved successfully'));
});

/**
 * On-demand sync endpoint for shrink wrap materials and recipes
 */
export const syncShrinkWrap = asyncHandler(async (_req, res) => {
  const { ensureShrinkWrapMaterials } = await import('../utils/autoMigrations.js');
  await ensureShrinkWrapMaterials();
  res.status(200).json(new ApiResponse(200, null, 'Shrink wrap materials synchronized successfully'));
});

