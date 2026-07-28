import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

const getPrefix = (req) => (req.tenant || req.headers['x-company-context'] || req.headers['x-tenant'] || 'aquasphere').toString().toLowerCase() === 'wadaana' ? 'wadaana' : 'aquasphere';

/**
 * Feature 2: Admin View-Only Dashboard
 * Shows: Inventory, Production, Orders, Cash — NO profit, NO cost metrics
 * All data is read-only; Admin cannot mutate anything from this endpoint.
 */
export const getAdminDashboard = asyncHandler(async (req, res) => {
  const prefix = getPrefix(req);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [
    todaysOrders,
    pendingOrders,
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
    // Pending orders
    prisma[`${prefix}Order`].findMany({
      where: { deliveryStatus: { in: ['PENDING', 'PARTIAL'] } },
      include: { customer: { select: { name: true, phone: true } }, items: { include: { item: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' }
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
      where: { date: { gte: startOfDay, lte: endOfDay } },
      include: { closedBy: { select: { name: true } } }
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
  todaysProductionBatches.forEach(b => {
    totalGoodYield += b.quantity || 0;
    totalWaste += b.wasteQuantity || 0;
  });

  // Format orders for table (NO financial amounts — just operational status)
  const ordersTable = todaysOrders.map(o => ({
    id: o.id,
    shortId: `#${o.id.substring(0, 6).toUpperCase()}`,
    customer: o.customer?.name || 'Walk-in',
    phone: o.customer?.phone || '-',
    type: o.type === 'NINETEEN_L' ? '19L Bottle' : 'PET Bottle',
    itemName: o.items[0]?.item?.name || 'N/A',
    quantity: o.items[0]?.quantity || 0,
    deliveryStatus: o.deliveryStatus,
    paymentStatus: o.paymentStatus,
    createdAt: o.createdAt
  }));

  const pendingOrdersTable = pendingOrders.map(o => ({
    id: o.id,
    shortId: `#${o.id.substring(0, 6).toUpperCase()}`,
    customer: o.customer?.name || 'Walk-in',
    phone: o.customer?.phone || '-',
    type: o.type === 'NINETEEN_L' ? '19L Bottle' : 'PET Bottle',
    itemName: o.items[0]?.item?.name || 'N/A',
    quantity: o.items[0]?.quantity || 0,
    deliveryStatus: o.deliveryStatus,
    createdAt: o.createdAt
  }));

  const productionTable = todaysProductionBatches.map(b => ({
    id: b.id,
    shortId: `#${b.id.substring(0, 6).toUpperCase()}`,
    outputItem: b.outputItem?.name || 'Unknown',
    goodYield: b.quantity || 0,
    waste: b.wasteQuantity || 0,
    batchDate: b.batchDate || b.createdAt
  }));

  // IMPORTANT: No profit, no cost, no margin — only operational + cash collection
  res.status(200).json(new ApiResponse(200, {
    kpis: {
      todaysOrdersCount: todaysOrders.length,
      pendingOrdersCount: pendingOrders.length,
      deliveriesCompleted: todaysDeliveries.length,
      productionBatches: todaysProductionBatches.length,
      totalGoodYield,
      totalWaste,
      cashCollected: parseFloat(cashCollected._sum.amount || 0) + parseFloat(spotSalesCash._sum.cashCollected || 0),
      lowStockAlerts: lowStockItems.length,
      isDayClosed: !!todaysDailyClose,
      dayClosedBy: todaysDailyClose?.closedBy?.name || null
    },
    inventory: {
      rawMaterials: rawMaterials.map(m => ({
        id: m.id,
        name: m.name,
        unit: m.unit,
        cachedQty: parseFloat(m.cachedQty),
        reorderLevel: parseFloat(m.reorderLevel),
        isLow: parseFloat(m.cachedQty) < parseFloat(m.reorderLevel)
      })),
      finishedGoods: finishedGoods.map(fg => ({
        id: fg.id,
        name: fg.name,
        unit: fg.unit,
        cachedQty: parseFloat(fg.cachedQty)
      }))
    },
    lowStockItems: lowStockItems.map(m => ({
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
 * Shows cash collected only — deliberately omits COGS, expenses, and profit margin.
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
    const method = p.paymentMethod || 'CASH';
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
 * Shows: credit breaches + inactivity (>7 days no order)
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
      cachedBalance: true,
      creditLimit: true,
      cachedBottleBalance: true,
      createdAt: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true, deliveryStatus: true, paymentStatus: true }
      }
    }
  });

  // Credit breaches: balance > creditLimit (where creditLimit > 0; 0 = unlimited)
  const creditBreaches = allCustomers.filter(c => {
    const balance = Number(c.cachedBalance);
    const limit = Number(c.creditLimit);
    return limit > 0 && balance > limit;
  }).map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    type: c.type,
    balance: Number(c.cachedBalance),
    creditLimit: Number(c.creditLimit),
    overageAmount: Number(c.cachedBalance) - Number(c.creditLimit),
    alertType: 'CREDIT_BREACH'
  }));

  // Unpaid bill > 7 days (B2B spec): balance > 0 and last order > 7 days ago
  const unpaidBillOver7Days = allCustomers.filter(c => {
    const balance = Number(c.cachedBalance);
    const lastOrderDate = c.orders[0]?.createdAt;
    return balance > 0 && lastOrderDate && new Date(lastOrderDate) < sevenDaysAgo;
  }).map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    balance: Number(c.cachedBalance),
    lastOrderDate: c.orders[0].createdAt,
    alertType: 'UNPAID_BILL_7d'
  }));

  // Inactivity / No repeat order > 30 days
  const inactiveCustomers = allCustomers.filter(c => {
    const lastOrderDate = c.orders[0]?.createdAt;
    if (!lastOrderDate) return new Date(c.createdAt) < thirtyDaysAgo;
    return new Date(lastOrderDate) < thirtyDaysAgo;
  }).map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    type: c.type,
    lastOrderDate: c.orders[0]?.createdAt || null,
    daysSinceLastOrder: c.orders[0]?.createdAt
      ? Math.floor((Date.now() - new Date(c.orders[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 'Never ordered',
    alertType: 'INACTIVE_30d'
  }));

  res.status(200).json(new ApiResponse(200, {
    creditBreaches,
    unpaidBillOver7Days,
    inactiveCustomers,
    totalAlerts: creditBreaches.length + unpaidBillOver7Days.length + inactiveCustomers.length
  }, 'Customer alerts fetched'));
});
