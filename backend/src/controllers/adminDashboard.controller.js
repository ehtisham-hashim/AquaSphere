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

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [
    todaysOrders,
    pendingOrders,
    pendingOrdersCount,
    todaysDeliveries,
    todaysProductionBatches,
    rawMaterials,
    finishedGoods,
    cashCollected,
    todaysDailyClose,
    spotSalesCash
  ] = await Promise.all([
    // Today's orders count + list
    prisma[`${prefix}Order`].findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      include: { customer: { select: { name: true, phone: true } }, items: { include: { item: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' }
    }),
    // Pending orders (table display capped at 50)
    prisma[`${prefix}Order`].findMany({
      where: { deliveryStatus: { in: ['PENDING', 'PARTIAL'] } },
      include: { customer: { select: { name: true, phone: true } }, items: { include: { item: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    // Uncapped pending orders count for KPI
    prisma[`${prefix}Order`].count({
      where: { deliveryStatus: { in: ['PENDING', 'PARTIAL'] } }
    }),
    // Today's completed deliveries count
    prisma[`${prefix}Delivery`].findMany({
      where: { deliveredAt: { gte: startOfDay, lte: endOfDay } }
    }),
    // Today's production batches
    prisma[`${prefix}ProductionBatch`].findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      include: { outputItem: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    // All raw materials (inventory view)
    prisma[`${prefix}Item`].findMany({
      where: { type: 'RAW_MATERIAL', archivedAt: null },
      orderBy: { name: 'asc' }
    }),
    // All finished goods (inventory view)
    prisma[`${prefix}Item`].findMany({
      where: { type: 'FINISHED_GOOD', archivedAt: null },
      orderBy: { name: 'asc' }
    }),
    // Cash collected today (from payments only — NO profit calculation)
    prisma[`${prefix}Payment`].aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: startOfDay, lte: endOfDay } }
    }),
    // Today's daily close status
    prisma[`${prefix}DailyClose`].findFirst({
      where: { date: { gte: startOfDay, lte: endOfDay } }
    }),
    // Spot sales cash
    prisma[`${prefix}SpotSale`].aggregate({
      _sum: { cashCollected: true },
      where: { createdAt: { gte: startOfDay, lte: endOfDay } }
    })
  ]);

  // Compute low-stock alerts
  const lowStockItems = rawMaterials.filter(
    item => parseFloat(item.cachedQty) < parseFloat(item.reorderLevel)
  );

  // Production summary
  let totalGoodYield = 0;
  let totalWaste = 0;
  let packs05LToday = 0;
  let packs15LToday = 0;
  
  todaysProductionBatches.forEach(b => {
    totalGoodYield += b.quantity || 0;
    totalWaste += b.wasteQuantity || 0;
    packs05LToday += b.packs05L || 0;
    packs15LToday += b.packs15L || 0;
  });

  // Format orders for table (NO financial amounts — just operational status)
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
  const productionTable = todaysProductionBatches.map(b => ({
    id: b.id,
    outputItem: b.outputItem?.name || (b.quantity ? '19L Refill Bottle' : 'PET Production Run'),
    quantity: b.quantity || 0,
    wasteQuantity: b.wasteQuantity || 0,
    packs05L: b.packs05L || 0,
    packs15L: b.packs15L || 0,
    broken05L: b.brokenBottles05L || 0,
    broken15L: b.brokenBottles15L || 0,
    status: b.status,
    notes: b.notes || '—',
    createdAt: b.createdAt
  }));

  const orderPayments = Number(cashCollected._sum.amount || 0);
  const spotCash = Number(spotSalesCash._sum.cashCollected || 0);

  res.status(200).json(new ApiResponse(200, {
    kpis: {
      todaysOrdersCount: todaysOrders.length,
      pendingOrdersCount: pendingOrdersCount,
      todaysDeliveriesCount: todaysDeliveries.length,
      totalProductionYield: totalGoodYield,
      packs05LProduced: packs05LToday,
      packs15LProduced: packs15LToday,
      productionWaste: totalWaste,
      // Operational cash collected ONLY (no profit, no expenses)
      totalCashCollected: orderPayments + spotCash,
      cashFromOrders: orderPayments,
      cashFromSpotSales: spotCash,
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
  const { date } = req.query;

  const targetDate = date ? new Date(date) : new Date();
  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

  const [payments, spotSales] = await Promise.all([
    prisma[`${prefix}Payment`].findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma[`${prefix}SpotSale`].findMany({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalSpotSales = spotSales.reduce((sum, s) => sum + Number(s.cashCollected), 0);

  // Group payments by method
  const byMethod = {};
  payments.forEach(p => {
    const method = p.type || 'CASH';
    if (!byMethod[method]) byMethod[method] = 0;
    byMethod[method] += Number(p.amount);
  });

  res.status(200).json(new ApiResponse(200, {
    totalCashCollected: totalPayments + totalSpotSales,
    fromOrders: totalPayments,
    fromSpotSales: totalSpotSales,
    paymentsByMethod: byMethod,
    paymentsCount: payments.length,
    spotSalesCount: spotSales.length,
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
      creditLimit: true,
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

  // Credit breaches — use stored currentBalance directly, not recalculated from recent orders
  const creditBreaches = allCustomers.filter(c => {
    const limit = Number(c.creditLimit || 0);
    if (limit <= 0) return false;
    return Number(c.currentBalance || 0) >= limit;
  }).map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    type: c.type,
    currentBalance: Number(c.currentBalance || 0),
    creditLimit: Number(c.creditLimit || 0),
    alertType: 'CREDIT_LIMIT_EXCEEDED',
    recommendation: 'Generate invoice and request immediate payment settlement.'
  }));

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
