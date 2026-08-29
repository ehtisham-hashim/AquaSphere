import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTenantPrefix } from '../utils/tenant.js';

/**
 * Retrieves operational Marketing Manager alerts (credit breaches, duration expirations, bottle warnings, deliveries).
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
export const getMMAlerts = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const BOTTLE_COST = 1500;

  // Execute all queries in parallel for maximum performance
  const [
    creditLimitBreaches,
    creditDurationExpired,
    customerReminders,
    pendingDeliveriesCount,
    pendingPayments,
    outstandingBottles,
    securityDepositWarnings,
    todaysDeliveriesAgg
  ] = await Promise.all([
    // 1. Credit Limit Breaches
    prisma[`${prefix}Customer`].findMany({
      where: { archivedAt: null, currentBalance: { gt: 0 }, creditLimit: { gt: 0 } },
      select: { id: true, name: true, phone: true, currentBalance: true, creditLimit: true }
    }),
    // 2. Credit Duration Expired
    prisma[`${prefix}Customer`].findMany({
      where: { archivedAt: null, currentBalance: { gt: 0 }, lastDeliveryAt: { not: null }, creditDuration: { gt: 0 } },
      select: { id: true, name: true, phone: true, currentBalance: true, creditDuration: true, lastDeliveryAt: true }
    }),
    // 3. Customer Reminders
    prisma[`${prefix}Customer`].findMany({
      where: { archivedAt: null, remarks: { not: '' } },
      select: { id: true, name: true, phone: true, remarks: true }
    }),
    // 4. Pending Deliveries
    prisma[`${prefix}Order`].count({
      where: { deliveryStatus: 'PENDING' }
    }),
    // 5. Pending Payments
    prisma[`${prefix}Order`].findMany({
      where: { deliveryStatus: 'DELIVERED', paymentStatus: 'UNPAID' },
      take: 25,
      select: { id: true, customer: { select: { name: true, phone: true } } }
    }),
    // 6. Outstanding 19L Bottle Balance
    prisma[`${prefix}Customer`].findMany({
      where: { archivedAt: null, cachedBottleBalance: { gt: 0 } },
      select: { id: true, name: true, phone: true, cachedBottleBalance: true }
    }),
    // 7. Security Deposit Warning
    prisma[`${prefix}Customer`].findMany({
      where: { archivedAt: null, cachedBottleBalance: { gt: 0 } },
      select: { id: true, name: true, phone: true, cachedBottleBalance: true, deposit: true }
    }),
    // 8. Today's Delivery Summary
    prisma[`${prefix}Order`].groupBy({
      by: ['deliveryStatus'],
      _count: { id: true },
      where: { createdAt: { gte: startOfDay, lte: endOfDay } }
    })
  ]);

  const validCreditBreaches = creditLimitBreaches.filter(
    c => Number(c.currentBalance) > Number(c.creditLimit)
  );

  const validDurationBreaches = creditDurationExpired.filter(c => {
    const daysSinceLastDelivery = (now - new Date(c.lastDeliveryAt)) / (1000 * 60 * 60 * 24);
    return daysSinceLastDelivery > c.creditDuration;
  }).map(c => ({
    ...c,
    daysOverdue: Math.floor((now - new Date(c.lastDeliveryAt)) / (1000 * 60 * 60 * 24)) - c.creditDuration
  }));

  const validDepositWarnings = securityDepositWarnings.filter(c => {
    const coveredBottles = Math.floor((c.deposit || 0) / BOTTLE_COST);
    return c.cachedBottleBalance > coveredBottles;
  }).map(c => ({
    ...c,
    coveredBottles: Math.floor((c.deposit || 0) / BOTTLE_COST)
  }));

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
