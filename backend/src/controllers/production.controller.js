import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateBatchDeductions } from '../utils/productionFormulas.js';
import { getTenantPrefix } from '../utils/tenant.js';
import { createAuditLog } from '../utils/auditLog.js';
import { sendSuccess } from '../utils/response.js';
import { broadcastEvent } from '../utils/sseBus.js';

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
    createdBy: userMap[b.producedBy] || { name: 'Shift Operator', role: 'OPERATOR' }
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

  const { items: rawItems, outputItemId, quantity = 0, batchDate, notes } = req.body;

  // 1. Gather items to produce
  let itemsToProduce = [];
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    itemsToProduce = rawItems
      .map(i => ({ outputItemId: i.outputItemId || i.id, quantity: parseInt(i.quantity, 10) || 0 }))
      .filter(i => i.outputItemId && i.quantity > 0);
  } else if (outputItemId && (parseInt(quantity, 10) || 0) > 0) {
    itemsToProduce = [{ outputItemId, quantity: parseInt(quantity, 10) }];
  }

  // If structured finished goods were provided
  if (itemsToProduce.length > 0) {
    const itemIds = itemsToProduce.map(i => i.outputItemId);
    const existingItems = await prisma[`${prefix}Item`].findMany({
      where: { id: { in: itemIds }, type: 'FINISHED_GOOD', archivedAt: null }
    });

    if (existingItems.length !== itemIds.length) {
      throw new ApiError(400, 'One or more selected products are invalid or not registered as Finished Goods in the database.');
    }

    const itemMap = new Map(existingItems.map(i => [i.id, i]));
    const parsedBatchDate = batchDate ? new Date(batchDate) : new Date();
    const finalBatchDate = isNaN(parsedBatchDate.getTime()) ? new Date() : parsedBatchDate;

    const producedItems = itemsToProduce.map(prod => {
      const fg = itemMap.get(prod.outputItemId);
      const nameLower = (fg?.name || '').toLowerCase();
      const packSize = Number(fg?.packSize) > 1 
        ? Number(fg.packSize) 
        : (nameLower.includes('0.5') ? 12 : (nameLower.includes('1.5') ? 6 : 1));
      const isPack = !isWadaana && packSize > 1;

      return {
        itemId: prod.outputItemId,
        name: fg?.name || 'Finished Good',
        unit: isPack ? 'PETs' : (fg?.unit || 'bottles'),
        quantity: prod.quantity,
        packSize,
        totalBottles: prod.quantity * packSize
      };
    });

    let batchData;

    if (prefix === 'aquasphere') {
      let total19L = 0;
      let total15L = 0;
      let total05L = 0;
      const customItems = [];

      for (const prod of itemsToProduce) {
        const fgItem = itemMap.get(prod.outputItemId);
        const nameLower = (fgItem?.name || '').toLowerCase();
        if (nameLower.includes('19l') || nameLower.includes('19 l')) {
          total19L += prod.quantity;
        } else if ((nameLower.includes('1.5') || nameLower.includes('1500')) && !nameLower.includes('pure') && !nameLower.includes('mix')) {
          total15L += prod.quantity;
        } else if ((nameLower.includes('0.5') || nameLower.includes('500')) && !nameLower.includes('pure') && !nameLower.includes('mix')) {
          total05L += prod.quantity;
        } else {
          customItems.push(prod);
        }
      }

      batchData = {
        outputItemId: itemsToProduce.length === 1 ? itemsToProduce[0].outputItemId : null,
        quantity: itemsToProduce.length === 1 ? itemsToProduce[0].quantity : (total19L > 0 ? total19L : null),
        packs05L: total05L,
        packs15L: total15L
      };
    } else {
      // Wadaana
      let totalPure05L = 0;
      let totalPure15L = 0;
      let totalMix05L = 0;
      let totalMix15L = 0;
      const customItems = [];

      for (const prod of itemsToProduce) {
        const fgItem = itemMap.get(prod.outputItemId);
        const nameLower = (fgItem?.name || '').toLowerCase();
        if (nameLower.includes('pure') && (nameLower.includes('0.5') || nameLower.includes('15g') || nameLower.includes('500'))) {
          totalPure05L += prod.quantity;
        } else if (nameLower.includes('pure') && (nameLower.includes('1.5') || nameLower.includes('30g') || nameLower.includes('1500'))) {
          totalPure15L += prod.quantity;
        } else if (nameLower.includes('mix') && (nameLower.includes('0.5') || nameLower.includes('13g') || nameLower.includes('500'))) {
          totalMix05L += prod.quantity;
        } else if (nameLower.includes('mix') && (nameLower.includes('1.5') || nameLower.includes('27g') || nameLower.includes('1500'))) {
          totalMix15L += prod.quantity;
        } else {
          customItems.push(prod);
        }
      }

      batchData = {
        outputItemId: itemsToProduce.length === 1 ? itemsToProduce[0].outputItemId : null,
        quantity: itemsToProduce.length === 1 ? itemsToProduce[0].quantity : null,
        qtyPure05L: totalPure05L,
        qtyPure15L: totalPure15L,
        qtyMix05L: totalMix05L,
        qtyMix15L: totalMix15L
      };
    }

    const createdBatch = await prisma[`${prefix}ProductionBatch`].create({
      data: {
        ...batchData,
        remarks: JSON.stringify({ producedItems }),
        batchDate: finalBatchDate,
        notes: notes || null,
        producedBy: req.user?.id || 'Shift Operator',
        status: 'PENDING'
      },
      include: {
        outputItem: { select: { id: true, name: true, unit: true } },
        consumptions: { include: { item: true } }
      }
    });

    broadcastEvent(prefix, 'PRODUCTION_UPDATED', { batchId: createdBatch.id });
    return sendSuccess(res, createdBatch, 201, {
      message: 'Unified production batch recorded successfully'
    });
  }

  // 2. Legacy fallback for Wadaana (direct column counts)
  if (isWadaana) {
    const { qtyPure05L = 0, qtyPure15L = 0, qtyMix05L = 0, qtyMix15L = 0 } = req.body;
    const p05 = parseInt(qtyPure05L, 10) || 0;
    const p15 = parseInt(qtyPure15L, 10) || 0;
    const m05 = parseInt(qtyMix05L, 10) || 0;
    const m15 = parseInt(qtyMix15L, 10) || 0;

    if (p05 < 0 || p15 < 0 || m05 < 0 || m15 < 0) throw new ApiError(400, 'Quantities cannot be negative');
    if (p05 === 0 && p15 === 0 && m05 === 0 && m15 === 0) throw new ApiError(400, 'Must produce at least one bottle type');

    const parsedBatchDate = batchDate ? new Date(batchDate) : new Date();
    const finalBatchDate = isNaN(parsedBatchDate.getTime()) ? new Date() : parsedBatchDate;

    const batch = await prisma.wadaanaProductionBatch.create({
      data: {
        qtyPure05L: p05,
        qtyPure15L: p15,
        qtyMix05L: m05,
        qtyMix15L: m15,
        batchDate: finalBatchDate,
        notes: notes || null,
        producedBy: req.user?.id || 'Shift Operator',
        status: 'PENDING'
      }
    });
    return sendSuccess(res, batch, 201);
  }

  // 3. Legacy fallback for AquaSphere (direct column counts)
  const { packs05L = 0, packs15L = 0 } = req.body;
  const p05 = parseInt(packs05L, 10) || 0;
  const p15 = parseInt(packs15L, 10) || 0;
  const qty = parseInt(quantity, 10) || 0;

  if (p05 < 0 || p15 < 0 || qty < 0) throw new ApiError(400, 'Quantities cannot be negative');
  if (p05 === 0 && p15 === 0 && qty === 0) throw new ApiError(400, 'Must produce at least one pack or 19L bottle');

  const parsedBatchDate = batchDate ? new Date(batchDate) : new Date();
  const finalBatchDate = isNaN(parsedBatchDate.getTime()) ? new Date() : parsedBatchDate;

  const batch = await prisma.aquasphereProductionBatch.create({
    data: {
      quantity: qty,
      packs05L: p05,
      packs15L: p15,
      batchDate: finalBatchDate,
      notes: notes || null,
      producedBy: req.user?.id || 'Shift Operator',
      status: 'PENDING'
    }
  });
  return sendSuccess(res, batch, 201);
});

