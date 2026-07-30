import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateProductionBatch } from '../utils/productionFormulas.js';
import pkg from '@prisma/client';
const { Prisma } = pkg;

// Dynamic tenant helper for AquaSphere & Wadaana Production
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
  const isWadaana = prefix === 'wadaana';

  if (isWadaana) {
    const { qtyPure05L, qtyPure15L, qtyMix05L, qtyMix15L, batchDate, notes } = req.body;
    const p05 = parseInt(qtyPure05L || 0);
    const p15 = parseInt(qtyPure15L || 0);
    const m05 = parseInt(qtyMix05L || 0);
    const m15 = parseInt(qtyMix15L || 0);

    if (p05 < 0 || p15 < 0 || m05 < 0 || m15 < 0) {
      throw new ApiError(400, 'Quantities cannot be negative');
    }

    if (p05 === 0 && p15 === 0 && m05 === 0 && m15 === 0) {
      throw new ApiError(400, 'Must produce at least one bottle type');
    }

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

    return res.status(201).json({ success: true, data: batch });
  } else {
    const { quantity, packs05L, packs15L, batchDate, notes } = req.body;
    const packs05LNum = parseInt(packs05L || 0);
    const packs15LNum = parseInt(packs15L || 0);
    const quantityNum = parseInt(quantity || 0);

    if (packs05LNum < 0 || packs15LNum < 0 || quantityNum < 0) {
      throw new ApiError(400, 'Quantities cannot be negative');
    }

    if (packs05LNum === 0 && packs15LNum === 0 && quantityNum === 0) {
      throw new ApiError(400, 'Must produce at least one pack or 19L bottle');
    }

    const batch = await prisma.aquasphereProductionBatch.create({
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
  }
});

