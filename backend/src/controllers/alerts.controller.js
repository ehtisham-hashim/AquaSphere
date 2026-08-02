import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const getTenantPrefix = (req) => {
  const cookieVal = req.cookies?.tenant || req.cookies?.company;
  const headerVal = req.headers['x-tenant'];
  const tenant = (cookieVal || headerVal || 'aquasphere').toLowerCase();
  return tenant === 'wadaana' ? 'wadaana' : 'aquasphere';
};

export const getMMAlerts = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // 1. Credit Limit Breaches
  const creditLimitBreaches = await prisma[`${prefix}Customer`].findMany({
    where: {
      archivedAt: null,
      currentBalance: { gt: 0 },
      creditLimit: { gt: 0 }
    },
    select: { id: true, name: true, phone: true, currentBalance: true, creditLimit: true }
  });

  const validCreditBreaches = creditLimitBreaches.filter(
    c => Number(c.currentBalance) > Number(c.creditLimit)
  );

  // 2. Credit Duration Expired
  const creditDurationExpired = await prisma[`${prefix}Customer`].findMany({
    where: {
      archivedAt: null,
      currentBalance: { gt: 0 },
      lastDeliveryAt: { not: null },
      creditDuration: { gt: 0 }
    },
    select: { id: true, name: true, phone: true, currentBalance: true, creditDuration: true, lastDeliveryAt: true }
  });

  const validDurationBreaches = creditDurationExpired.filter(c => {
    const daysSinceLastDelivery = (now - new Date(c.lastDeliveryAt)) / (1000 * 60 * 60 * 24);
    return daysSinceLastDelivery > c.creditDuration;
  }).map(c => ({
    ...c,
    daysOverdue: Math.floor((now - new Date(c.lastDeliveryAt)) / (1000 * 60 * 60 * 24)) - c.creditDuration
  }));

  // 3. Customer Reminders (where remarks is not null)
  const customerReminders = await prisma[`${prefix}Customer`].findMany({
    where: {
      archivedAt: null,
      remarks: { not: null, not: '' }
    },
    select: { id: true, name: true, phone: true, remarks: true }
  });

  // 4. Pending Deliveries
  const pendingDeliveriesCount = await prisma[`${prefix}Order`].count({
    where: { deliveryStatus: 'PENDING', createdAt: { gte: startOfDay, lte: endOfDay } }
  });

  // 5. Pending Payments
  const pendingPayments = await prisma[`${prefix}Order`].findMany({
    where: {
      deliveryStatus: 'DELIVERED',
      paymentStatus: 'UNPAID',
      createdAt: { gte: startOfDay, lte: endOfDay }
    },
    include: { customer: { select: { name: true, phone: true } } }
  });

  // 6. Outstanding 19L Bottle Balance (Customer has empty bottles they haven't returned)
  const outstandingBottles = await prisma[`${prefix}Customer`].findMany({
    where: {
      archivedAt: null,
      cachedBottleBalance: { gt: 0 }
    },
    select: { id: true, name: true, phone: true, cachedBottleBalance: true }
  });

  // 7. Security Deposit Warning
  // Assuming a standard bottle cost is Rs. 1500 for the deposit check
  // Deposit covers N bottles = deposit / 1500
  // If cachedBottleBalance > deposit / 1500 -> Warning
  const BOTTLE_COST = 1500;
  const securityDepositWarnings = await prisma[`${prefix}Customer`].findMany({
    where: {
      archivedAt: null,
      cachedBottleBalance: { gt: 0 }
    },
    select: { id: true, name: true, phone: true, cachedBottleBalance: true, deposit: true }
  });

  const validDepositWarnings = securityDepositWarnings.filter(c => {
    const coveredBottles = Math.floor((c.deposit || 0) / BOTTLE_COST);
    return c.cachedBottleBalance > coveredBottles;
  }).map(c => ({
    ...c,
    coveredBottles: Math.floor((c.deposit || 0) / BOTTLE_COST)
  }));

  // 8. Today's Delivery Summary
  const todaysDeliveriesAgg = await prisma[`${prefix}Order`].groupBy({
    by: ['deliveryStatus'],
    _count: { id: true },
    where: { createdAt: { gte: startOfDay, lte: endOfDay } }
  });

  const todaysDeliverySummary = {
    PENDING: 0,
    DELIVERED: 0,
    CANCELLED: 0
  };
  todaysDeliveriesAgg.forEach(agg => {
    todaysDeliverySummary[agg.deliveryStatus] = agg._count.id;
  });

  res.json({
    success: true,
    data: {
      creditLimitBreaches: validCreditBreaches,
      creditDurationExpired: validDurationBreaches,
      customerReminders,
      pendingDeliveriesCount,
      pendingPayments,
      outstandingBottles,
      securityDepositWarnings: validDepositWarnings,
      todaysDeliverySummary
    }
  });
});
