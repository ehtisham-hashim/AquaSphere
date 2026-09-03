import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateProductionBatch, calculateDynamicBatch } from '../utils/productionFormulas.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { createAuditLog } from '../utils/auditLog.js';
import { sendSuccess } from '../utils/response.js';

const WADAANA_PREFORMS = [
  { key: 'qtyPure05L', brokenKey: 'brokenPure05L', weight: 0.015, primary: 'pure', volume: ['0.5l', '0.5', '500ml', '500'] },
  { key: 'qtyPure15L', brokenKey: 'brokenPure15L', weight: 0.030, primary: 'pure', volume: ['1.5l', '1.5', '1500ml', '1500'] },
  { key: 'qtyMix05L', brokenKey: 'brokenMix05L', weight: 0.013, primary: 'mix', volume: ['0.5l', '0.5', '500ml', '500'] },
  { key: 'qtyMix15L', brokenKey: 'brokenMix15L', weight: 0.027, primary: 'mix', volume: ['1.5l', '1.5', '1500ml', '1500'] }
];

const matchWadaanaItem = (itemsList, type, primaryKW, volumeKW) => {
  return itemsList.find(i => (!type || i.type === type) && i.name.toLowerCase().includes(primaryKW) && volumeKW.some(v => i.name.toLowerCase().includes(v)))
    || itemsList.find(i => type && i.type === type && volumeKW.some(v => i.name.toLowerCase().includes(v)));
};

/** Retrieves paginated production batch runs */
export const getProductionBatches = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;
  const prefix = getTenantPrefix(req);

  const [batches, total] = await Promise.all([
    prisma[`${prefix}ProductionBatch`].findMany({
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        outputItem: { select: { id: true, name: true, unit: true } },
        inputItem: { select: { id: true, name: true, unit: true } },
        consumptions: { include: { item: true } }
      }
    }),
    prisma[`${prefix}ProductionBatch`].count()
  ]);

  const userIds = [...new Set(batches.map(b => b.producedBy).filter(Boolean))];
  const users = userIds.length > 0 ? await prisma[`${prefix}User`].findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, role: true }
  }) : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  const enrichedBatches = batches.map(b => ({
    ...b,
    createdBy: userMap[b.producedBy] || { name: b.producedBy || 'System', role: 'OPERATOR' }
  }));

  return sendSuccess(res, enrichedBatches, 200, {
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
  });
});

/** Retrieves single production batch by ID */
export const getProductionBatchById = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const batch = await prisma[`${prefix}ProductionBatch`].findUnique({
    where: { id: req.params.id },
    include: { outputItem: true, inputItem: true, consumptions: { include: { item: true } } }
  });
  if (!batch) throw new ApiError(404, 'Production batch not found');
  return sendSuccess(res, batch);
});

/** Retrieves aggregated production statistics */
export const getProductionStats = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [todaysBatches, monthBatches] = await Promise.all([
    prisma[`${prefix}ProductionBatch`].aggregate({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      _count: { id: true },
      _sum: { packs05L: true, packs15L: true, quantity: true, wasteQuantity: true }
    }),
    prisma[`${prefix}ProductionBatch`].aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _sum: { packs05L: true, packs15L: true, quantity: true, wasteQuantity: true }
    })
  ]);

  return sendSuccess(res, {
    today: {
      batches: todaysBatches._count.id || 0,
      packs05L: todaysBatches._sum.packs05L || 0,
      packs15L: todaysBatches._sum.packs15L || 0,
      quantity: todaysBatches._sum.quantity || 0,
      wasteQuantity: todaysBatches._sum.wasteQuantity || 0
    },
    month: {
      packs05L: monthBatches._sum.packs05L || 0,
      packs15L: monthBatches._sum.packs15L || 0,
      quantity: monthBatches._sum.quantity || 0,
      wasteQuantity: monthBatches._sum.wasteQuantity || 0
    }
  });
});

