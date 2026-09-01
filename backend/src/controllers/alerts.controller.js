import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { sendSuccess } from '../utils/response.js';

/** Retrieves operational Marketing Manager alerts (credit breaches, duration expirations, bottle warnings, deliveries) */
export const getMMAlerts = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const BOTTLE_COST = 1500;

  // Execute consolidated queries in parallel
  const [
    candidateCustomers,
    pendingDeliveriesCount,
    pendingPayments,
    todaysDeliveriesAgg
  ] = await Promise.all([
    prisma[`${prefix}Customer`].findMany({
      where: {
        archivedAt: null,
        OR: [
          { currentBalance: { gt: 0 } },
          { cachedBottleBalance: { gt: 0 } },
          { remarks: { not: '' } }
        ]
      },
      select: {
        id: true,
        name: true,
        phone: true,
        currentBalance: true,
        creditLimit: true,
        creditDuration: true,
        lastDeliveryAt: true,
        remarks: true,
        cachedBottleBalance: true,
        deposit: true
      }
    }),
    prisma[`${prefix}Order`].count({
      where: { deliveryStatus: 'PENDING' }
    }),
    prisma[`${prefix}Order`].findMany({
      where: { deliveryStatus: 'DELIVERED', paymentStatus: 'UNPAID' },
      take: 25,
      select: { id: true, customer: { select: { name: true, phone: true } } }
    }),
    prisma[`${prefix}Order`].groupBy({
      by: ['deliveryStatus'],
      _count: { id: true },
      where: { createdAt: { gte: startOfDay, lte: endOfDay } }
    })
  ]);

  const creditLimitBreaches = [];
  const creditDurationExpired = [];
  const customerReminders = [];
  const outstandingBottles = [];
  const securityDepositWarnings = [];

  for (const c of candidateCustomers) {
    const bal = Number(c.currentBalance || 0);
    const limit = Number(c.creditLimit || 0);
    const bottles = Number(c.cachedBottleBalance || 0);

    if (bal > 0 && limit > 0 && bal > limit) {
      creditLimitBreaches.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        currentBalance: c.currentBalance,
        creditLimit: c.creditLimit
      });
    }

    if (bal > 0 && c.lastDeliveryAt && Number(c.creditDuration || 0) > 0) {
      const daysSince = (now - new Date(c.lastDeliveryAt)) / (1000 * 60 * 60 * 24);
      if (daysSince > c.creditDuration) {
        creditDurationExpired.push({
          id: c.id,
          name: c.name,
          phone: c.phone,
          currentBalance: c.currentBalance,
          creditDuration: c.creditDuration,
          lastDeliveryAt: c.lastDeliveryAt,
          daysOverdue: Math.floor(daysSince) - c.creditDuration
        });
      }
    }

    if (c.remarks && c.remarks.trim() !== '') {
      customerReminders.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        remarks: c.remarks
      });
    }

    if (bottles > 0) {
      outstandingBottles.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        cachedBottleBalance: c.cachedBottleBalance
      });

      const coveredBottles = Math.floor((c.deposit || 0) / BOTTLE_COST);
      if (bottles > coveredBottles) {
        securityDepositWarnings.push({
          id: c.id,
          name: c.name,
          phone: c.phone,
          cachedBottleBalance: c.cachedBottleBalance,
          deposit: c.deposit,
          coveredBottles
        });
      }
    }
  }

  const todaysDeliverySummary = {
    PENDING: 0,
    DELIVERED: 0,
    CANCELLED: 0
  };
  todaysDeliveriesAgg.forEach(agg => {
    todaysDeliverySummary[agg.deliveryStatus] = agg._count.id;
  });

  return sendSuccess(res, {
    creditLimitBreaches,
    creditDurationExpired,
    customerReminders,
    pendingDeliveriesCount,
    pendingPayments,
    outstandingBottles,
    securityDepositWarnings,
    todaysDeliverySummary
  });
});