/** Completes a production batch run and updates inventory */
export const completeProductionBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prefix = getTenantPrefix(req);

  const batch = await prisma[`${prefix}ProductionBatch`].findUnique({ where: { id } });
  if (!batch) throw new ApiError(404, 'Batch not found');
  if (batch.status === 'COMPLETED') throw new ApiError(400, 'Batch is already completed');

  // Collect items produced in this batch
  const productionRuns = [];

  if (batch.outputItemId) {
    const waste = parseInt(req.body.wasteQuantity || req.body.brokenBottles || 0, 10);
    const qty = Number(batch.quantity || 0);
    if (waste < 0) throw new ApiError(400, 'Waste quantity cannot be negative');
    if (waste > qty) throw new ApiError(400, `Waste quantity (${waste}) cannot exceed produced amount (${qty})`);

    const outputItem = await prisma[`${prefix}Item`].findUnique({
      where: { id: batch.outputItemId },
      include: { recipeFinishedGoods: { include: { rawMaterial: true } } }
    });
    if (!outputItem) throw new ApiError(404, 'Finished good item not found');
    productionRuns.push({ outputItem, quantity: qty, wasteQuantity: waste });
  } else {
    // Parse items from remarks or legacy batch fields
    let remarksProducedItems = [];
    if (batch.remarks) {
      try {
        const parsed = JSON.parse(batch.remarks);
        if (Array.isArray(parsed.producedItems)) remarksProducedItems = parsed.producedItems;
      } catch (_e) { /* ignore */ }
    }

    if (remarksProducedItems.length > 0) {
      const { itemBreakages = {} } = req.body;
      const itemIds = remarksProducedItems.map(p => p.outputItemId || p.itemId).filter(Boolean);
      const items = await prisma[`${prefix}Item`].findMany({
        where: { id: { in: itemIds } },
        include: { recipeFinishedGoods: { include: { rawMaterial: true } } }
      });
      const itemMap = new Map(items.map(i => [i.id, i]));

      for (const p of remarksProducedItems) {
        const itemId = p.outputItemId || p.itemId;
        const fgItem = itemMap.get(itemId);
        if (!fgItem) continue;
        const qty = Number(p.quantity || 0);
        const waste = parseInt(itemBreakages[itemId] || 0, 10);
        if (waste < 0) throw new ApiError(400, `Waste for ${fgItem.name} cannot be negative`);
        if (waste > qty) throw new ApiError(400, `Waste for ${fgItem.name} (${waste}) cannot exceed produced amount (${qty})`);
        productionRuns.push({ outputItem: fgItem, quantity: qty, wasteQuantity: waste });
      }
    } else {
      // Legacy column fallback: locate matching finished goods
      const allFGs = await prisma[`${prefix}Item`].findMany({
        where: { type: 'FINISHED_GOOD', archivedAt: null },
        include: { recipeFinishedGoods: { include: { rawMaterial: true } } }
      });

      const findFg = (terms) => allFGs.find(i => terms.every(t => i.name.toLowerCase().includes(t.toLowerCase())));

      if (prefix === 'aquasphere') {
        const { brokenBottles05L = 0, brokenBottles15L = 0, wasteQuantity = 0 } = req.body;
        if (batch.packs05L > 0) {
          const fg = findFg(['0.5']);
          if (fg) productionRuns.push({ outputItem: fg, quantity: batch.packs05L, wasteQuantity: parseInt(brokenBottles05L, 10) || 0 });
        }
        if (batch.packs15L > 0) {
          const fg = findFg(['1.5']);
          if (fg) productionRuns.push({ outputItem: fg, quantity: batch.packs15L, wasteQuantity: parseInt(brokenBottles15L, 10) || 0 });
        }
        if (batch.quantity > 0) {
          const fg = findFg(['19l']);
          if (fg) productionRuns.push({ outputItem: fg, quantity: batch.quantity, wasteQuantity: parseInt(wasteQuantity, 10) || 0 });
        }
      } else {
        const { brokenPure05L = 0, brokenPure15L = 0, brokenMix05L = 0, brokenMix15L = 0 } = req.body;
        if (batch.qtyPure05L > 0) {
          const fg = findFg(['pure', '0.5']);
          if (fg) productionRuns.push({ outputItem: fg, quantity: batch.qtyPure05L, wasteQuantity: parseInt(brokenPure05L, 10) || 0 });
        }
        if (batch.qtyPure15L > 0) {
          const fg = findFg(['pure', '1.5']);
          if (fg) productionRuns.push({ outputItem: fg, quantity: batch.qtyPure15L, wasteQuantity: parseInt(brokenPure15L, 10) || 0 });
        }
        if (batch.qtyMix05L > 0) {
          const fg = findFg(['mix', '0.5']);
          if (fg) productionRuns.push({ outputItem: fg, quantity: batch.qtyMix05L, wasteQuantity: parseInt(brokenMix05L, 10) || 0 });
        }
        if (batch.qtyMix15L > 0) {
          const fg = findFg(['mix', '1.5']);
          if (fg) productionRuns.push({ outputItem: fg, quantity: batch.qtyMix15L, wasteQuantity: parseInt(brokenMix15L, 10) || 0 });
        }
      }
    }
  }

  if (productionRuns.length === 0) {
    throw new ApiError(400, 'No producible items found in this batch');
  }

  // Strict check: every finished good MUST have recipe lines configured in DB
  for (const run of productionRuns) {
    if (!run.outputItem.recipeFinishedGoods || run.outputItem.recipeFinishedGoods.length === 0) {
      throw new ApiError(400, `❌ Recipe missing in database for '${run.outputItem.name}'. Configure recipe in Bill of Materials first.`);
    }
  }

  const { deductions, finishedGoods } = calculateBatchDeductions(productionRuns);

  // Validate raw material stock
  const rawItemIds = deductions.map(d => d.itemId);
  const rawItems = await prisma[`${prefix}Item`].findMany({
    where: { id: { in: rawItemIds } }
  });
  const rawMap = new Map(rawItems.map(r => [r.id, r]));

  for (const d of deductions) {
    const raw = rawMap.get(d.itemId);
    const available = Number(raw?.cachedQty || 0);
    if (available < d.quantityUsed) {
      throw new ApiError(400, `❌ Insufficient stock for ${d.name} (Required: ${d.quantityUsed} ${d.unit}, Available: ${available})`);
    }
  }

  const totalWaste = productionRuns.reduce((sum, r) => sum + (r.wasteQuantity || 0), 0);

  const updatedBatch = await prisma.$transaction(async (tx) => {
    const pb = await tx[`${prefix}ProductionBatch`].update({
      where: { id },
      data: { status: 'COMPLETED', wasteQuantity: totalWaste },
      include: {
        outputItem: { select: { id: true, name: true, unit: true } },
        consumptions: { include: { item: true } }
      }
    });

    // Record raw material consumption & deduct stock
    if (deductions.length > 0) {
      await tx[`${prefix}ProductionBatchConsumption`].createMany({
        data: deductions.map(d => ({ batchId: pb.id, itemId: d.itemId, quantityUsed: d.quantityUsed }))
      });
      await tx[`${prefix}InventoryTransaction`].createMany({
        data: deductions.map(d => ({
          itemId: d.itemId,
          quantity: d.quantityUsed,
          direction: 'OUT',
          reason: 'PRODUCTION',
          refType: 'BATCH',
          refId: pb.id,
          location: 'FACTORY'
        }))
      });
      for (const d of deductions) {
        await tx[`${prefix}Item`].update({
          where: { id: d.itemId },
          data: {
            cachedQty: { decrement: d.quantityUsed },
            factoryQty: { decrement: d.quantityUsed }
          }
        });
      }
    }

    // Record finished goods addition & increment stock in base units
    if (finishedGoods.length > 0) {
      await tx[`${prefix}InventoryTransaction`].createMany({
        data: finishedGoods.map(fg => ({
          itemId: fg.itemId,
          quantity: fg.quantityAdded,
          direction: 'IN',
          reason: 'PRODUCTION',
          refType: 'BATCH',
          refId: pb.id,
          location: 'FACTORY'
        }))
      });
      for (const fg of finishedGoods) {
        await tx[`${prefix}Item`].update({
          where: { id: fg.itemId },
          data: {
            cachedQty: { increment: fg.quantityAdded },
            factoryQty: { increment: fg.quantityAdded }
          }
        });

        // 19L bottle custody tracking
        if (prefix === 'aquasphere' && fg.is19L) {
          if (fg.netGoodPacks > 0) {
            await tx.aquasphereBottleTransaction.create({
              data: {
                type: 'MOVED_TO_FACTORY',
                quantity: fg.netGoodPacks,
                reason: `Production Batch #${pb.id.substring(0, 8).toUpperCase()}`
              }
            });
          }
          if (fg.wastePacks > 0) {
            await tx.aquasphereBottleTransaction.create({
              data: {
                type: 'RETURNED_BROKEN',
                quantity: fg.wastePacks,
                reason: `Broken in Production Batch #${pb.id.substring(0, 8).toUpperCase()}`
              }
            });
          }
        }
      }
    }

    await createAuditLog(prefix, {
      action: 'PRODUCTION_BATCH_COMPLETED',
      entityType: 'PRODUCTION_BATCH',
      entityId: pb.id,
      performedBy: req.user?.id || 'Unknown',
      details: JSON.stringify({
        status: 'COMPLETED',
        produced: finishedGoods.map(f => `${f.name}: +${f.quantityAdded} (${f.unit})`),
        consumed: deductions.map(d => `${d.name}: -${d.quantityUsed} (${d.unit})`),
        wasteQuantity: totalWaste
      })
    });

    return pb;
  }, { maxWait: 10000, timeout: 30000 });

  broadcastEvent(prefix, 'PRODUCTION_UPDATED', { batchId: updatedBatch.id });
  broadcastEvent(prefix, 'INVENTORY_CHANGED');
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

  broadcastEvent(prefix, 'PRODUCTION_UPDATED', { batchId: id });
  broadcastEvent(prefix, 'INVENTORY_CHANGED');
  return sendSuccess(res, null, 200, { message: 'Production batch deleted successfully' });
});