/** Creates a new pending production batch */
export const createProductionBatch = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const isWadaana = prefix === 'wadaana';

  // 1. Generic Dynamic Product Batch
  const { outputItemId, quantity = 0, batchDate, notes } = req.body;
  if (outputItemId) {
    const qty = parseInt(quantity, 10) || 0;
    if (qty <= 0) throw new ApiError(400, 'Quantity must be greater than 0');
    const targetItem = await prisma[`${prefix}Item`].findUnique({
      where: { id: outputItemId },
      include: { recipeFinishedGoods: true }
    });
    if (!targetItem || targetItem.type !== 'FINISHED_GOOD') {
      throw new ApiError(400, 'Invalid finished good item selected');
    }

    const batch = await prisma[`${prefix}ProductionBatch`].create({
      data: {
        outputItemId,
        quantity: qty,
        batchDate: batchDate ? new Date(batchDate) : new Date(),
        notes: notes || null,
        producedBy: req.user?.id || 'Unknown',
        status: 'PENDING'
      },
      include: {
        outputItem: { select: { id: true, name: true, unit: true } },
        consumptions: { include: { item: true } }
      }
    });
    return sendSuccess(res, batch, 201);
  }

  if (isWadaana) {
    const { qtyPure05L = 0, qtyPure15L = 0, qtyMix05L = 0, qtyMix15L = 0 } = req.body;
    const p05 = parseInt(qtyPure05L, 10) || 0;
    const p15 = parseInt(qtyPure15L, 10) || 0;
    const m05 = parseInt(qtyMix05L, 10) || 0;
    const m15 = parseInt(qtyMix15L, 10) || 0;

    if (p05 < 0 || p15 < 0 || m05 < 0 || m15 < 0) throw new ApiError(400, 'Quantities cannot be negative');
    if (p05 === 0 && p15 === 0 && m05 === 0 && m15 === 0) throw new ApiError(400, 'Must produce at least one bottle type');

    const batch = await prisma.wadaanaProductionBatch.create({
      data: {
        qtyPure05L: p05,
        qtyPure15L: p15,
        qtyMix05L: m05,
        qtyMix15L: m15,
        batchDate: batchDate ? new Date(batchDate) : new Date(),
        notes: notes || null,
        producedBy: req.user?.id || 'Unknown',
        status: 'PENDING'
      }
    });
    return sendSuccess(res, batch, 201);
  }

  const { packs05L = 0, packs15L = 0 } = req.body;
  const p05 = parseInt(packs05L, 10) || 0;
  const p15 = parseInt(packs15L, 10) || 0;
  const qty = parseInt(quantity, 10) || 0;

  if (p05 < 0 || p15 < 0 || qty < 0) throw new ApiError(400, 'Quantities cannot be negative');
  if (p05 === 0 && p15 === 0 && qty === 0) throw new ApiError(400, 'Must produce at least one pack or 19L bottle');

  const batch = await prisma.aquasphereProductionBatch.create({
    data: {
      quantity: qty,
      packs05L: p05,
      packs15L: p15,
      batchDate: batchDate ? new Date(batchDate) : new Date(),
      notes: notes || null,
      producedBy: req.user?.id || 'Unknown',
      status: 'PENDING'
    }
  });
  return sendSuccess(res, batch, 201);
});

