import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateProductionBatch } from '../utils/productionFormulas.js';
import pkg from '@prisma/client';
const { Prisma } = pkg;

// Dynamic tenant helper
const getTenantPrefix = (req) => {
  const tenant = (req.headers['x-tenant'] || 'aquasphere').toLowerCase();
  return tenant === 'wadaana' ? 'wadaana' : 'aquasphere';
};

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
        consumptions: {
          include: { item: true }
        }
      }
    }),
    prisma[`${prefix}ProductionBatch`].count()
  ]);

  res.status(200).json({
    success: true,
    data: batches,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  });
});

export const getProductionBatchById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);

  const batch = await prisma[`${prefix}ProductionBatch`].findUnique({
    where: { id },
    include: {
      outputItem: true,
      inputItem: true,
      consumptions: {
        include: { item: true }
      }
    }
  });

  if (!batch) {
    throw new ApiError(404, 'Production batch not found');
  }

  res.status(200).json({ success: true, data: batch });
});

export const getProductionStats = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const todaysBatches = await prisma[`${prefix}ProductionBatch`].aggregate({
    where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    _count: { id: true },
    _sum: { packs05L: true, packs15L: true, quantity: true, wasteQuantity: true }
  });

  const monthBatches = await prisma[`${prefix}ProductionBatch`].aggregate({
    where: { createdAt: { gte: startOfMonth } },
    _sum: { packs05L: true, packs15L: true, quantity: true, wasteQuantity: true }
  });

  res.status(200).json({
    success: true,
    data: {
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
    }
  });
});

export const createProductionBatch = asyncHandler(async (req, res) => {
  const prefix = getTenantPrefix(req);
  const { quantity, packs05L, packs15L, batchDate, notes } = req.body;

  // quantities can be zero but at least one must be > 0
  const packs05LNum = parseInt(packs05L || 0);
  const packs15LNum = parseInt(packs15L || 0);
  const quantityNum = parseInt(quantity || 0);

  if (packs05LNum < 0 || packs15LNum < 0 || quantityNum < 0) {
    throw new ApiError(400, 'Quantities cannot be negative');
  }

  if (packs05LNum === 0 && packs15LNum === 0 && quantityNum === 0) {
    throw new ApiError(400, 'Must produce at least one pack or 19L bottle');
  }

  // Just create the PENDING batch. Deductions happen on completion.
  const batch = await prisma[`${prefix}ProductionBatch`].create({
    data: {
      quantity: quantityNum,
      packs05L: packs05LNum,
      packs15L: packs15LNum,
      batchDate: batchDate ? new Date(batchDate) : new Date(),
      notes: notes || null,
      producedBy: req.user?.id || 'Unknown',
      status: 'PENDING'
    }
  });

  return res.status(201).json({ success: true, data: batch });
});