export const completeProductionBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);
  const isWadaana = prefix === 'wadaana';
  const { brokenBottles05L, brokenBottles15L, wasteQuantity, confirmed } = req.body;

  const batch = await prisma[`${prefix}ProductionBatch`].findUnique({
    where: { id }
  });

  if (!batch) throw new ApiError(404, 'Batch not found');
  if (batch.status === 'COMPLETED') throw new ApiError(400, 'Batch is already completed');

  const allItems = await prisma[`${prefix}Item`].findMany({
    where: { archivedAt: null }
  });

  if (isWadaana) {
    const { brokenPure05L, brokenPure15L, brokenMix05L, brokenMix15L } = req.body;

    const brPure05L = parseInt(brokenPure05L || 0);
    const brPure15L = parseInt(brokenPure15L || 0);
    const brMix05L = parseInt(brokenMix05L || 0);
    const brMix15L = parseInt(brokenMix15L || 0);

    if (brPure05L < 0 || brPure15L < 0 || brMix05L < 0 || brMix15L < 0) {
      throw new ApiError(400, 'Broken bottle quantities cannot be negative');
    }

    if (brPure05L > batch.qtyPure05L) {
      throw new ApiError(400, `Broken 0.5L Pure bottles (${brPure05L}) cannot exceed produced amount (${batch.qtyPure05L})`);
    }
    if (brPure15L > batch.qtyPure15L) {
      throw new ApiError(400, `Broken 1.5L Pure bottles (${brPure15L}) cannot exceed produced amount (${batch.qtyPure15L})`);
    }
    if (brMix05L > batch.qtyMix05L) {
      throw new ApiError(400, `Broken 0.5L Mix bottles (${brMix05L}) cannot exceed produced amount (${batch.qtyMix05L})`);
    }
    if (brMix15L > batch.qtyMix15L) {
      throw new ApiError(400, `Broken 1.5L Mix bottles (${brMix15L}) cannot exceed produced amount (${batch.qtyMix15L})`);
    }

    const updatedBatch = await prisma.$transaction(async (tx) => {
      const pb = await tx.wadaanaProductionBatch.update({
        where: { id },
        data: { 
          status: 'COMPLETED',
          brokenPure05L: brPure05L,
          brokenPure15L: brPure15L,
          brokenMix05L: brMix05L,
          brokenMix15L: brMix15L
        }
      });

      // Update Wadaana finished goods stocks (Net Good = Total Produced - Broken)
      const wadaanaMapping = [
        { key: 'qtyPure05L', brokenKey: 'brokenPure05L', search: ['pure', '0.5l'] },
        { key: 'qtyPure15L', brokenKey: 'brokenPure15L', search: ['pure', '1.5l'] },
        { key: 'qtyMix05L', brokenKey: 'brokenMix05L', search: ['mix', '0.5l'] },
        { key: 'qtyMix15L', brokenKey: 'brokenMix15L', search: ['mix', '1.5l'] }
      ];

      for (const map of wadaanaMapping) {
        const produced = pb[map.key] || 0;
        const brokenQty = pb[map.brokenKey] || 0;
        const netGood = Math.max(0, produced - brokenQty);

        if (netGood > 0) {
          const item = allItems.find(i => 
            map.search.every(s => i.name.toLowerCase().includes(s))
          );
          if (item) {
            await tx.wadaanaInventoryTransaction.create({
              data: { itemId: item.id, quantity: netGood, direction: 'IN', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id }
            });
            await tx.wadaanaItem.update({
              where: { id: item.id },
              data: { cachedQty: { increment: netGood } }
            });
          }
        }
      }

      await tx.wadaanaAuditLog.create({
        data: {
          action: 'PRODUCTION_BATCH_COMPLETED',
          entityType: 'PRODUCTION_BATCH',
          entityId: pb.id,
          performedBy: req.user?.id || 'Unknown',
          details: JSON.stringify({ 
            status: 'COMPLETED', 
            qtyPure05L: pb.qtyPure05L, brPure05L, 
            qtyPure15L: pb.qtyPure15L, brPure15L, 
            qtyMix05L: pb.qtyMix05L, brMix05L, 
            qtyMix15L: pb.qtyMix15L, brMix15L 
          })
        }
      });

      return pb;
    });

    return res.status(200).json({ success: true, data: updatedBatch });
  }

  // AquaSphere Execution Flow
  const packs05LNum = batch.packs05L || 0;
  const packs15LNum = batch.packs15L || 0;
  const quantityNum = batch.quantity || 0;
  
  const broken05LNum = parseInt(brokenBottles05L || 0);
  const broken15LNum = parseInt(brokenBottles15L || 0);
  const wasteQtyNum = parseInt(wasteQuantity || 0);

  if (broken05LNum < 0 || broken15LNum < 0 || wasteQtyNum < 0) {
    throw new ApiError(400, 'Broken quantities cannot be negative');
  }

  const { deductions, finishedGoods, broken } = calculateProductionBatch({
    packs05L: packs05LNum,
    packs15L: packs15LNum,
    brokenBottles05L: broken05LNum,
    brokenBottles15L: broken15LNum
  }, allItems);

  const updatedBatch = await prisma.$transaction(async (tx) => {
    const pb = await tx.aquasphereProductionBatch.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        brokenBottles05L: broken05LNum,
        brokenBottles15L: broken15LNum,
        wasteQuantity: wasteQtyNum
      }
    });

    if (quantityNum > 0) {
      const netGood19L = Math.max(0, quantityNum - wasteQtyNum);
      const fg19L = allItems.find(i => i.type === 'FINISHED_GOOD' && (i.name.toLowerCase().includes('19l') || i.name.toLowerCase().includes('19 l')));
      if (fg19L && netGood19L > 0) {
        await tx.aquasphereInventoryTransaction.create({
          data: { itemId: fg19L.id, quantity: netGood19L, direction: 'IN', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id }
        });
        await tx.aquasphereItem.update({
          where: { id: fg19L.id }, data: { cachedQty: { increment: netGood19L } }
        });
      }
    }

    for (const d of deductions) {
      await tx.aquasphereProductionBatchConsumption.create({ data: { batchId: pb.id, itemId: d.itemId, quantityUsed: d.quantityUsed } });
      await tx.aquasphereInventoryTransaction.create({ data: { itemId: d.itemId, quantity: d.quantityUsed, direction: 'OUT', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id } });
      await tx.aquasphereItem.update({ where: { id: d.itemId }, data: { cachedQty: { decrement: d.quantityUsed } } });
    }

    for (const fg of finishedGoods) {
      await tx.aquasphereInventoryTransaction.create({ data: { itemId: fg.itemId, quantity: fg.quantityAdded, direction: 'IN', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id } });
      await tx.aquasphereItem.update({ where: { id: fg.itemId }, data: { cachedQty: { increment: fg.quantityAdded } } });
    }

    return pb;
  });

  res.status(200).json({ success: true, data: updatedBatch });
});