/** Completes a production batch run and updates inventory */
export const completeProductionBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);
  const isWadaana = prefix === 'wadaana';

  const batch = await prisma[`${prefix}ProductionBatch`].findUnique({ where: { id } });
  if (!batch) throw new ApiError(404, 'Batch not found');
  if (batch.status === 'COMPLETED') throw new ApiError(400, 'Batch is already completed');

  const allItems = await prisma[`${prefix}Item`].findMany({ where: { archivedAt: null } });

  // Dynamic Finished Good batch completion (AquaSphere or Wadaana)
  if (batch.outputItemId) {
    const { wasteQuantity = 0, brokenBottles = 0 } = req.body;
    const waste = parseInt(wasteQuantity || brokenBottles || 0, 10);
    const qty = batch.quantity || 0;
    if (waste < 0) throw new ApiError(400, 'Waste quantity cannot be negative');
    if (waste > qty) throw new ApiError(400, `Waste quantity (${waste}) cannot exceed produced amount (${qty})`);

    const outputItem = await prisma[`${prefix}Item`].findUnique({
      where: { id: batch.outputItemId },
      include: { recipeFinishedGoods: { include: { rawMaterial: true } } }
    });
    if (!outputItem) throw new ApiError(404, 'Finished good item not found');

    const { deductions, finishedGoods } = calculateDynamicBatch(outputItem, qty, waste, allItems);

    // Validate raw material stock
    for (const d of deductions) {
      const item = allItems.find(i => i.id === d.itemId);
      const availableQty = item ? Number(item.cachedQty || 0) : 0;
      const requiredQty = Number(d.quantityUsed || 0);
      if (availableQty < requiredQty) {
        throw new ApiError(400, `❌ Insufficient stock for ${item?.name || 'raw material'} (Required: ${requiredQty} ${item?.unit || ''}, Available: ${availableQty})`);
      }
    }

    const updatedBatch = await prisma.$transaction(async (tx) => {
      const pb = await tx[`${prefix}ProductionBatch`].update({
        where: { id },
        data: { status: 'COMPLETED', wasteQuantity: waste },
        include: {
          outputItem: { select: { id: true, name: true, unit: true } },
          consumptions: { include: { item: true } }
        }
      });

      if (deductions.length > 0) {
        await tx[`${prefix}ProductionBatchConsumption`].createMany({
          data: deductions.map(d => ({ batchId: pb.id, itemId: d.itemId, quantityUsed: d.quantityUsed }))
        });
        await tx[`${prefix}InventoryTransaction`].createMany({
          data: deductions.map(d => ({ itemId: d.itemId, quantity: d.quantityUsed, direction: 'OUT', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id, location: 'FACTORY' }))
        });
        for (const d of deductions) {
          await tx[`${prefix}Item`].update({ where: { id: d.itemId }, data: { cachedQty: { decrement: d.quantityUsed } } });
        }
      }

      if (finishedGoods.length > 0) {
        await tx[`${prefix}InventoryTransaction`].createMany({
          data: finishedGoods.map(fg => ({ itemId: fg.itemId, quantity: fg.quantityAdded, direction: 'IN', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id, location: 'FACTORY' }))
        });
        for (const fg of finishedGoods) {
          await tx[`${prefix}Item`].update({
            where: { id: fg.itemId },
            data: { cachedQty: { increment: fg.quantityAdded }, factoryQty: { increment: fg.quantityAdded } }
          });
        }
      }

      // If AquaSphere 19L, record bottle movements
      if (prefix === 'aquasphere' && outputItem.name.toLowerCase().includes('19l')) {
        const netGood = Math.max(0, qty - waste);
        if (netGood > 0) {
          await tx.aquasphereBottleTransaction.create({
            data: { type: 'MOVED_TO_FACTORY', quantity: netGood, reason: `Production Batch #${pb.id.substring(0, 8).toUpperCase()}` }
          });
        }
        if (waste > 0) {
          await tx.aquasphereBottleTransaction.create({
            data: { type: 'RETURNED_BROKEN', quantity: waste, reason: `Broken in Production Batch #${pb.id.substring(0, 8).toUpperCase()}` }
          });
        }
      }

      await createAuditLog(prefix, {
        action: 'PRODUCTION_BATCH_COMPLETED',
        entityType: 'PRODUCTION_BATCH',
        entityId: pb.id,
        performedBy: req.user?.id || 'Unknown',
        details: JSON.stringify({ status: 'COMPLETED', outputItem: outputItem.name, quantity: qty, wasteQuantity: waste })
      });

      return pb;
    }, { maxWait: 10000, timeout: 30000 });

    return sendSuccess(res, updatedBatch);
  }

  if (isWadaana) {
    const { brokenPure05L = 0, brokenPure15L = 0, brokenMix05L = 0, brokenMix15L = 0 } = req.body;
    const brPure05L = parseInt(brokenPure05L, 10) || 0;
    const brPure15L = parseInt(brokenPure15L, 10) || 0;
    const brMix05L = parseInt(brokenMix05L, 10) || 0;
    const brMix15L = parseInt(brokenMix15L, 10) || 0;

    if (brPure05L < 0 || brPure15L < 0 || brMix05L < 0 || brMix15L < 0) throw new ApiError(400, 'Broken bottle quantities cannot be negative');
    if (brPure05L > batch.qtyPure05L) throw new ApiError(400, `Broken 0.5L Pure bottles (${brPure05L}) exceed produced amount`);
    if (brPure15L > batch.qtyPure15L) throw new ApiError(400, `Broken 1.5L Pure bottles (${brPure15L}) exceed produced amount`);
    if (brMix05L > batch.qtyMix05L) throw new ApiError(400, `Broken 0.5L Mix bottles (${brMix05L}) exceed produced amount`);
    if (brMix15L > batch.qtyMix15L) throw new ApiError(400, `Broken 1.5L Mix bottles (${brMix15L}) exceed produced amount`);

    // Validate Preform Stock
    for (const pref of WADAANA_PREFORMS) {
      const producedQty = batch[pref.key] || 0;
      if (producedQty > 0) {
        const kgUsed = producedQty * pref.weight;
        const rmItem = matchWadaanaItem(allItems, 'RAW_MATERIAL', pref.primary, pref.volume);
        if (rmItem && Number(rmItem.cachedQty || 0) < kgUsed) {
          throw new ApiError(400, `❌ Insufficient preform stock for ${rmItem.name}`);
        }
      }
    }

    const updatedBatch = await prisma.$transaction(async (tx) => {
      const pb = await tx.wadaanaProductionBatch.update({
        where: { id },
        data: { status: 'COMPLETED', brokenPure05L: brPure05L, brokenPure15L: brPure15L, brokenMix05L: brMix05L, brokenMix15L: brMix15L }
      });

      // Update Wadaana finished goods stock
      for (const pref of WADAANA_PREFORMS) {
        const produced = pb[pref.key] || 0;
        const broken = pb[pref.brokenKey] || 0;
        const netGood = Math.max(0, produced - broken);
        if (netGood > 0) {
          const item = matchWadaanaItem(allItems, 'FINISHED_GOOD', pref.primary, pref.volume);
          if (item) {
            await tx.wadaanaInventoryTransaction.create({
              data: { itemId: item.id, quantity: netGood, direction: 'IN', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id }
            });
            await tx.wadaanaItem.update({
              where: { id: item.id },
              data: { cachedQty: { increment: netGood }, factoryQty: { increment: netGood } }
            });
          }
        }
      }

      // Deduct Wadaana preform raw materials
      for (const pref of WADAANA_PREFORMS) {
        const producedQty = batch[pref.key] || 0;
        if (producedQty > 0) {
          const kgUsed = producedQty * pref.weight;
          const rmItem = matchWadaanaItem(allItems, 'RAW_MATERIAL', pref.primary, pref.volume);
          if (rmItem) {
            await tx.wadaanaProductionBatchConsumption.create({
              data: { batchId: pb.id, itemId: rmItem.id, quantityUsed: kgUsed }
            });
            await tx.wadaanaInventoryTransaction.create({
              data: { itemId: rmItem.id, quantity: kgUsed, direction: 'OUT', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id }
            });
            await tx.wadaanaItem.update({
              where: { id: rmItem.id },
              data: { cachedQty: { decrement: kgUsed } }
            });
          }
        }
      }

      await createAuditLog('wadaana', {
        action: 'PRODUCTION_BATCH_COMPLETED',
        entityType: 'PRODUCTION_BATCH',
        entityId: pb.id,
        performedBy: req.user?.id || 'Unknown',
        details: JSON.stringify({ status: 'COMPLETED', qtyPure05L: pb.qtyPure05L, brPure05L, qtyPure15L: pb.qtyPure15L, brPure15L, qtyMix05L: pb.qtyMix05L, brMix05L, qtyMix15L: pb.qtyMix15L, brMix15L })
      });

      return pb;
    }, { maxWait: 10000, timeout: 30000 });

    return sendSuccess(res, updatedBatch);
  }

  // AquaSphere Production Batch Flow
  const { brokenBottles05L = 0, brokenBottles15L = 0, wasteQuantity = 0 } = req.body;
  const p05 = batch.packs05L || 0;
  const p15 = batch.packs15L || 0;
  const qty = batch.quantity || 0;
  const br05 = parseInt(brokenBottles05L, 10) || 0;
  const br15 = parseInt(brokenBottles15L, 10) || 0;
  const waste = parseInt(wasteQuantity, 10) || 0;

  if (br05 < 0 || br15 < 0 || waste < 0) throw new ApiError(400, 'Broken quantities cannot be negative');
  if (br05 > p05 * 12) throw new ApiError(400, `Broken 0.5L bottles (${br05}) exceed produced amount (${p05 * 12} pcs)`);
  if (br15 > p15 * 6) throw new ApiError(400, `Broken 1.5L bottles (${br15}) exceed produced amount (${p15 * 6} pcs)`);
  if (waste > qty) throw new ApiError(400, `Broken 19L bottles (${waste}) exceed produced amount (${qty} pcs)`);

  const { deductions, finishedGoods } = calculateProductionBatch({
    packs05L: p05,
    packs15L: p15,
    quantity: qty,
    brokenBottles05L: br05,
    brokenBottles15L: br15
  }, allItems);

  // Validate raw material stock
  for (const d of deductions) {
    const item = allItems.find(i => i.id === d.itemId);
    const availableQty = item ? Number(item.cachedQty || 0) : 0;
    const requiredQty = Number(d.quantityUsed || 0);
    if (availableQty < requiredQty) {
      throw new ApiError(400, `❌ Insufficient stock for ${item?.name || 'raw material'} (Required: ${requiredQty} ${item?.unit || ''}, Available: ${availableQty})`);
    }
  }

  const updatedBatch = await prisma.$transaction(async (tx) => {
    const pb = await tx.aquasphereProductionBatch.update({
      where: { id },
      data: { status: 'COMPLETED', brokenBottles05L: br05, brokenBottles15L: br15, wasteQuantity: waste }
    });

    if (qty > 0) {
      const netGood19L = Math.max(0, qty - waste);
      const fg19L = allItems.find(i => i.type === 'FINISHED_GOOD' && i.name.toLowerCase().includes('19l'));
      if (fg19L && netGood19L > 0) {
        await tx.aquasphereInventoryTransaction.create({
          data: { itemId: fg19L.id, quantity: netGood19L, direction: 'IN', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id, location: 'FACTORY' }
        });
        await tx.aquasphereItem.update({
          where: { id: fg19L.id },
          data: { cachedQty: { increment: netGood19L }, factoryQty: { increment: netGood19L } }
        });
        await tx.aquasphereBottleTransaction.create({
          data: { type: 'MOVED_TO_FACTORY', quantity: netGood19L, reason: `Production Batch #${pb.id.substring(0, 8).toUpperCase()}` }
        });
      }

      if (waste > 0) {
        await tx.aquasphereBottleTransaction.create({
          data: { type: 'RETURNED_BROKEN', quantity: waste, reason: `Broken in Production Batch #${pb.id.substring(0, 8).toUpperCase()}` }
        });
      }
    }

    if (deductions.length > 0) {
      await tx.aquasphereProductionBatchConsumption.createMany({
        data: deductions.map(d => ({ batchId: pb.id, itemId: d.itemId, quantityUsed: d.quantityUsed }))
      });
      await tx.aquasphereInventoryTransaction.createMany({
        data: deductions.map(d => ({ itemId: d.itemId, quantity: d.quantityUsed, direction: 'OUT', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id, location: 'FACTORY' }))
      });
      for (const d of deductions) {
        await tx.aquasphereItem.update({ where: { id: d.itemId }, data: { cachedQty: { decrement: d.quantityUsed } } });
      }
    }

    if (finishedGoods.length > 0) {
      await tx.aquasphereInventoryTransaction.createMany({
        data: finishedGoods.map(fg => ({ itemId: fg.itemId, quantity: fg.quantityAdded, direction: 'IN', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id, location: 'FACTORY' }))
      });
      for (const fg of finishedGoods) {
        await tx.aquasphereItem.update({
          where: { id: fg.itemId },
          data: { cachedQty: { increment: fg.quantityAdded }, factoryQty: { increment: fg.quantityAdded } }
        });
      }
    }

    return pb;
  }, { maxWait: 10000, timeout: 30000 });

  return sendSuccess(res, updatedBatch);
});

