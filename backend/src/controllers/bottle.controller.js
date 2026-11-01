import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { sendSuccess } from '../utils/response.js';
import { broadcastEvent } from '../utils/sseBus.js';
import {
  resolveReturnableRawMaterial,
  creditEmptyBottlesToFactory,
  getAllReturnableRawMaterials
} from '../services/bottleInventory.service.js';

/** Computes bottle fleet reconciliation statistics across factory, warehouse, and customers */
async function computeBottleStats(client, prefix) {
  const [txnSums, customerSum, returnableItems] = await Promise.all([
    client[`${prefix}BottleTransaction`].groupBy({
      by: ['type'],
      _sum: { quantity: true }
    }),
    client[`${prefix}Customer`].aggregate({
      where: { archivedAt: null },
      _sum: { cachedBottleBalance: true }
    }),
    getAllReturnableRawMaterials(client, prefix)
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

  const rawMaterialFactoryStock = returnableItems.reduce(
    (sum, item) => sum + Math.round(Number(item.factoryQty !== undefined ? item.factoryQty : item.cachedQty || 0)),
    0
  );

  // If new purchase transactions weren't seeded initially, reconcile from real physical stock
  const atFactory = totalPurchased > 0
    ? Math.max(0, totalOwned - withCustomers - atWarehouse)
    : Math.max(0, rawMaterialFactoryStock);

  return {
    totalPurchased,
    totalOwned: totalPurchased > 0 ? totalOwned : (atFactory + atWarehouse + withCustomers),
    atFactory,
    atWarehouse,
    withCustomers,
    broken: brokenCount,
    lost: lostCount,
    returnableItems: returnableItems.map(i => ({
      id: i.id,
      name: i.name,
      cachedQty: Number(i.cachedQty || 0),
      factoryQty: Number(i.factoryQty || 0),
      warehouseQty: Number(i.warehouseQty || 0)
    })),
    equationReconciled: totalPurchased > 0 ? (atFactory + atWarehouse + withCustomers) === totalOwned : true
  };
}

/** Fleet reconciliation equation: Total Owned = At Factory + With Customers + At Warehouse */
export const getBottleSummary = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const data = await computeBottleStats(prisma, prefix);
  return sendSuccess(res, data);
});

/** Paginated bottle fleet transaction history */
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
        customer: { select: { id: true, name: true, phone: true } },
        item: { select: { id: true, name: true, unit: true, isReturnable: true } }
      }
    }),
    prisma[`${prefix}BottleTransaction`].count({ where })
  ]);

  return sendSuccess(res, transactions, 200, {
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  });
});

/** Records bottle movements, issuances, returns, or breakages with fleet balance adjustments */
export const createBottleTransaction = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { customerId, itemId, type, quantity, reason } = req.body;

  const qty = parseInt(quantity, 10);
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

    // Resolve returnable item dynamically (via passed itemId or primary catalog returnable raw material)
    const returnableItem = await resolveReturnableRawMaterial(tx, prefix, { rawMaterialId: itemId });

    const createdTxn = await tx[`${prefix}BottleTransaction`].create({
      data: {
        customerId: customerId || null,
        itemId: returnableItem?.id || null,
        type,
        quantity: qty,
        reason: reason || null
      },
      include: {
        item: { select: { id: true, name: true, unit: true, isReturnable: true } },
        customer: { select: { id: true, name: true, phone: true } }
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
    }

    // Single-Location Raw Material Law: Returned Good empties are credited back to plant floor stock
    if (type === 'RETURNED_GOOD') {
      await creditEmptyBottlesToFactory(tx, prefix, {
        quantity: qty,
        rawMaterialId: returnableItem?.id,
        customerId: customerId || null,
        reason: reason || 'BOTTLE_RETRIEVAL'
      });
    }

    return createdTxn;
  });

  if (customerId) {
    broadcastEvent(prefix, 'CUSTOMER_UPDATED', { customerId });
  }
  broadcastEvent(prefix, 'INVENTORY_CHANGED');
  broadcastEvent(prefix, 'BOTTLE_UPDATED', { customerId, type, quantity: qty });

  return sendSuccess(res, txn, 201);
});
