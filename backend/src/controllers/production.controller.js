import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateProductionBatch } from '../utils/productionFormulas.js';
import { Prisma } from '@prisma/client';

export const getProductionBatches = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;

  const [batches, total] = await Promise.all([
    prisma.aquasphereProductionBatch.findMany({
      skip,
      take: Number(limit),
      orderBy: { batchDate: 'desc' },
      include: {
        consumptions: {
          include: { item: true }
        }
      }
    }),
    prisma.aquasphereProductionBatch.count()
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

  const batch = await prisma.aquasphereProductionBatch.findUnique({
    where: { id },
    include: {
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
  // Simple today stats
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const todaysBatches = await prisma.aquasphereProductionBatch.aggregate({
    where: { batchDate: { gte: startOfDay, lte: endOfDay } },
    _count: { id: true },
    _sum: { packs05L: true, packs15L: true }
  });

  const monthBatches = await prisma.aquasphereProductionBatch.aggregate({
    where: { batchDate: { gte: startOfMonth } },
    _sum: { packs05L: true, packs15L: true }
  });

  res.status(200).json({
    success: true,
    data: {
      today: {
        batches: todaysBatches._count.id || 0,
        packs05L: todaysBatches._sum.packs05L || 0,
        packs15L: todaysBatches._sum.packs15L || 0
      },
      month: {
        packs05L: monthBatches._sum.packs05L || 0,
        packs15L: monthBatches._sum.packs15L || 0
      }
    }
  });
});

export const createProductionBatch = asyncHandler(async (req, res) => {
  const { packs05L, packs15L, brokenBottles05L, brokenBottles15L, batchDate, notes, confirmed } = req.body;

  const packs05LNum = parseInt(packs05L || 0);
  const packs15LNum = parseInt(packs15L || 0);
  const broken05LNum = parseInt(brokenBottles05L || 0);
  const broken15LNum = parseInt(brokenBottles15L || 0);

  if (packs05LNum < 0 || packs15LNum < 0 || broken05LNum < 0 || broken15LNum < 0) {
    throw new ApiError(400, 'Quantities cannot be negative');
  }

  if (packs05LNum === 0 && packs15LNum === 0) {
    throw new ApiError(400, 'Must produce at least one pack');
  }

  // 1. Fetch all items
  const allItems = await prisma.aquasphereItem.findMany({
    where: { archivedAt: null }
  });

  // 2. Run formula engine
  const { deductions, finishedGoods, broken } = calculateProductionBatch({
    packs05L: packs05LNum,
    packs15L: packs15LNum,
    brokenBottles05L: broken05LNum,
    brokenBottles15L: broken15LNum
  }, allItems);

  if (deductions.length === 0) {
     throw new ApiError(400, 'Could not determine deductions. Check if raw materials exist in DB.');
  }

  if (finishedGoods.length === 0) {
     throw new ApiError(400, 'Could not map finished goods. Check if they exist in DB.');
  }

  // 3. Soft-stock check
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

  // 4. Execute single transaction
  const batch = await prisma.$transaction(async (tx) => {
    // Create batch
    const pb = await tx.aquasphereProductionBatch.create({
      data: {
        packs05L: packs05LNum,
        packs15L: packs15LNum,
        brokenBottles05L: broken05LNum,
        brokenBottles15L: broken15LNum,
        batchDate: batchDate ? new Date(batchDate) : new Date(),
        producedBy: req.user?.id || 'Unknown',
        notes
      }
    });

    // Apply Deductions
    for (const d of deductions) {
      await tx.aquasphereProductionBatchConsumption.create({
        data: {
          batchId: pb.id,
          itemId: d.itemId,
          quantityUsed: d.quantityUsed
        }
      });

      await tx.aquasphereInventoryTransaction.create({
        data: {
          itemId: d.itemId,
          quantity: d.quantityUsed,
          direction: 'OUT',
          reason: 'PRODUCTION',
          refType: 'BATCH',
          refId: pb.id
        }
      });

      await tx.aquasphereItem.update({
        where: { id: d.itemId },
        data: { cachedQty: { decrement: d.quantityUsed } }
      });
    }

    // Apply Finished Goods additions
    for (const fg of finishedGoods) {
      await tx.aquasphereInventoryTransaction.create({
        data: {
          itemId: fg.itemId,
          quantity: fg.quantityAdded,
          direction: 'IN',
          reason: 'PRODUCTION',
          refType: 'BATCH',
          refId: pb.id
        }
      });

      await tx.aquasphereItem.update({
        where: { id: fg.itemId },
        data: { cachedQty: { increment: fg.quantityAdded } }
      });
    }

    // Apply Broken Bottles deductions
    for (const b of broken) {
      await tx.aquasphereInventoryTransaction.create({
        data: {
          itemId: b.itemId,
          quantity: b.quantityBroken,
          direction: 'OUT',
          reason: 'PRODUCTION_BREAKAGE',
          refType: 'BATCH',
          refId: pb.id
        }
      });

      await tx.aquasphereItem.update({
        where: { id: b.itemId },
        data: { cachedQty: { decrement: b.quantityBroken } }
      });
    }

    // Audit Log
    await tx.aquasphereAuditLog.create({
      data: {
        action: 'PRODUCTION_BATCH_CREATED',
        entityType: 'PRODUCTION_BATCH',
        entityId: pb.id,
        performedBy: req.user?.id || 'Unknown',
        details: JSON.stringify({
          packs05L: packs05LNum,
          packs15L: packs15LNum,
          brokenBottles05L: broken05LNum,
          brokenBottles15L: broken15LNum,
          deductions: deductions.map(d => ({ item: d.name, qty: d.quantityUsed.toString(), unit: d.unit })),
          finishedGoodsAdded: finishedGoods.map(fg => ({ item: fg.name, qty: fg.quantityAdded.toString() }))
        })
      }
    });

    return pb;
  });

  res.status(201).json({ success: true, data: batch });
});
