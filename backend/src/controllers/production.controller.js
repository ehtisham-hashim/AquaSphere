import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateProductionBatch, calculateDynamicBatch } from '../utils/productionFormulas.js';
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
      return {
        itemId: prod.outputItemId,
        name: fg?.name || 'Finished Good',
        unit: fg?.unit || 'units',
        quantity: prod.quantity
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

    broadcastEvent(prefix, 'PRODUCTION_UPDATED', { batchId: updatedBatch.id });
    broadcastEvent(prefix, 'INVENTORY_CHANGED');
    return sendSuccess(res, updatedBatch);
  }

  // Parse produced items if stored in remarks
  let remarksProducedItems = [];
  if (batch.remarks) {
    try {
      const parsed = JSON.parse(batch.remarks);
      if (Array.isArray(parsed.producedItems)) {
        remarksProducedItems = parsed.producedItems;
      }
    } catch (_err) {
      // Ignore invalid JSON in remarks
    }
  }

  const { itemBreakages = {} } = req.body;

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
    // Universal dynamic recipe deduction for Wadaana batches
    let producedList = [];
    if (remarksProducedItems.length > 0) {
      producedList = remarksProducedItems.map(p => ({
        itemId: p.itemId || p.outputItemId,
        name: p.name,
        quantity: Number(p.quantity || 0)
      }));
    } else if (batch.outputItemId && batch.quantity > 0) {
      const fg = allItems.find(i => i.id === batch.outputItemId);
      producedList = [{
        itemId: batch.outputItemId,
        name: fg?.name || 'Finished Good',
        quantity: Number(batch.quantity)
      }];
    } else {
      // Legacy column fallback
      const colMappings = [
        { key: 'qtyPure05L', name: 'pure', vol: ['0.5', '500'], brokenKey: 'brokenPure05L' },
        { key: 'qtyPure15L', name: 'pure', vol: ['1.5', '1500'], brokenKey: 'brokenPure15L' },
        { key: 'qtyMix05L', name: 'mix', vol: ['0.5', '500'], brokenKey: 'brokenMix05L' },
        { key: 'qtyMix15L', name: 'mix', vol: ['1.5', '1500'], brokenKey: 'brokenMix15L' }
      ];
      for (const cm of colMappings) {
        const q = batch[cm.key] || 0;
        if (q > 0) {
          const fg = allItems.find(i => i.type === 'FINISHED_GOOD' && i.name.toLowerCase().includes(cm.name) && cm.vol.some(v => i.name.toLowerCase().includes(v)));
          if (fg) {
            producedList.push({ itemId: fg.id, name: fg.name, quantity: q, legacyKey: cm.brokenKey });
          }
        }
      }
    }

    const fgIds = producedList.map(p => p.itemId).filter(Boolean);
    const recipes = await prisma.wadaanaRecipeItem.findMany({
      where: { finishedGoodId: { in: fgIds } },
      include: { rawMaterial: true }
    });

    const deductionsMap = new Map();
    const finishedGoodsToAdd = [];
    let totalWaste = 0;

    for (const prod of producedList) {
      const fgItem = allItems.find(i => i.id === prod.itemId);
      const prodQty = prod.quantity;
      
      let breakage = 0;
      if (itemBreakages[prod.itemId] !== undefined) {
        breakage = parseInt(itemBreakages[prod.itemId], 10) || 0;
      } else if (prod.legacyKey && req.body[prod.legacyKey] !== undefined) {
        breakage = parseInt(req.body[prod.legacyKey], 10) || 0;
      }
      
      if (breakage < 0) throw new ApiError(400, `Breakage for ${prod.name} cannot be negative`);
      if (breakage > prodQty) throw new ApiError(400, `Breakage for ${prod.name} (${breakage}) cannot exceed produced amount (${prodQty})`);
      totalWaste += breakage;

      const netGood = Math.max(0, prodQty - breakage);
      if (netGood > 0 && fgItem) {
        finishedGoodsToAdd.push({
          itemId: fgItem.id,
          name: fgItem.name,
          quantityAdded: netGood,
          unit: fgItem.unit || 'pcs'
        });
      }

      // Check explicit database recipes
      const itemRecipes = recipes.filter(r => r.finishedGoodId === prod.itemId);
      if (itemRecipes.length > 0) {
        for (const r of itemRecipes) {
          const rmItem = r.rawMaterial || allItems.find(i => i.id === r.rawMaterialId);
          if (!rmItem) continue;
          const qtyUsed = Number(r.quantityPerUnit) * prodQty;
          const current = deductionsMap.get(rmItem.id) || { itemId: rmItem.id, name: rmItem.name, quantityUsed: 0, unit: rmItem.unit || 'kg' };
          current.quantityUsed += qtyUsed;
          deductionsMap.set(rmItem.id, current);
        }
      } else {
        // Fallback for known Wadaana standard bottle weights if recipe not configured
        const nLower = (prod.name || '').toLowerCase();
        let fallbackWeight = 0;
        let prefKeyword = '';
        let volKeyword = [];

        if (nLower.includes('pure') && (nLower.includes('0.5') || nLower.includes('500'))) {
          fallbackWeight = 0.015; prefKeyword = 'pure'; volKeyword = ['0.5', '500'];
        } else if (nLower.includes('pure') && (nLower.includes('1.5') || nLower.includes('1500'))) {
          fallbackWeight = 0.030; prefKeyword = 'pure'; volKeyword = ['1.5', '1500'];
        } else if (nLower.includes('mix') && (nLower.includes('0.5') || nLower.includes('500'))) {
          fallbackWeight = 0.013; prefKeyword = 'mix'; volKeyword = ['0.5', '500'];
        } else if (nLower.includes('mix') && (nLower.includes('1.5') || nLower.includes('1500'))) {
          fallbackWeight = 0.027; prefKeyword = 'mix'; volKeyword = ['1.5', '1500'];
        }

        if (fallbackWeight > 0) {
          const rmItem = allItems.find(i => i.type === 'RAW_MATERIAL' && i.name.toLowerCase().includes(prefKeyword) && volKeyword.some(v => i.name.toLowerCase().includes(v)));
          if (rmItem) {
            const qtyUsed = fallbackWeight * prodQty;
            const current = deductionsMap.get(rmItem.id) || { itemId: rmItem.id, name: rmItem.name, quantityUsed: 0, unit: rmItem.unit || 'kg' };
            current.quantityUsed += qtyUsed;
            deductionsMap.set(rmItem.id, current);
          }
        }
      }
    }

    const deductions = Array.from(deductionsMap.values());

    // Validate Raw Material Stock
    for (const d of deductions) {
      const item = allItems.find(i => i.id === d.itemId);
      const availableQty = item ? Number(item.cachedQty || 0) : 0;
      if (availableQty < d.quantityUsed) {
        throw new ApiError(400, `❌ Insufficient stock for ${item?.name || 'raw material'} (Required: ${d.quantityUsed} ${item?.unit || ''}, Available: ${availableQty})`);
      }
    }

    const updatedBatch = await prisma.$transaction(async (tx) => {
      const pb = await tx.wadaanaProductionBatch.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          brokenPure05L: parseInt(req.body.brokenPure05L || 0, 10),
          brokenPure15L: parseInt(req.body.brokenPure15L || 0, 10),
          brokenMix05L: parseInt(req.body.brokenMix05L || 0, 10),
          brokenMix15L: parseInt(req.body.brokenMix15L || 0, 10),
          wasteQuantity: totalWaste
        }
      });

      // Update Wadaana finished goods stock (both cachedQty and factoryQty)
      for (const fg of finishedGoodsToAdd) {
        await tx.wadaanaInventoryTransaction.create({
          data: {
            itemId: fg.itemId,
            quantity: fg.quantityAdded,
            direction: 'IN',
            reason: 'PRODUCTION',
            refType: 'BATCH',
            refId: pb.id,
            location: 'FACTORY'
          }
        });
        await tx.wadaanaItem.update({
          where: { id: fg.itemId },
          data: {
            cachedQty: { increment: fg.quantityAdded },
            factoryQty: { increment: fg.quantityAdded }
          }
        });
      }

      // Deduct Wadaana raw materials (both cachedQty and factoryQty)
      for (const d of deductions) {
        await tx.wadaanaProductionBatchConsumption.create({
          data: {
            batchId: pb.id,
            itemId: d.itemId,
            quantityUsed: d.quantityUsed
          }
        });
        await tx.wadaanaInventoryTransaction.create({
          data: {
            itemId: d.itemId,
            quantity: d.quantityUsed,
            direction: 'OUT',
            reason: 'PRODUCTION',
            refType: 'BATCH',
            refId: pb.id,
            location: 'FACTORY'
          }
        });
        await tx.wadaanaItem.update({
          where: { id: d.itemId },
          data: {
            cachedQty: { decrement: d.quantityUsed },
            factoryQty: { decrement: d.quantityUsed }
          }
        });
      }

      await createAuditLog('wadaana', {
        action: 'PRODUCTION_BATCH_COMPLETED',
        entityType: 'PRODUCTION_BATCH',
        entityId: pb.id,
        performedBy: req.user?.id || 'Unknown',
        details: JSON.stringify({
          status: 'COMPLETED',
          producedGoods: finishedGoodsToAdd.map(f => `${f.name}: +${f.quantityAdded}`),
          deductedMaterials: deductions.map(d => `${d.name}: -${d.quantityUsed.toFixed(3)} ${d.unit}`),
          wasteQuantity: totalWaste
        })
      });

      return pb;
    }, { maxWait: 10000, timeout: 30000 });

    broadcastEvent(prefix, 'PRODUCTION_UPDATED', { batchId: updatedBatch.id });
    broadcastEvent(prefix, 'INVENTORY_CHANGED');
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

  // Detect any custom finished goods in AquaSphere unified batch
  const isStandardAquasphereItem = (name = '') => {
    const n = name.toLowerCase();
    const is19L = n.includes('19l') || n.includes('19 l');
    const is15LPet = (n.includes('1.5') && n.includes('pet')) && !n.includes('pure') && !n.includes('mix');
    const is05LPet = (n.includes('0.5') && n.includes('pet')) && !n.includes('pure') && !n.includes('mix');
    return is19L || is15LPet || is05LPet;
  };
  const customAquasphereItems = remarksProducedItems.filter(p => !isStandardAquasphereItem(p.name));

  const customDeductions = [];
  const customFinishedGoods = [];
  let customWasteTotal = 0;

  if (customAquasphereItems.length > 0) {
    const customItemIds = customAquasphereItems.map(c => c.itemId);
    const recipes = await prisma.aquasphereRecipeItem.findMany({
      where: { finishedGoodId: { in: customItemIds } },
      include: { rawMaterial: true }
    });

    for (const c of customAquasphereItems) {
      const fgItem = allItems.find(i => i.id === c.itemId);
      const prodQty = Number(c.quantity || 0);
      const breakage = parseInt(itemBreakages[c.itemId] || 0, 10);
      if (breakage < 0) throw new ApiError(400, `Waste for ${c.name} cannot be negative`);
      if (breakage > prodQty) throw new ApiError(400, `Waste for ${c.name} (${breakage}) cannot exceed produced amount (${prodQty})`);
      customWasteTotal += breakage;

      const netGood = Math.max(0, prodQty - breakage);
      if (netGood > 0 && fgItem) {
        customFinishedGoods.push({
          itemId: fgItem.id,
          name: fgItem.name,
          quantityAdded: netGood,
          unit: fgItem.unit || 'packs'
        });
      }

      const itemRecipes = recipes.filter(r => r.finishedGoodId === c.itemId);
      for (const r of itemRecipes) {
        const rawItem = r.rawMaterial || allItems.find(i => i.id === r.rawMaterialId);
        if (!rawItem) continue;
        const qtyUsed = Number(r.quantityPerUnit) * prodQty;
        customDeductions.push({
          itemId: rawItem.id,
          name: rawItem.name,
          quantityUsed: qtyUsed,
          unit: rawItem.unit || 'pcs'
        });
      }
    }
  }

  // Validate combined raw material requirements
  const totalStockRequirements = new Map();
  for (const d of deductions) {
    const current = totalStockRequirements.get(d.itemId) || 0;
    totalStockRequirements.set(d.itemId, current + Number(d.quantityUsed));
  }
  for (const d of customDeductions) {
    const current = totalStockRequirements.get(d.itemId) || 0;
    totalStockRequirements.set(d.itemId, current + Number(d.quantityUsed));
  }

  for (const [itemId, requiredQty] of totalStockRequirements.entries()) {
    const item = allItems.find(i => i.id === itemId);
    const availableQty = item ? Number(item.cachedQty || 0) : 0;
    if (availableQty < requiredQty) {
      throw new ApiError(400, `❌ Insufficient stock for ${item?.name || 'raw material'} (Required: ${requiredQty} ${item?.unit || ''}, Available: ${availableQty})`);
    }
  }

  const updatedBatch = await prisma.$transaction(async (tx) => {
    const pb = await tx.aquasphereProductionBatch.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        brokenBottles05L: br05,
        brokenBottles15L: br15,
        wasteQuantity: waste + customWasteTotal
      }
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

    const allDeductions = [...deductions, ...customDeductions];
    if (allDeductions.length > 0) {
      await tx.aquasphereProductionBatchConsumption.createMany({
        data: allDeductions.map(d => ({ batchId: pb.id, itemId: d.itemId, quantityUsed: d.quantityUsed }))
      });
      await tx.aquasphereInventoryTransaction.createMany({
        data: allDeductions.map(d => ({ itemId: d.itemId, quantity: d.quantityUsed, direction: 'OUT', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id, location: 'FACTORY' }))
      });
      for (const d of allDeductions) {
        await tx.aquasphereItem.update({
          where: { id: d.itemId },
          data: {
            cachedQty: { decrement: d.quantityUsed },
            factoryQty: { decrement: d.quantityUsed }
          }
        });
      }
    }

    const allFinishedGoods = [...finishedGoods, ...customFinishedGoods];
    if (allFinishedGoods.length > 0) {
      await tx.aquasphereInventoryTransaction.createMany({
        data: allFinishedGoods.map(fg => ({ itemId: fg.itemId, quantity: fg.quantityAdded, direction: 'IN', reason: 'PRODUCTION', refType: 'BATCH', refId: pb.id, location: 'FACTORY' }))
      });
      for (const fg of allFinishedGoods) {
        await tx.aquasphereItem.update({
          where: { id: fg.itemId },
          data: { cachedQty: { increment: fg.quantityAdded }, factoryQty: { increment: fg.quantityAdded } }
        });
      }
    }

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
