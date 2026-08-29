import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { getTenantPrefix } from '../utils/tenant.js';

async function computeBottleStats(client, prefix) {
  const [txnSums, customerSum] = await Promise.all([
    client[`${prefix}BottleTransaction`].groupBy({
      by: ['type'],
      _sum: { quantity: true }
    }),
    client[`${prefix}Customer`].aggregate({
      where: { archivedAt: null },
      _sum: { cachedBottleBalance: true }
    })
  ]);

  const map = {};
  for (const s of txnSums) map[s.type] = s._sum.quantity || 0;

  const totalPurchased = map.NEW_PURCHASE || 0;
  const factoryAdjustments = map.AT_FACTORY_ADJUSTMENT || 0;
  const warehouseAdjustments = map.AT_WAREHOUSE_ADJUSTMENT || 0;
  const brokenCount = map.RETURNED_BROKEN || 0;
  const lostCount = map.MARKED_LOST || 0;
  const movedToWarehouse = map.MOVED_TO_WAREHOUSE || 0;
  const movedToFactory = map.MOVED_TO_FACTORY || 0;

  const withCustomers = Math.max(0, customerSum._sum.cachedBottleBalance || 0);
  const totalOwned = Math.max(0, totalPurchased + factoryAdjustments - lostCount - brokenCount);
  const atWarehouse = Math.max(0, movedToWarehouse - movedToFactory + warehouseAdjustments);
  const atFactory = Math.max(0, totalOwned - withCustomers - atWarehouse);

  return {
    totalPurchased,
    totalOwned,
    atFactory,
    atWarehouse,
    withCustomers,
    broken: brokenCount,
    lost: lostCount,
    equationReconciled: (atFactory + atWarehouse + withCustomers + brokenCount) === totalOwned
  };
}

// GET /api/v1/bottles/summary
// Fleet reconciliation equation: Total Owned = At Factory + With Customers + Broken + Lost
export const getBottleSummary = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const data = await computeBottleStats(prisma, prefix);
  res.status(200).json({ success: true, data });
});

// GET /api/v1/bottles/transactions
export const getBottleTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, customerId } = req.query;
  const skip = (page - 1) * limit;
  const prefix = getTenantPrefix(req);

  const where = {};
  if (customerId) where.customerId = customerId;

  const [transactions, total] = await Promise.all([
    prisma[`${prefix}BottleTransaction`].findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } }
      }
    }),
    prisma[`${prefix}BottleTransaction`].count({ where })
  ]);

  res.status(200).json({
    success: true,
    data: transactions,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  });
});

// POST /api/v1/bottles/transactions
export const createBottleTransaction = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { customerId, type, quantity, reason } = req.body;

  const qty = parseInt(quantity);
  if (!type || isNaN(qty) || qty <= 0) {
    throw new ApiError(400, 'Valid transaction type and positive quantity are required');
  }

  const validTypes = [
    'NEW_PURCHASE',
    'DELIVERED_TO_CUSTOMER',
    'RETURNED_GOOD',
    'RETURNED_BROKEN',
    'MARKED_LOST',
    'AT_FACTORY_ADJUSTMENT',
    'AT_WAREHOUSE_ADJUSTMENT',
    'MOVED_TO_WAREHOUSE',
    'MOVED_TO_FACTORY'
  ];

  if (!validTypes.includes(type)) {
    throw new ApiError(400, `Invalid transaction type. Must be one of: ${validTypes.join(', ')}`);
  }

  const txn = await prisma.$transaction(async (tx) => {
    if (type === 'MOVED_TO_WAREHOUSE' || type === 'MOVED_TO_FACTORY') {
      const stats = await computeBottleStats(tx, prefix);

      if (type === 'MOVED_TO_WAREHOUSE' && qty > stats.atFactory) {
        throw new ApiError(400, `Cannot move ${qty} bottles to warehouse. Only ${stats.atFactory} bottles available at factory.`);
      }

      if (type === 'MOVED_TO_FACTORY' && qty > stats.atWarehouse) {
        throw new ApiError(400, `Cannot move ${qty} bottles to factory. Only ${stats.atWarehouse} bottles available at warehouse.`);
      }
    }

    if (customerId) {
      const customer = await tx[`${prefix}Customer`].findUnique({ where: { id: customerId } });
      if (!customer) throw new ApiError(404, 'Customer not found');
    }

    const createdTxn = await tx[`${prefix}BottleTransaction`].create({
      data: {
        customerId: customerId || null,
        type,
        quantity: qty,
        reason: reason || null
      }
    });

    if (customerId) {
      let balanceChange = 0;
      if (type === 'DELIVERED_TO_CUSTOMER') balanceChange = qty;
      if (type === 'RETURNED_GOOD' || type === 'RETURNED_BROKEN' || type === 'MARKED_LOST') balanceChange = -qty;

      if (balanceChange !== 0) {
        await tx[`${prefix}Customer`].update({
          where: { id: customerId },
          data: { cachedBottleBalance: { increment: balanceChange } }
        });
      }

      if (type === 'RETURNED_GOOD') {
        const emptyBottleItem = await tx[`${prefix}Item`].findFirst({
          where: { type: 'RAW_MATERIAL', name: { contains: 'empty', mode: 'insensitive' } }
        });
        if (emptyBottleItem) {
          await tx[`${prefix}Item`].update({
            where: { id: emptyBottleItem.id },
            data: { 
              cachedQty: { increment: qty },
              factoryQty: { increment: qty }
            }
          });
          await tx[`${prefix}InventoryTransaction`].create({
            data: {
              itemId: emptyBottleItem.id,
              quantity: qty,
              direction: 'IN',
              reason: 'BOTTLE_RETRIEVAL',
              refType: 'CUSTOMER',
              refId: customerId,
              location: 'FACTORY'
            }
          });
        }
      }
    }

    return createdTxn;
  });

  res.status(201).json({ success: true, data: txn });
});