/** Deletes a production batch and rolls back inventory (OWNER only) */
export const deleteProductionBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);

  if (req.user?.role !== 'OWNER') throw new ApiError(403, 'Only Owner can delete production batches');

  const batch = await prisma[`${prefix}ProductionBatch`].findUnique({ where: { id } });
  if (!batch) throw new ApiError(404, 'Production batch not found');

  await prisma.$transaction(async (tx) => {
    if (batch.status === 'COMPLETED') {
      const txs = await tx[`${prefix}InventoryTransaction`].findMany({ where: { refType: 'BATCH', refId: id } });
      for (const t of txs) {
        const q = Number(t.quantity || 0);
        if (t.direction === 'IN') {
          await tx[`${prefix}Item`].update({ where: { id: t.itemId }, data: { cachedQty: { decrement: q } } }).catch(() => null);
        } else if (t.direction === 'OUT') {
          await tx[`${prefix}Item`].update({ where: { id: t.itemId }, data: { cachedQty: { increment: q } } }).catch(() => null);
        }
      }
      await tx[`${prefix}InventoryTransaction`].deleteMany({ where: { refType: 'BATCH', refId: id } });
    }

    await tx[`${prefix}ProductionBatchConsumption`].deleteMany({ where: { batchId: id } });
    await tx[`${prefix}ProductionBatch`].delete({ where: { id } });
  }, { maxWait: 10000, timeout: 30000 });

  return sendSuccess(res, null, 200, { message: 'Production batch deleted successfully' });
});