export const completeProductionBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);
  const { brokenBottles05L, brokenBottles15L, wasteQuantity, confirmed } = req.body;

  const batch = await prisma[`${prefix}ProductionBatch`].findUnique({
    where: { id }
  });

  if (!batch) throw new ApiError(404, 'Batch not found');
  if (batch.status === 'COMPLETED') throw new ApiError(400, 'Batch is already completed');

  const packs05LNum = batch.packs05L;
  const packs15LNum = batch.packs15L;
  const quantityNum = batch.quantity || 0;
  
  const broken05LNum = parseInt(brokenBottles05L || 0);
  const broken15LNum = parseInt(brokenBottles15L || 0);
  const wasteQtyNum = parseInt(wasteQuantity || 0);

  if (broken05LNum < 0 || broken15LNum < 0 || wasteQtyNum < 0) {
    throw new ApiError(400, 'Broken quantities cannot be negative');
  }

  // Validate broken bottles do not exceed total produced bottles
  const total05LBottles = packs05LNum * 12;
  const total15LBottles = packs15LNum * 6;
  const total19LBottles = quantityNum;

  if (broken05LNum > total05LBottles) {
    throw new ApiError(400, `Broken 0.5L bottles (${broken05LNum} pcs) cannot exceed total produced bottles (${total05LBottles} pcs)`);
  }

  if (broken15LNum > total15LBottles) {
    throw new ApiError(400, `Broken 1.5L bottles (${broken15LNum} pcs) cannot exceed total produced bottles (${total15LBottles} pcs)`);
  }

  if (wasteQtyNum > total19LBottles) {
    throw new ApiError(400, `Broken 19L bottles (${wasteQtyNum} pcs) cannot exceed total produced 19L bottles (${total19LBottles} pcs)`);
  }

  const allItems = await prisma[`${prefix}Item`].findMany({
    where: { archivedAt: null }
  });

  const { deductions, finishedGoods, broken } = calculateProductionBatch({
    packs05L: packs05LNum,
    packs15L: packs15LNum,
    brokenBottles05L: broken05LNum,
    brokenBottles15L: broken15LNum
  }, allItems);

  if (packs05LNum > 0 || packs15LNum > 0) {
    if (deductions.length === 0) {
      throw new ApiError(400, 'Could not determine deductions. Check if raw materials exist in DB.');
    }

    if (finishedGoods.length === 0) {
      throw new ApiError(400, 'Could not map finished goods. Check if they exist in DB.');
    }
  }

  if (!confirmed) {
    const warnings = [];
    for (const d of deductions) {
      const item = allItems.find(i => i.id === d.itemId);
      if (!item) continue;
      const newStock = new Prisma.Decimal(item.cachedQty).minus(d.quantityUsed);
      if (newStock.lessThan(0)) {
        warnings.push({
          itemId: item.id,
          name: item.name,
          currentStock: item.cachedQty.toString(),
          required: d.quantityUsed.toString(),
          unit: item.unit
        });
      }
    }

    if (warnings.length > 0) {
      return res.status(200).json({
        success: true,
        warning: true,
        requiresConfirmation: true,
        message: 'Some materials will fall below zero stock',
        items: warnings
      });
    }
  }

  const updatedBatch = await prisma.$transaction(async (tx) => {
    // 1. Update batch to COMPLETED
    const pb = await tx[`${prefix}ProductionBatch`].update({
      where: { id },
      data: {
        status: 'COMPLETED',
        brokenBottles05L: broken05LNum,
        brokenBottles15L: broken15LNum,
        wasteQuantity: wasteQtyNum
      }
    });

    // 2. Handle 19L Bottles explicitly
    if (quantityNum > 0) {
      const netGood19L = Math.max(0, quantityNum - wasteQtyNum);

      const fg19L = allItems.find(i => i.type === 'FINISHED_GOOD' && (i.name.toLowerCase().includes('19l') || i.name.toLowerCase().includes('19 l')));
      if (fg19L && netGood19L > 0) {
        await tx[`${prefix}InventoryTransaction`].create({
          data: { itemId: fg19L.id, quantity: netGood19L, direction: 'IN', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id }
        });
        await tx[`${prefix}Item`].update({
          where: { id: fg19L.id }, data: { cachedQty: { increment: netGood19L } }
        });
      }
      
      // Log total produced 19L to Factory Bottle Ledger
      await tx[`${prefix}BottleTransaction`].create({
        data: { type: 'AT_FACTORY_ADJUSTMENT', quantity: quantityNum, reason: `Produced 19L from Batch ${pb.id.substring(0, 8)}` }
      });
      
      const empty19L = allItems.find(i => i.type === 'RAW_MATERIAL' && (i.name.toLowerCase().includes('19l') || i.name.toLowerCase().includes('19 l')) && (i.name.toLowerCase().includes('empty') || i.name.toLowerCase().includes('bottle')));
      if (empty19L) {
        await tx[`${prefix}InventoryTransaction`].create({
          data: { itemId: empty19L.id, quantity: quantityNum, direction: 'OUT', reason: 'CONSUMED_IN_PRODUCTION', refType: 'BATCH', refId: pb.id }
        });
        await tx[`${prefix}Item`].update({
          where: { id: empty19L.id }, data: { cachedQty: { decrement: quantityNum } }
        });
      }
      
      // Log broken 19L bottles to Bottle Ledger as RETURNED_BROKEN so it shows in Broken count
      if (wasteQtyNum > 0) {
        await tx[`${prefix}BottleTransaction`].create({
          data: { type: 'RETURNED_BROKEN', quantity: wasteQtyNum, reason: `Production breakage in Batch #${pb.id.substring(0, 8)}` }
        });
      }
    }

    // 3. Log Deductions (Raw Materials for 0.5L and 1.5L)
    for (const d of deductions) {
      await tx[`${prefix}ProductionBatchConsumption`].create({ data: { batchId: pb.id, itemId: d.itemId, quantityUsed: d.quantityUsed } });
      await tx[`${prefix}InventoryTransaction`].create({ data: { itemId: d.itemId, quantity: d.quantityUsed, direction: 'OUT', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id } });
      await tx[`${prefix}Item`].update({ where: { id: d.itemId }, data: { cachedQty: { decrement: d.quantityUsed } } });
    }

    // 4. Log Additions (Finished Goods for 0.5L and 1.5L)
    for (const fg of finishedGoods) {
      await tx[`${prefix}InventoryTransaction`].create({ data: { itemId: fg.itemId, quantity: fg.quantityAdded, direction: 'IN', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id } });
      await tx[`${prefix}Item`].update({ where: { id: fg.itemId }, data: { cachedQty: { increment: fg.quantityAdded } } });
    }

    // 5. Log Broken Bottles (0.5L and 1.5L)
    for (const b of broken) {
      await tx[`${prefix}InventoryTransaction`].create({ data: { itemId: b.itemId, quantity: b.quantityBroken, direction: 'OUT', reason: 'PRODUCTION_BREAKAGE', refType: 'BATCH', refId: pb.id } });
      await tx[`${prefix}Item`].update({ where: { id: b.itemId }, data: { cachedQty: { decrement: b.quantityBroken } } });
    }

    await tx[`${prefix}AuditLog`].create({
      data: {
        action: 'PRODUCTION_BATCH_COMPLETED',
        entityType: 'PRODUCTION_BATCH',
        entityId: pb.id,
        performedBy: req.user?.id || 'Unknown',
        details: JSON.stringify({ status: 'COMPLETED', packs05LNum, packs15LNum, broken05LNum, broken15LNum, wasteQtyNum })
      }
    });

    return pb;
  });

  res.status(200).json({ success: true, data: updatedBatch });
});
