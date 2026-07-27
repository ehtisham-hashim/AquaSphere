import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateProductionBatch } from '../utils/productionFormulas.js';
import { Prisma } from '@prisma/client';

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
  const { outputItemId, quantity, wasteQuantity, wasteItemId, remarks, packs05L, packs15L, brokenBottles05L, brokenBottles15L, batchDate, notes, confirmed } = req.body;

  // Option 1: Dynamic BOM / Recipe-based batch logging (from frontend UI)
  if (outputItemId && quantity) {
    const qtyNum = parseInt(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      throw new ApiError(400, 'Quantity must be a positive integer');
    }

    const batch = await prisma.$transaction(async (tx) => {
      // 1. Create Production Batch
      const pb = await tx[`${prefix}ProductionBatch`].create({
        data: {
          outputItemId,
          quantity: qtyNum,
          wasteQuantity: wasteQuantity ? parseInt(wasteQuantity) : 0,
          remarks: remarks || null,
          batchDate: batchDate ? new Date(batchDate) : new Date(),
          producedBy: req.user?.id || 'Unknown'
        }
      });

      // 2. Increase Finished Good Inventory
      await tx[`${prefix}InventoryTransaction`].create({
        data: {
          itemId: outputItemId,
          quantity: qtyNum,
          direction: 'IN',
          reason: 'PRODUCTION',
          refType: 'BATCH',
          refId: pb.id
        }
      });

      await tx[`${prefix}Item`].update({
        where: { id: outputItemId },
        data: { cachedQty: { increment: qtyNum } }
      });

      // 3. BOM Auto-Deduction for Raw Materials
      const recipes = await tx[`${prefix}RecipeItem`].findMany({
        where: { finishedGoodId: outputItemId }
      });

      for (const recipe of recipes) {
        const consumedQty = Number(recipe.quantityPerUnit) * qtyNum;

        // Record batch consumption
        await tx[`${prefix}ProductionBatchConsumption`].create({
          data: {
            batchId: pb.id,
            itemId: recipe.rawMaterialId,
            quantityUsed: consumedQty
          }
        });

        // Deduct raw material inventory
        await tx[`${prefix}InventoryTransaction`].create({
          data: {
            itemId: recipe.rawMaterialId,
            quantity: consumedQty,
            direction: 'OUT',
            reason: 'CONSUMED_IN_PRODUCTION',
            refType: 'BATCH',
            refId: pb.id
          }
        });

        await tx[`${prefix}Item`].update({
          where: { id: recipe.rawMaterialId },
          data: { cachedQty: { decrement: consumedQty } }
        });
      }

      // 4. Handle Waste
      if (wasteQuantity && parseInt(wasteQuantity) > 0 && wasteItemId) {
        await tx[`${prefix}InventoryTransaction`].create({
          data: {
            itemId: wasteItemId,
            quantity: parseInt(wasteQuantity),
            direction: 'OUT',
            reason: 'BROKEN_WASTE',
            refType: 'BATCH',
            refId: pb.id
          }
        });
        await tx[`${prefix}Item`].update({
          where: { id: wasteItemId },
          data: { cachedQty: { decrement: parseInt(wasteQuantity) } }
        });
      }

      // 5. Audit log entry
      await tx[`${prefix}AuditLog`].create({
        data: {
          action: 'PRODUCTION_BATCH_CREATED',
          entityType: 'PRODUCTION_BATCH',
          entityId: pb.id,
          performedBy: req.user?.id || 'Unknown',
          details: JSON.stringify({
            outputItemId,
            quantity: qtyNum,
            wasteQuantity: wasteQuantity ? parseInt(wasteQuantity) : 0,
            remarks
          })
        }
      });

      return pb;
    });

    return res.status(201).json({ success: true, data: batch });
  }

  // Option 2: Formula-based batch logging
  const packs05LNum = parseInt(packs05L || 0);
  const packs15LNum = parseInt(packs15L || 0);
  const broken05LNum = parseInt(brokenBottles05L || 0);
  const broken15LNum = parseInt(brokenBottles15L || 0);

  if (packs05LNum < 0 || packs15LNum < 0 || broken05LNum < 0 || broken15LNum < 0) {
    throw new ApiError(400, 'Quantities cannot be negative');
  }

  if (packs05LNum === 0 && packs15LNum === 0) {
    throw new ApiError(400, 'Must produce at least one pack or specify output item and quantity');
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

  if (deductions.length === 0) {
    throw new ApiError(400, 'Could not determine deductions. Check if raw materials exist in DB.');
  }

  if (finishedGoods.length === 0) {
    throw new ApiError(400, 'Could not map finished goods. Check if they exist in DB.');
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

  const batch = await prisma.$transaction(async (tx) => {
    const pb = await tx[`${prefix}ProductionBatch`].create({
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

    for (const d of deductions) {
      await tx[`${prefix}ProductionBatchConsumption`].create({
        data: {
          batchId: pb.id,
          itemId: d.itemId,
          quantityUsed: d.quantityUsed
        }
      });

      await tx[`${prefix}InventoryTransaction`].create({
        data: {
          itemId: d.itemId,
          quantity: d.quantityUsed,
          direction: 'OUT',
          reason: 'PRODUCTION',
          refType: 'BATCH',
          refId: pb.id
        }
      });

      await tx[`${prefix}Item`].update({
        where: { id: d.itemId },
        data: { cachedQty: { decrement: d.quantityUsed } }
      });
    }

    for (const fg of finishedGoods) {
      await tx[`${prefix}InventoryTransaction`].create({
        data: {
          itemId: fg.itemId,
          quantity: fg.quantityAdded,
          direction: 'IN',
          reason: 'PRODUCTION',
          refType: 'BATCH',
          refId: pb.id
        }
      });

      await tx[`${prefix}Item`].update({
        where: { id: fg.itemId },
        data: { cachedQty: { increment: fg.quantityAdded } }
      });
    }

    for (const b of broken) {
      await tx[`${prefix}InventoryTransaction`].create({
        data: {
          itemId: b.itemId,
          quantity: b.quantityBroken,
          direction: 'OUT',
          reason: 'PRODUCTION_BREAKAGE',
          refType: 'BATCH',
          refId: pb.id
        }
      });

      await tx[`${prefix}Item`].update({
        where: { id: b.itemId },
        data: { cachedQty: { decrement: b.quantityBroken } }
      });

      // Link to Bottle Transaction Ledger (Phase 3 Feature 4: Deduct At Factory -> Add to Broken)
      await tx[`${prefix}BottleTransaction`].create({
        data: {
          type: 'RETURNED_BROKEN',
          quantity: parseInt(b.quantityBroken.toString()),
          reason: `Production breakage in batch #${pb.id.substring(0, 8)}`
        }
      });
    }

    await tx[`${prefix}AuditLog`].create({
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
